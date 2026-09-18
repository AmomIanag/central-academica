import { Router } from "express";
import { requireAuth } from "../../middlewares/require-auth";
import {
  complete,
  create,
  destroy,
  list,
  options,
  reopen,
  show,
  summary,
  update,
} from "./tasks.controller";

export const tasksRouter = Router();

tasksRouter.use(requireAuth);
tasksRouter.get("/tasks", list);
tasksRouter.post("/tasks", create);
tasksRouter.get("/tasks/summary", summary);
tasksRouter.get("/tasks/options", options);
tasksRouter.get("/tasks/:id", show);
tasksRouter.patch("/tasks/:id", update);
tasksRouter.post("/tasks/:id/complete", complete);
tasksRouter.post("/tasks/:id/reopen", reopen);
tasksRouter.delete("/tasks/:id", destroy);
