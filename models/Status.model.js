import mongoose from "mongoose";

const statusSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true, maxlength: 700, default: "" },
    mediaUrl: { type: String, default: "" },
    type: { type: String, enum: ["text", "image"], default: "text" },
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

export default mongoose.model("Status", statusSchema);
