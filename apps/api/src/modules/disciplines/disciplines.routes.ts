import { Router } from "express";
import { requireAuth } from "../../middlewares/require-auth";
import { getById, list } from "./disciplines.controller";

export const disciplinesRouter = Router();

disciplinesRouter.use(requireAuth);
disciplinesRouter.get("/disciplines", list);
disciplinesRouter.get("/disciplines/:id", getById);
