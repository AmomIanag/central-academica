import type { Request, Response } from "express";
import { sendData, sendError } from "../../http/response";
import {
  createDiscipline,
  getDiscipline,
  listDisciplines,
  patchDiscipline,
  patchDisciplineAttendance,
  patchDisciplineGrade,
  removeDiscipline,
} from "./disciplines.service";
import {
  createDisciplineSchema,
  disciplineIdParamsSchema,
  patchAttendanceSchema,
  patchDisciplineSchema,
  patchGradeSchema,
} from "./disciplines.schemas";

function userIdOf(req: Request): string {
  return req.session.userId as string;
}

function sendValidation(res: Response, details: unknown): void {
  sendError(res, 400, "VALIDATION_ERROR", "Invalid request.", details);
}

export async function list(req: Request, res: Response): Promise<void> {
  const data = await listDisciplines(userIdOf(req));
  sendData(res, data);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const parsed = disciplineIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    sendValidation(res, parsed.error.flatten().fieldErrors);
    return;
  }

  const discipline = await getDiscipline(userIdOf(req), parsed.data.id);

  if (!discipline) {
    sendError(res, 404, "NOT_FOUND", "Discipline not found.");
    return;
  }

  sendData(res, discipline);
}

export async function create(req: Request, res: Response): Promise<void> {
  const parsed = createDisciplineSchema.safeParse(req.body);

  if (!parsed.success) {
    sendValidation(res, parsed.error.flatten().fieldErrors);
    return;
  }

  const data = await createDiscipline(userIdOf(req), parsed.data);
  sendData(res, data, 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const params = disciplineIdParamsSchema.safeParse(req.params);
  const body = patchDisciplineSchema.safeParse(req.body);

  if (!params.success) {
    sendValidation(res, params.error.flatten().fieldErrors);
    return;
  }

  if (!body.success) {
    sendValidation(res, body.error.flatten().fieldErrors);
    return;
  }

  const data = await patchDiscipline(userIdOf(req), params.data.id, body.data);
  sendData(res, data);
}

export async function updateGrade(req: Request, res: Response): Promise<void> {
  const params = disciplineIdParamsSchema.safeParse(req.params);
  const body = patchGradeSchema.safeParse(req.body);

  if (!params.success) {
    sendValidation(res, params.error.flatten().fieldErrors);
    return;
  }

  if (!body.success) {
    sendValidation(res, body.error.flatten().fieldErrors);
    return;
  }

  const data = await patchDisciplineGrade(userIdOf(req), params.data.id, body.data);
  sendData(res, data);
}

export async function updateAttendance(req: Request, res: Response): Promise<void> {
  const params = disciplineIdParamsSchema.safeParse(req.params);
  const body = patchAttendanceSchema.safeParse(req.body);

  if (!params.success) {
    sendValidation(res, params.error.flatten().fieldErrors);
    return;
  }

  if (!body.success) {
    sendValidation(res, body.error.flatten().fieldErrors);
    return;
  }

  const data = await patchDisciplineAttendance(userIdOf(req), params.data.id, body.data);
  sendData(res, data);
}

export async function destroy(req: Request, res: Response): Promise<void> {
  const parsed = disciplineIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    sendValidation(res, parsed.error.flatten().fieldErrors);
    return;
  }

  const data = await removeDiscipline(userIdOf(req), parsed.data.id);
  sendData(res, data);
}
