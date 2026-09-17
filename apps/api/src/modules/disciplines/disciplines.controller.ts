import type { Request, Response } from "express";
import { sendData, sendError } from "../../http/response";
import { getDiscipline, listDisciplines } from "./disciplines.service";
import { disciplineIdParamsSchema } from "./disciplines.schemas";

export async function list(req: Request, res: Response): Promise<void> {
  const data = await listDisciplines(req.session.userId as string);
  sendData(res, data);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const parsed = disciplineIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid request params.",
      parsed.error.flatten().fieldErrors,
    );
    return;
  }

  const discipline = await getDiscipline(req.session.userId as string, parsed.data.id);

  if (!discipline) {
    sendError(res, 404, "NOT_FOUND", "Discipline not found.");
    return;
  }

  sendData(res, discipline);
}
