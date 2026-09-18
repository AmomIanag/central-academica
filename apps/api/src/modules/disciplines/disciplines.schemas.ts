import { z } from "zod";

const nameSchema = z.string().trim().min(1).max(160);
const professorNameSchema = z.string().trim().min(1).max(120);
const scoreSchema = z.number().finite().gte(0).lte(100);

export const disciplineIdParamsSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export const createDisciplineSchema = z
  .object({
    name: nameSchema,
    professorName: professorNameSchema,
  })
  .strict();

export const patchDisciplineSchema = z
  .object({
    name: nameSchema.optional(),
    professorName: professorNameSchema.optional(),
  })
  .strict()
  .refine((value) => value.name !== undefined || value.professorName !== undefined, {
    message: "At least one field is required.",
  });

export const patchGradeSchema = z
  .object({
    semester: z.union([z.literal(1), z.literal(2)]),
    kind: z.enum(["CP", "GS"]),
    score: scoreSchema.nullable(),
  })
  .strict();

export const patchAttendanceSchema = z
  .object({
    totalClasses: z.number().int().gte(0),
    absences: z.number().int().gte(0),
  })
  .strict()
  .refine((value) => value.absences <= value.totalClasses, {
    message: "Absences cannot exceed total classes.",
    path: ["absences"],
  });

export type CreateDisciplineInput = z.infer<typeof createDisciplineSchema>;
export type PatchDisciplineInput = z.infer<typeof patchDisciplineSchema>;
export type PatchGradeInput = z.infer<typeof patchGradeSchema>;
export type PatchAttendanceInput = z.infer<typeof patchAttendanceSchema>;
