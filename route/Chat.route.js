import { Router } from "express";
import auth from "../middlewares/auth.js";
import {
  getConversationsController,
  getOrCreateConversationController,
  getMessagesController,
  createMessageController,
  createGroupConversationController,
  addGroupMembersController,
  deleteChatForMeController,
  hideConversationForUserController,
} from "../controller/Chat.controller.js";

const chatRouter = Router();

chatRouter.get("/conversations", auth, getConversationsController);
chatRouter.post("/conversations", auth, getOrCreateConversationController);
chatRouter.post("/conversations/group", auth, createGroupConversationController);
chatRouter.post("/conversations/:conversationId/members", auth, addGroupMembersController);
chatRouter.delete("/conversations/:conversationId/messages", auth, deleteChatForMeController);
chatRouter.delete("/conversations/:conversationId", auth, hideConversationForUserController);
chatRouter.get("/messages/:conversationId", auth, getMessagesController);
chatRouter.post("/messages", auth, createMessageController);

export default chatRouter;
