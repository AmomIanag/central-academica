import cors from "cors";
import express from "express";
import { pool } from "./db/pool";
import { env } from "./config/env";

export const app = express();

app.use(
  cors({
    origin: env.corsOrigin,
  }),
);

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
