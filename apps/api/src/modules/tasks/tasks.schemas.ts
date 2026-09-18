import { z } from "zod";
import { isCivilDate, isValidTimeZone } from "../../lib/timezone";

export const taskIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const civilDateSchema = z.string().refine(isCivilDate, {
  message: "Invalid calendar date (YYYY-MM-DD).",
});

const dueValueSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("date"),
      date: civilDateSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("datetime"),
      at: z.string().datetime({ offset: true }),
    })
    .strict(),
]);

export const dueSchema = z.union([z.null(), dueValueSchema]);

const prioritySchema = z.enum(["low", "normal", "high"]);

function normalizeDescription(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const descriptionSchema = z
  .union([z.string().max(4000), z.null()])
  .optional()
  .transform(normalizeDescription)
  .refine((value) => value === undefined || value === null || value.length <= 4000, {
    message: "Description must have at most 4000 characters.",
  });

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: descriptionSchema,
    priority: prioritySchema.optional().default("normal"),
    disciplineId: z.string().uuid().nullable().optional(),
    due: dueSchema.optional().default(null),
  })
  .strict();

export const patchTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: descriptionSchema,
    priority: prioritySchema.optional(),
    disciplineId: z.string().uuid().nullable().optional(),
    due: dueSchema.optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one field is required.",
  });

export const listTasksQuerySchema = z
  .object({
    status: z.enum(["pending", "completed"]).optional(),
    priority: prioritySchema.optional(),
    disciplineId: z.string().uuid().optional(),
    from: civilDateSchema.optional(),
    to: civilDateSchema.optional(),
    timeZone: z.string().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((value, ctx) => {
    if ((value.from !== undefined || value.to !== undefined) && !value.timeZone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "timeZone is required when from or to is provided.",
        path: ["timeZone"],
      });
    }

    if (value.timeZone && !isValidTimeZone(value.timeZone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid IANA time zone.",
        path: ["timeZone"],
      });
    }

    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "from must be on or before to.",
        path: ["from"],
      });
    }
  });

export const summaryQuerySchema = z
  .object({
    timeZone: z.string().min(1).max(100).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.timeZone && !isValidTimeZone(value.timeZone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid IANA time zone.",
        path: ["timeZone"],
      });
    }
  });

export const taskQuerySchema = z
  .object({
    timeZone: z.string().min(1).max(100).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.timeZone && !isValidTimeZone(value.timeZone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid IANA time zone.",
        path: ["timeZone"],
      });
    }
  });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type PatchTaskInput = z.infer<typeof patchTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type TaskDue = z.infer<typeof dueSchema>;
