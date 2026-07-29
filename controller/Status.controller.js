import StatusModel from "../models/Status.model.js";
import ConversationModel from "../models/Conversation.model.js";
import MessageModel from "../models/Message.model.js";
import { getIO, getSocketsForUser } from "../config/Socketserver.js";

export async function createStatusController(req, res) {
  try {
    const { text = "", mediaUrl = "", type = "text" } = req.body;
    if (!text.trim() && !mediaUrl) {
      return res.status(400).json({ message: "Add text, an image, or a video", success: false, error: true });
    }

    const mediaType = type === "video" ? "video" : type === "image" ? "image" : "text";

    const status = await StatusModel.create({
      author: req.userId,
      text: text.trim(),
      mediaUrl,
      type: mediaUrl ? mediaType : "text",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const populated = await status.populate("author", "name avatar");
    return res.status(201).json({ data: populated, success: true, error: false });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false, error: true });
  }
}

export async function getStatusesController(req, res) {
  try {
    const now = new Date();
    const statuses = await StatusModel.find({
      author: { $ne: req.userId },
      expiresAt: { $gt: now },
    })
      .populate("author", "name avatar")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ data: statuses, success: true, error: false });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false, error: true });
  }
}

export async function getMyStatusesController(req, res) {
  try {
    const statuses = await StatusModel.find({ author: req.userId, expiresAt: { $gt: new Date() } })
      .populate("author", "name avatar")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ data: statuses, success: true, error: false });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false, error: true });
  }
}

export async function markStatusViewedController(req, res) {
  try {
    const status = await StatusModel.findOneAndUpdate(
      { _id: req.params.statusId, expiresAt: { $gt: new Date() } },
      { $addToSet: { viewedBy: req.userId } },
      { returnDocument: "after" }
    );
    if (!status) return res.status(404).json({ message: "Status not found", success: false, error: true });
    return res.json({ data: status, success: true, error: false });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false, error: true });
  }
}

export async function deleteStatusController(req, res) {
  try {
    const status = await StatusModel.findOneAndDelete({ _id: req.params.statusId, author: req.userId });
    if (!status) return res.status(404).json({ message: "Status not found", success: false, error: true });
    return res.json({ success: true, error: false });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false, error: true });
  }
}

export async function replyToStatusController(req, res) {
  try {
    const text = req.body?.text?.trim();
    if (!text) {
      return res.status(400).json({ message: "A reply cannot be empty", success: false, error: true });
    }

    const status = await StatusModel.findOne({
      _id: req.params.statusId,
      expiresAt: { $gt: new Date() },
    }).populate("author", "name avatar");

    if (!status) {
      return res.status(404).json({ message: "Status not found or expired", success: false, error: true });
    }
    if (String(status.author._id) === String(req.userId)) {
      return res.status(400).json({ message: "You cannot reply to your own status", success: false, error: true });
    }

    let conversation = await ConversationModel.findOne({
      participants: { $all: [req.userId, status.author._id], $size: 2 },
      isGroup: { $ne: true },
    });
    if (!conversation) {
      conversation = await ConversationModel.create({ participants: [req.userId, status.author._id] });
    }

    const message = await MessageModel.create({
      conversationId: conversation._id,
      sender: req.userId,
      receiver: status.author._id,
      text,
      statusReplyTo: status._id,
    });
    conversation.lastMessage = message._id;
    const unread = conversation.unreadCounts.get(String(status.author._id)) || 0;
    conversation.unreadCounts.set(String(status.author._id), unread + 1);
    await conversation.save();

    const populated = await MessageModel.findById(message._id)
      .populate("sender", "name email avatar isOnline lastSeen")
      .populate("receiver", "name email avatar isOnline lastSeen")
      .populate("statusReplyTo", "text mediaUrl type author");

    const io = getIO();
    getSocketsForUser(String(status.author._id)).forEach((socketId) => {
      io.to(socketId).emit("newMessage", populated);
      io.to(socketId).emit("conversationUpdated");
    });
    getSocketsForUser(String(req.userId)).forEach((socketId) => io.to(socketId).emit("conversationUpdated"));

    return res.status(201).json({ data: populated, success: true, error: false });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false, error: true });
  }
}
