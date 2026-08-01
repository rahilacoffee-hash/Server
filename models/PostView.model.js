import mongoose from "mongoose";
const schema = new mongoose.Schema({ post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true }, user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, viewedAt: { type: Date, default: Date.now } }, { timestamps: true });
schema.index({ post: 1, user: 1 }, { unique: true });
export default mongoose.model("PostView", schema);
