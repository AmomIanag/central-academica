import { Router } from "express";
import { requireAuth } from "../../middlewares/require-auth";
import {
  create,
  destroy,
  getById,
  list,
  update,
  updateAttendance,
  updateGrade,
} from "./disciplines.controller";

export const disciplinesRouter = Router();

disciplinesRouter.use(requireAuth);
disciplinesRouter.get("/disciplines", list);
disciplinesRouter.post("/disciplines", create);
disciplinesRouter.get("/disciplines/:id", getById);
disciplinesRouter.patch("/disciplines/:id", update);
disciplinesRouter.patch("/disciplines/:id/grades", updateGrade);
disciplinesRouter.patch("/disciplines/:id/attendance", updateAttendance);
disciplinesRouter.delete("/disciplines/:id", destroy);
