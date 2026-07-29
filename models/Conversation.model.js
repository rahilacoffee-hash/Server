import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    isGroup: { type: Boolean, default: false },
    groupName: { type: String, trim: true, maxlength: 100, default: "" },
    groupAvatar: { type: String, default: "" },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Removing a chat only hides it for that participant; it does not erase
    // the other participant's history.
    hiddenFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

conversationSchema.index({
  participants: 1,
});

export default mongoose.model("Conversation", conversationSchema);
