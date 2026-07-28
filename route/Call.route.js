import { Router } from "express";
import { getIceServersController } from "../controller/Call.controller.js";
import auth from "../middlewares/auth.js";

const callRouter = Router();

callRouter.get("/ice-servers", auth, getIceServersController);

export default callRouter;
