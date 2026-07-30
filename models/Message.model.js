import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "video", "document", "audio"],
      default: "text",
    },
    text: {
      type: String,
      default: "",
    },
    mediaUrl: {
      type: String,
      default: "",
    },
    // View-once media is removed from message responses after the recipient
    // opens it. The URL is deliberately retained only until that first view.
    viewOnce: {
      type: Boolean,
      default: false,
    },
    viewedAt: {
      type: Date,
      default: null,
    },
    // file name + size, only relevant for type: "document"
    fileName: {
      type: String,
      default: "",
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    // Three independent timestamps rather than one status string —
    // a message can be sent but never delivered (receiver offline),
    // delivered but not yet read, etc. Presence of a timestamp = that
    // stage happened.
    deliveredAt: {
      type: Date,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    // Set when this chat message was sent as a reply to a 24-hour status.
    statusReplyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Status",
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // One reaction per user; the socket handler replaces a user's previous
    // reaction and broadcasts the saved message to both participants.
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        type: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
  },
  { timestamps: true } // gives us createdAt as the "sent" timestamp for free
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

const MessageModel = mongoose.model("Message", messageSchema);

export default MessageModel;
