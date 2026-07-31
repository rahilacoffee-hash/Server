import { Router } from "express";
import auth from "../middlewares/auth.js";
import {
  getConversationsController,
  getExploreController,
  askExploreAiController,
  createExplorePostController,
  getOrCreateConversationController,
  getMessagesController,
  createMessageController,
  createGroupConversationController,
  addGroupMembersController,
  updateGroupController,
  removeGroupMemberController,
  promoteGroupAdminController,
  deleteChatForMeController,
  hideConversationForUserController,
} from "../controller/Chat.controller.js";

const chatRouter = Router();

chatRouter.get("/conversations", auth, getConversationsController);
chatRouter.get("/explore", auth, getExploreController);
chatRouter.post("/ai/ask", auth, askExploreAiController);
chatRouter.post("/explore/posts", auth, createExplorePostController);
chatRouter.post("/conversations", auth, getOrCreateConversationController);
chatRouter.post("/conversations/group", auth, createGroupConversationController);
chatRouter.post("/conversations/:conversationId/members", auth, addGroupMembersController);
chatRouter.patch("/conversations/:conversationId/group", auth, updateGroupController);
chatRouter.delete("/conversations/:conversationId/members/:memberId", auth, removeGroupMemberController);
chatRouter.post("/conversations/:conversationId/members/:memberId/admin", auth, promoteGroupAdminController);
chatRouter.delete("/conversations/:conversationId/messages", auth, deleteChatForMeController);
chatRouter.delete("/conversations/:conversationId", auth, hideConversationForUserController);
chatRouter.get("/messages/:conversationId", auth, getMessagesController);
chatRouter.post("/messages", auth, createMessageController);

export default chatRouter;
