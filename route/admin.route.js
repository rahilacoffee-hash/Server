import { Router } from "express";
import auth from "../middlewares/auth.js";
import requireAdmin from "../middlewares/requireAdmin.js";
import { deleteAdminPost, getAdminOverview, getAdminPosts, getAdminUsers, updateUserStatus, updateUserVerification } from "../controller/admin.controller.js";

const adminRouter = Router();
adminRouter.use(auth, requireAdmin);
adminRouter.get("/overview", getAdminOverview);
adminRouter.get("/users", getAdminUsers);
adminRouter.patch("/users/:userId/verification", updateUserVerification);
adminRouter.patch("/users/:userId/status", updateUserStatus);
adminRouter.get("/posts", getAdminPosts);
adminRouter.delete("/posts/:postId", deleteAdminPost);
export default adminRouter;
