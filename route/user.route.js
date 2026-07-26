import { Router } from "express";
import {
  loginUserController,
  registerUserController,
  searchUserController,
  updateUserController,
  verifyEmailController,
} from "../controller/user.controller.js";
import { logoutController, userDetailsController, forgotPasswordController, verifyforgotPasswordOtp, resetPassword, refreshToken } from "../controller/user.controller.js";
import auth from "../middlewares/auth.js";

const userRouter = Router();

userRouter.post("/register", registerUserController);
userRouter.post("/verifyEmail", verifyEmailController);
userRouter.post("/login", loginUserController);
userRouter.get("/logout", auth, logoutController);
userRouter.get("/user-details", auth, userDetailsController);
userRouter.put("/update", auth, updateUserController);
userRouter.post("/forgot-password", forgotPasswordController);
userRouter.post("/verify-forgot-password-otp", verifyforgotPasswordOtp);
userRouter.post("/reset-password", resetPassword);
userRouter.post("/refresh-token", refreshToken);
userRouter.get("/search", auth, searchUserController);

export default userRouter;
