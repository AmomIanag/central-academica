import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { pool } from "./db/pool";
import { AppError } from "./http/app-error";
import { sendError } from "./http/response";
import { requireTrustedOrigin } from "./middlewares/require-origin";
import { authRouter } from "./modules/auth/routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { disciplinesRouter } from "./modules/disciplines/disciplines.routes";
import { tasksRouter } from "./modules/tasks/tasks.routes";
import { sessionMiddleware } from "./modules/auth/session";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use(requireTrustedOrigin);
app.use(sessionMiddleware);

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({
      status: "ok",
      database: "reachable",
    });
  } catch {
    res.status(503).json({
      status: "error",
      database: "unreachable",
    });
  }
});

app.use("/auth", authRouter);
app.use("/me", dashboardRouter);
app.use("/me", disciplinesRouter);
app.use("/me", tasksRouter);

app.use((_req, res) => {
  sendError(res, 404, "NOT_FOUND", "Route not found.");
});

app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof SyntaxError) {
    sendError(res, 400, "VALIDATION_ERROR", "Invalid JSON body.");
    return;
  }

  if (error instanceof AppError) {
    sendError(res, error.status, error.code, error.message, error.details);
    return;
  }

  console.error(error);
  sendError(res, 500, "INTERNAL_ERROR", "Internal server error.");
});
