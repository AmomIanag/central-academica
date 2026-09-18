import type { Request, Response } from "express";
import { sendData, sendError } from "../../http/response";
import {
  completeTask,
  createTask,
  getTask,
  getTaskOptions,
  getTaskSummary,
  listTasks,
  patchTask,
  removeTask,
  reopenTask,
} from "./tasks.service";
import {
  createTaskSchema,
  listTasksQuerySchema,
  patchTaskSchema,
  summaryQuerySchema,
  taskIdParamsSchema,
  taskQuerySchema,
} from "./tasks.schemas";

function userIdOf(req: Request): string {
  return req.session.userId as string;
}

function sendValidation(res: Response, details: unknown): void {
  sendError(res, 400, "VALIDATION_ERROR", "Invalid request.", details);
}

export async function list(req: Request, res: Response): Promise<void> {
  const parsed = listTasksQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    sendValidation(res, parsed.error.flatten().fieldErrors);
    return;
  }

  const data = await listTasks(userIdOf(req), parsed.data);
  sendData(res, data);
}

export async function create(req: Request, res: Response): Promise<void> {
  const parsed = createTaskSchema.safeParse(req.body);

  if (!parsed.success) {
    sendValidation(res, parsed.error.flatten().fieldErrors);
    return;
  }

  const data = await createTask(userIdOf(req), parsed.data);
  sendData(res, data, 201);
}

export async function summary(req: Request, res: Response): Promise<void> {
  const parsed = summaryQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    sendValidation(res, parsed.error.flatten().fieldErrors);
    return;
  }

  const data = await getTaskSummary(userIdOf(req), parsed.data.timeZone);
  sendData(res, data);
}

export async function options(req: Request, res: Response): Promise<void> {
  const data = await getTaskOptions(userIdOf(req));
  sendData(res, data);
}

export async function show(req: Request, res: Response): Promise<void> {
  const params = taskIdParamsSchema.safeParse(req.params);
  const query = taskQuerySchema.safeParse(req.query);

  if (!params.success) {
    sendValidation(res, params.error.flatten().fieldErrors);
    return;
  }

  if (!query.success) {
    sendValidation(res, query.error.flatten().fieldErrors);
    return;
  }

  const data = await getTask(userIdOf(req), params.data.id, query.data.timeZone);
  sendData(res, data);
}

export async function update(req: Request, res: Response): Promise<void> {
  const params = taskIdParamsSchema.safeParse(req.params);
  const body = patchTaskSchema.safeParse(req.body);

  if (!params.success) {
    sendValidation(res, params.error.flatten().fieldErrors);
    return;
  }

  if (!body.success) {
    sendValidation(res, body.error.flatten().fieldErrors);
    return;
  }

  const data = await patchTask(userIdOf(req), params.data.id, body.data);
  sendData(res, data);
}

export async function complete(req: Request, res: Response): Promise<void> {
  const parsed = taskIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    sendValidation(res, parsed.error.flatten().fieldErrors);
    return;
  }

  const data = await completeTask(userIdOf(req), parsed.data.id);
  sendData(res, data);
}

export async function reopen(req: Request, res: Response): Promise<void> {
  const parsed = taskIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    sendValidation(res, parsed.error.flatten().fieldErrors);
    return;
  }

  const data = await reopenTask(userIdOf(req), parsed.data.id);
  sendData(res, data);
}

export async function destroy(req: Request, res: Response): Promise<void> {
  const parsed = taskIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    sendValidation(res, parsed.error.flatten().fieldErrors);
    return;
  }

  await removeTask(userIdOf(req), parsed.data.id);
  sendData(res, { deleted: true });
}
