import type { Request, Response } from "express";
import { sendData, sendError } from "../../http/response";
import { getDashboard } from "./dashboard.service";

export async function show(req: Request, res: Response): Promise<void> {
  const dashboard = await getDashboard(req.session.userId as string);

  if (!dashboard) {
    sendError(res, 401, "UNAUTHENTICATED", "Authentication required.");
    return;
  }

  sendData(res, dashboard);
}
