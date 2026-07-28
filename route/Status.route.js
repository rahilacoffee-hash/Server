import { Router } from "express";
import auth from "../middlewares/auth.js";
import {
  createStatusController,
  deleteStatusController,
  getMyStatusesController,
  getStatusesController,
  markStatusViewedController,
  replyToStatusController,
} from "../controller/Status.controller.js";

const statusRouter = Router();

statusRouter.get("/", auth, getStatusesController);
statusRouter.get("/mine", auth, getMyStatusesController);
statusRouter.post("/", auth, createStatusController);
statusRouter.patch("/:statusId/view", auth, markStatusViewedController);
statusRouter.post("/:statusId/reply", auth, replyToStatusController);
statusRouter.delete("/:statusId", auth, deleteStatusController);

export default statusRouter;
