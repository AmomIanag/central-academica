import { Router } from "express";
import { requireAuth } from "../../middlewares/require-auth";
import { show } from "./dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get("/dashboard", show);
