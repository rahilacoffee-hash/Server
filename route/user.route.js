import { Router } from "express";
import {
  loginUserController,
  registerUserController,
  registerAdminController,
  searchUserController,
  getPublicUserController,
  updateUserController,
  verifyEmailController,
} from "../controller/user.controller.js";
import { logoutController, userDetailsController, myConnectionsController, followUserController, unfollowUserController, forgotPasswordController, verifyforgotPasswordOtp, resetPassword, refreshToken } from "../controller/user.controller.js";
import auth from "../middlewares/auth.js";

const userRouter = Router();

userRouter.post("/register", registerUserController);
userRouter.post("/register-admin", registerAdminController);
userRouter.post("/verifyEmail", verifyEmailController);
userRouter.post("/login", loginUserController);
userRouter.get("/logout", auth, logoutController);
userRouter.get("/user-details", auth, userDetailsController);
userRouter.get("/connections", auth, myConnectionsController);
userRouter.post("/:userId/follow", auth, followUserController);
userRouter.delete("/:userId/follow", auth, unfollowUserController);
userRouter.put("/update", auth, updateUserController);
userRouter.post("/forgot-password", forgotPasswordController);
userRouter.post("/verify-forgot-password-otp", verifyforgotPasswordOtp);
userRouter.post("/reset-password", resetPassword);
userRouter.post("/refresh-token", refreshToken);
userRouter.get("/search", auth, searchUserController);
userRouter.get("/:userId", auth, getPublicUserController);

export default userRouter;
