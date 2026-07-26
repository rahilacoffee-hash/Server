import { Router } from "express";
import auth from "../middlewares/auth.js";
import {
  getConversationsController,
  getOrCreateConversationController,
  getMessagesController,
  createMessageController,
} from "../controller/Chat.controller.js";

const chatRouter = Router();

chatRouter.get("/conversations", auth, getConversationsController);
chatRouter.post("/conversations", auth, getOrCreateConversationController);
chatRouter.get("/messages/:conversationId", auth, getMessagesController);
chatRouter.post("/messages", auth, createMessageController);

export default chatRouter;
