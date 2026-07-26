import { Router } from "express";
import { loginUserController, registerUserController, verifyEmailController } from "../controllers/user.controller.js";

const authRouter = Router();

// REGISTER
authRouter.post("/register", registerUserController);
authRouter.post("/verify-email", verifyEmailController);

// LOGIN
authRouter.post("/login", loginUserController);

export default authRouter;