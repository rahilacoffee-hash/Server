import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ["image", "video"], required: true },
  duration: { type: Number, default: 0 },
  width: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
}, { _id: false });

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  caption: { type: String, trim: true, maxlength: 2200, default: "" },
  mediaType: { type: String, enum: ["image", "video", "carousel"], required: true },
  media: { type: [mediaSchema], validate: [(items) => items.length > 0, "A post needs media"] },
  thumbnail: { type: String, default: "" }, music: { type: String, default: "" },
  hashtags: [{ type: String, lowercase: true, trim: true }],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  location: { type: String, trim: true, default: "" },
  likesCount: { type: Number, default: 0, min: 0 }, commentsCount: { type: Number, default: 0, min: 0 },
  sharesCount: { type: Number, default: 0, min: 0 }, bookmarksCount: { type: Number, default: 0, min: 0 }, viewsCount: { type: Number, default: 0, min: 0 },
  allowComments: { type: Boolean, default: true }, allowDownload: { type: Boolean, default: false },
}, { timestamps: true });
postSchema.index({ createdAt: -1 });
postSchema.index({ hashtags: 1 });
export default mongoose.model("Post", postSchema);
