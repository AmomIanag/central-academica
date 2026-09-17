import { z } from "zod";

export const disciplineIdParamsSchema = z.object({
  id: z.string().uuid(),
});
