import mongoose from "mongoose";
const schema = new mongoose.Schema({ post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true }, user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, text: { type: String, required: true, trim: true, maxlength: 1000 }, parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null }, likesCount: { type: Number, default: 0 }, likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }] }, { timestamps: true });
schema.index({ post: 1, parentComment: 1, createdAt: -1 });
export default mongoose.model("Comment", schema);
