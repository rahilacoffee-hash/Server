import ConversationModel from "../models/Conversation.model.js";
import MessageModel from "../models/Message.model.js";

export async function getConversationsController(req, res) {
  try {
    const userId = req.userId;

    const conversations = await ConversationModel.find({
      participants: userId,
    })
      .populate("participants", "name email avatar isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: [
          {
            path: "sender",
            select: "name email avatar",
          },
          {
            path: "receiver",
            select: "name email avatar",
          },
        ],
      })
      .sort({ updatedAt: -1 });

    const formatted = conversations.map((chat) => ({
      ...chat.toObject(),
      unreadCount:
        chat.unreadCounts?.get(userId.toString()) || 0,
    }));

    return res.status(200).json({
      success: true,
      error: false,
      data: formatted,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message,
    });
  }
}

export async function getOrCreateConversationController(req, res) {
  try {
    const userId = req.userId;
    const { otherUserId } = req.body;

    let conversation = await ConversationModel.findOne({
      participants: {
        $all: [userId, otherUserId],
        $size: 2,
      },
    }).populate(
      "participants",
      "name email avatar isOnline lastSeen"
    );

    if (!conversation) {
      conversation = await ConversationModel.create({
        participants: [userId, otherUserId],
      });

      conversation = await ConversationModel.findById(
        conversation._id
      ).populate(
        "participants",
        "name email avatar isOnline lastSeen"
      );
    }

    return res.status(200).json({
      success: true,
      error: false,
      data: conversation,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message,
    });
  }
}

export async function createGroupConversationController(req, res) {
  try {
    const { name, participantIds = [] } = req.body;
    const participantSet = [...new Set([req.userId.toString(), ...participantIds.map(String)])];

    if (!name?.trim() || participantSet.length < 3) {
      return res.status(400).json({ success: false, error: true, message: "A group needs a name and at least two members" });
    }

    const conversation = await ConversationModel.create({
      participants: participantSet,
      isGroup: true,
      groupName: name.trim(),
      admins: [req.userId],
    });
    const populated = await ConversationModel.findById(conversation._id)
      .populate("participants", "name email avatar isOnline lastSeen")
      .populate("admins", "name avatar");

    return res.status(201).json({ success: true, error: false, data: populated });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: error.message });
  }
}

export async function addGroupMembersController(req, res) {
  try {
    const { participantIds = [] } = req.body;
    const conversation = await ConversationModel.findOne({
      _id: req.params.conversationId,
      isGroup: true,
      admins: req.userId,
    });
    if (!conversation) return res.status(404).json({ success: false, error: true, message: "Group not found or you are not an admin" });

    conversation.participants = [...new Set([...conversation.participants.map(String), ...participantIds.map(String)])];
    await conversation.save();
    const populated = await ConversationModel.findById(conversation._id).populate("participants", "name email avatar isOnline lastSeen");
    return res.json({ success: true, error: false, data: populated });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: error.message });
  }
}

export async function getMessagesController(req, res) {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;

    const conversation =
      await ConversationModel.findById(
        conversationId
      );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Conversation not found",
      });
    }

    const messages = await MessageModel.find({
      conversationId,
      deletedFor: { $ne: userId },
    })
      .populate(
        "sender",
        "name email avatar"
      )
      .populate(
        "receiver",
        "name email avatar"
      )
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name avatar" },
      })
      .populate({
        path: "statusReplyTo",
        populate: { path: "author", select: "name avatar" },
      })
      .sort({
        createdAt: 1,
      });

    if (conversation.unreadCounts) {
      conversation.unreadCounts.set(
        userId.toString(),
        0
      );

      await conversation.save();
    }

    return res.status(200).json({
      success: true,
      error: false,
      data: messages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message,
    });
  }
}

export async function deleteChatForMeController(req, res) {
  try {
    const conversation = await ConversationModel.findOne({
      _id: req.params.conversationId,
      participants: req.userId,
    });
    if (!conversation) {
      return res.status(404).json({ success: false, error: true, message: "Conversation not found" });
    }

    await MessageModel.updateMany(
      { conversationId: conversation._id },
      { $addToSet: { deletedFor: req.userId } },
    );
    return res.json({ success: true, error: false });
  } catch (error) {
    return res.status(500).json({ success: false, error: true, message: error.message });
  }
}

export async function createMessageController(req, res) {
  try {
    const userId = req.userId;

    const {
      conversationId,
      text,
    } = req.body;

    const conversation =
      await ConversationModel.findById(
        conversationId
      );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Conversation not found",
      });
    }

    const receiverId =
      conversation.participants.find(
        (p) =>
          p.toString() !==
          userId.toString()
      );

    const message =
      await MessageModel.create({
        conversationId,
        sender: userId,
        receiver: receiverId,
        text,
      });

    conversation.lastMessage =
      message._id;

    const currentUnread =
      conversation.unreadCounts?.get(
        receiverId.toString()
      ) || 0;

    conversation.unreadCounts.set(
      receiverId.toString(),
      currentUnread + 1
    );

    await conversation.save();

    const populated =
      await MessageModel.findById(
        message._id
      )
        .populate(
          "sender",
          "name email avatar"
        )
        .populate(
          "receiver",
          "name email avatar"
        );

    return res.status(201).json({
      success: true,
      error: false,
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message,
    });
  }
}
