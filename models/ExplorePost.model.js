import mongoose from "mongoose";

const explorePostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["Photo", "Video", "Voice post", "Article", "Poll", "Event", "Job post", "AI generated", "Post"], default: "Post" },
  text: { type: String, trim: true, maxlength: 2000, required: true },
  mediaUrl: { type: String, default: "" },
  pollOptions: [{ type: String, trim: true }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

export default mongoose.model("ExplorePost", explorePostSchema);
