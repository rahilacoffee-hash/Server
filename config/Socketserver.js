import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import UserModel from "../models/user.model.js";
import ConversationModel from "../models/Conversation.model.js";
import MessageModel from "../models/Message.model.js";

const userSocketMap = {};

let io;

const clientOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigin = process.env.CLIENT_URL ? clientOrigins : true;
const corsOptions = {
  origin: corsOrigin,
  credentials: true,
  methods: ["GET", "POST"],
};

function getSocketsForUser(userId) {
return userSocketMap[userId] || [];
}

function isUserOnline(userId) {
return getSocketsForUser(userId).length > 0;
}

function getIO() {
if (!io) {
throw new Error("Socket.io not initialized yet");
}

return io;
}

function initSocket(httpServer) {
io = new Server(httpServer, {
cors: {
...corsOptions,
},
});

io.use((socket, next) => {
try {
const token =
socket.handshake.auth?.token;


  if (!token) {
    return next(
      new Error(
        "No auth token provided"
      )
    );
  }

  const decoded = jwt.verify(
    token,
    process.env
      .SECRET_KEY_ACCESS_TOKEN
  );

  socket.userId =
    decoded.id ||
    decoded._id ||
    decoded.userId;

  next();
} catch (error) {
  next(
    new Error(
      "Invalid or expired token"
    )
  );
}


});

io.on("connection", async (socket) => {
const userId = socket.userId;


console.log(
  `🟢 User connected: ${userId}`
);

// =====================
// ONLINE USERS
// =====================

if (!userSocketMap[userId]) {
  userSocketMap[userId] = [];
}

if (
  !userSocketMap[userId].includes(
    socket.id
  )
) {
  userSocketMap[userId].push(
    socket.id
  );
}

await UserModel.findByIdAndUpdate(
  userId,
  {
    isOnline: true,
  }
);

socket.emit(
  "onlineUsers",
  Object.keys(userSocketMap)
);

io.emit("userOnline", userId);

// =====================
// SEND MESSAGE
// =====================

socket.on(
  "sendMessage",
  async (
    payload,
    callback
  ) => {
    try {
      const {
        conversationId,
        receiverId,
        type = "text",
        text = "",
        mediaUrl = "",
        fileName = "",
        fileSize = 0,
        replyTo = null,
      } = payload;

      if (
        !conversationId ||
        !receiverId
      ) {
        return callback?.({
          success: false,
          message:
            "Missing required fields",
        });
      }

      let message =
        await MessageModel.create({
          conversationId,
          sender: userId,
          receiver: receiverId,
          type,
          text,
          mediaUrl,
          fileName,
          fileSize,
          replyTo,
        });

      message =
        await MessageModel.findById(
          message._id
        )
          .populate(
            "sender",
            "name email avatar isOnline lastSeen"
          )
          .populate(
            "receiver",
            "name email avatar isOnline lastSeen"
          )
          .populate({
            path: "replyTo",
            populate: { path: "sender", select: "name avatar" },
          });

      const conversation =
        await ConversationModel.findById(
          conversationId
        );

      if (!conversation) {
        return callback?.({
          success: false,
          message:
            "Conversation not found",
        });
      }

      conversation.lastMessage =
        message._id;

      const unread =
        conversation.unreadCounts.get(
          receiverId
        ) || 0;

      conversation.unreadCounts.set(
        receiverId,
        unread + 1
      );

      await conversation.save();

      const receiverSockets =
        getSocketsForUser(
          receiverId
        );

      if (
        receiverSockets.length > 0
      ) {
        message.deliveredAt =
          new Date();

        await message.save();

        receiverSockets.forEach(
          (socketId) => {
            io.to(socketId).emit(
              "newMessage",
              message
            );

            io.to(socketId).emit(
              "conversationUpdated"
            );
          }
        );

        socket.emit(
          "messageStatusUpdate",
          {
            messageId:
              message._id,
            deliveredAt:
              message.deliveredAt,
          }
        );
      }

      socket.emit(
        "conversationUpdated"
      );

      callback?.({
        success: true,
        message,
      });
    } catch (error) {
      console.error(error);

      callback?.({
        success: false,
        message:
          "Failed to send message",
      });
    }
  }
);

// ==========================
// CALLING (WEBRTC SIGNALING)
// ==========================

socket.on("callUser", ({ receiverId, offer, callerName, callType = "voice" }, callback) => {
  const receiverSockets = getSocketsForUser(receiverId);

  if (!receiverSockets.length) {
    callback?.({ success: false, message: "User is not online" });
    return;
  }

  receiverSockets.forEach((socketId) => {
    io.to(socketId).emit("incomingCall", {
      callerId: userId,
      callerName,
      callType,
      offer,
    });
  });

  socket.data.callTarget = receiverId;

  callback?.({ success: true });
});

socket.on("answerCall", ({ callerId, answer }) => {
  const callerSockets = getSocketsForUser(callerId);

  callerSockets.forEach((socketId) => {
    io.to(socketId).emit("callAnswered", {
      answer,
    });
  });

  socket.data.callTarget = callerId;
});

socket.on("iceCandidate", ({ targetUserId, candidate }) => {
  const sockets = getSocketsForUser(targetUserId);

  sockets.forEach((socketId) => {
    io.to(socketId).emit("iceCandidate", candidate);
  });
});

socket.on("endCall", ({ targetUserId }) => {
  const sockets = getSocketsForUser(targetUserId);

  sockets.forEach((socketId) => {
    io.to(socketId).emit("callEnded");
  });

  socket.data.callTarget = null;
});

socket.on("rejectCall", ({ callerId }) => {
  const callerSockets = getSocketsForUser(callerId);

  callerSockets.forEach((socketId) => {
    io.to(socketId).emit("callRejected");
    const callerSocket = io.sockets.sockets.get(socketId);
    if (callerSocket) callerSocket.data.callTarget = null;
  });
  socket.data.callTarget = null;
});

// =====================
// READ RECEIPTS
// =====================

socket.on(
  "markAsRead",
  async ({
    messageId,
    senderId,
  }) => {
    try {
      const message =
        await MessageModel.findById(
          messageId
        );

      if (!message) return;

      if (!message.readAt) {
        message.readAt =
          new Date();

        await message.save();

        const conversation =
          await ConversationModel.findById(
            message.conversationId
          );

        if (
          conversation
        ) {
          conversation.unreadCounts.set(
            userId,
            0
          );

          await conversation.save();
        }

        const senderSockets =
          getSocketsForUser(
            senderId
          );

        senderSockets.forEach(
          (socketId) => {
            io.to(
              socketId
            ).emit(
              "messageStatusUpdate",
              {
                messageId:
                  message._id,
                readAt:
                  message.readAt,
              }
            );

            io.to(
              socketId
            ).emit(
              "conversationUpdated"
            );
          }
        );

        socket.emit(
          "conversationUpdated"
        );
      }
    } catch (error) {
      console.error(
        error.message
      );
    }
  }
);

// =====================
// TYPING
// =====================

socket.on(
  "typing",
  ({
    conversationId,
    receiverId,
  }) => {
    getSocketsForUser(
      receiverId
    ).forEach((socketId) => {
      io.to(socketId).emit(
        "userTyping",
        {
          conversationId,
          userId,
        }
      );
    });
  }
);

socket.on(
  "stopTyping",
  ({
    conversationId,
    receiverId,
  }) => {
    getSocketsForUser(
      receiverId
    ).forEach((socketId) => {
      io.to(socketId).emit(
        "userStoppedTyping",
        {
          conversationId,
          userId,
        }
      );
    });
  }
);

// =====================
// CHECK ONLINE
// =====================

socket.on(
  "checkUserOnline",
  (
    targetUserId,
    callback
  ) => {
    callback(
      isUserOnline(
        targetUserId
      )
    );
  }
);

// =====================
// REFRESH CHAT LIST
// =====================

socket.on(
  "refreshConversations",
  () => {
    socket.emit(
      "conversationUpdated"
    );
  }
);

// =====================
// DISCONNECT
// =====================

socket.on(
  "disconnect",
  async () => {
    console.log(
      `🔴 User disconnected: ${userId}`
    );

    // A browser refresh closes its socket without a final endCall event.
    // Notify the other participant so their call UI does not get stuck.
    if (socket.data.callTarget) {
      getSocketsForUser(socket.data.callTarget).forEach((socketId) => {
        io.to(socketId).emit("callEnded");
      });
      socket.data.callTarget = null;
    }

    if (
      !userSocketMap[userId]
    )
      return;

    userSocketMap[userId] =
      userSocketMap[
        userId
      ].filter(
        (id) =>
          id !== socket.id
      );

    if (
      userSocketMap[userId]
        .length === 0
    ) {
      delete userSocketMap[
        userId
      ];

      const lastSeen =
        new Date();

      await UserModel.findByIdAndUpdate(
        userId,
        {
          isOnline: false,
          lastSeen,
        }
      );

      io.emit(
        "userOffline",
        {
          userId,
          lastSeen,
        }
      );
    }
  }
);


socket.on("addReaction", async ({ messageId, reaction, receiverId }) => {
  try {
    const userId = socket.userId;

    const message = await MessageModel.findById(messageId);

    if (!message) return;

    // remove previous reaction from same user
    message.reactions = message.reactions.filter(
      (r) => r.userId.toString() !== userId
    );

    // add new reaction
    message.reactions.push({
      userId,
      type: reaction,
    });

    await message.save();

    const populated = await MessageModel.findById(messageId)
      .populate("sender", "name avatar")
      .populate("receiver", "name avatar");

    // send to receiver
    const receiverSockets = getSocketsForUser(receiverId);

    receiverSockets.forEach((socketId) => {
      io.to(socketId).emit("messageReactionUpdated", populated);
    });

    // also send to sender
    socket.emit("messageReactionUpdated", populated);
  } catch (err) {
    console.log("reaction error", err.message);
  }
});

// =====================
// MESSAGE ACTIONS
// =====================

const populateMessage = (messageId) =>
  MessageModel.findById(messageId)
    .populate("sender", "name email avatar")
    .populate("receiver", "name email avatar")
    .populate({
      path: "replyTo",
      populate: { path: "sender", select: "name avatar" },
    });

const emitToMessageParticipants = (message, event, payload) => {
  const participantIds = [message.sender._id || message.sender, message.receiver._id || message.receiver]
    .map((id) => id.toString());
  [...new Set(participantIds)].forEach((participantId) => {
    getSocketsForUser(participantId).forEach((socketId) => io.to(socketId).emit(event, payload));
  });
};

socket.on("editMessage", async ({ messageId, text }, callback) => {
  try {
    const message = await MessageModel.findById(messageId);
    if (!message || message.sender.toString() !== userId || message.isDeleted) {
      return callback?.({ success: false, message: "Message cannot be edited" });
    }
    if (!text?.trim()) return callback?.({ success: false, message: "Message cannot be empty" });

    message.text = text.trim();
    message.editedAt = new Date();
    await message.save();
    const populated = await populateMessage(message._id);
    emitToMessageParticipants(populated, "messageUpdated", populated);
    callback?.({ success: true, message: populated });
  } catch (error) {
    callback?.({ success: false, message: "Could not edit message" });
  }
});

socket.on("deleteMessage", async ({ messageId, scope }, callback) => {
  try {
    const message = await MessageModel.findById(messageId);
    const isParticipant = message && [message.sender.toString(), message.receiver.toString()].includes(userId);
    if (!isParticipant) return callback?.({ success: false, message: "Message not found" });

    if (scope === "everyone") {
      if (message.sender.toString() !== userId) {
        return callback?.({ success: false, message: "Only the sender can delete for everyone" });
      }
      message.isDeleted = true;
      message.text = "";
      message.mediaUrl = "";
      message.replyTo = null;
      await message.save();
      const populated = await populateMessage(message._id);
      emitToMessageParticipants(populated, "messageUpdated", populated);
      return callback?.({ success: true });
    }

    if (!message.deletedFor.some((id) => id.toString() === userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }
    socket.emit("messageDeletedForMe", { messageId });
    callback?.({ success: true });
  } catch (error) {
    callback?.({ success: false, message: "Could not delete message" });
  }
});


});

return io;
}

export {
initSocket,
getIO,
getSocketsForUser,
isUserOnline,
};
