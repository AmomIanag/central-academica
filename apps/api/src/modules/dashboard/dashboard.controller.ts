import type { Request, Response } from "express";
import { sendData, sendError } from "../../http/response";
import { PERF_OP, timePerf } from "../../lib/perf";
import { getDashboard } from "./dashboard.service";

export async function show(req: Request, res: Response): Promise<void> {
  const dashboard = await timePerf(PERF_OP.dashboardHandler, () =>
    getDashboard(req.session.userId as string),
  );

  if (!dashboard) {
    sendError(res, 401, "UNAUTHENTICATED", "Authentication required.");
    return;
  }

  sendData(res, dashboard);
}
