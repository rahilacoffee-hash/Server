import { Router } from "express";
import auth from "../middlewares/auth.js";
import {
  createStatusController,
  deleteStatusController,
  getMyStatusesController,
  getStatusesController,
  markStatusViewedController,
} from "../controller/Status.controller.js";

const statusRouter = Router();

statusRouter.get("/", auth, getStatusesController);
statusRouter.get("/mine", auth, getMyStatusesController);
statusRouter.post("/", auth, createStatusController);
statusRouter.patch("/:statusId/view", auth, markStatusViewedController);
statusRouter.delete("/:statusId", auth, deleteStatusController);

export default statusRouter;
