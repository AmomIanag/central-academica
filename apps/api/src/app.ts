import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { pool } from "./db/pool";
import { sendError } from "./http/response";
import { authRouter } from "./modules/auth/routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { disciplinesRouter } from "./modules/disciplines/disciplines.routes";
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

app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  console.error(error);
  sendError(res, 500, "INTERNAL_ERROR", "Internal server error.");
});
