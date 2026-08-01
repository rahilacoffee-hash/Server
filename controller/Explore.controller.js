import mongoose from "mongoose";
import Post from "../models/Post.model.js";
import Like from "../models/Like.model.js";
import Comment from "../models/Comment.model.js";
import PostView from "../models/PostView.model.js";
import User from "../models/user.model.js";
import { getIO } from "../config/Socketserver.js";

const validId = (id) => mongoose.isValidObjectId(id);
const emit = (event, payload) => { try { getIO().emit(event, payload); } catch { /* server not started in tests */ } };
const postData = (post) => post.populate("user", "name username avatar");

export async function createPost(req, res) {
  try {
    const { caption = "", mediaType, media = [], thumbnail = "", music = "", hashtags = [], mentions = [], location = "", allowComments = true, allowDownload = false } = req.body;
    if (!mediaType || !Array.isArray(media) || !media.length) return res.status(400).json({ success: false, message: "mediaType and at least one media item are required" });
    const post = await Post.create({ user: req.userId, caption, mediaType, media, thumbnail, music, hashtags: hashtags.map((tag) => tag.replace(/^#/, "").toLowerCase()), mentions, location, allowComments, allowDownload });
    res.status(201).json({ success: true, data: await postData(post) });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
}
export async function getMyPosts(req, res) {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const posts = await Post.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "name username avatar")
      .lean();
    res.json({ success: true, data: { posts } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
export async function likePost(req, res) {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid post id" });
    const post = await Post.findById(req.params.id); if (!post) return res.status(404).json({ success: false, message: "Post not found" });
    try { await Like.create({ post: post._id, user: req.userId }); } catch (error) { if (error.code === 11000) return res.status(409).json({ success: false, message: "Already liked" }); throw error; }
    post.likesCount += 1; await post.save(); emit("postLiked", { postId: post.id, likesCount: post.likesCount, userId: req.userId });
    res.json({ success: true, data: await postData(post) });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
}
export async function unlikePost(req, res) {
  try { const like = await Like.findOneAndDelete({ post: req.params.id, user: req.userId }); if (!like) return res.status(404).json({ success: false, message: "Like not found" }); const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { likesCount: -1 } }, { new: true }); emit("postLiked", { postId: req.params.id, likesCount: post.likesCount, userId: req.userId, liked: false }); res.json({ success: true, data: await postData(post) }); } catch (error) { res.status(500).json({ success: false, message: error.message }); }
}
export async function addComment(req, res) {
  try { const post = await Post.findById(req.params.id); if (!post) return res.status(404).json({ success: false, message: "Post not found" }); if (!post.allowComments) return res.status(403).json({ success: false, message: "Comments are disabled" }); const { text, parentComment = null } = req.body; if (!text?.trim()) return res.status(400).json({ success: false, message: "Comment text is required" }); if (parentComment && !await Comment.exists({ _id: parentComment, post: post._id })) return res.status(400).json({ success: false, message: "Parent comment not found" }); const comment = await Comment.create({ post: post._id, user: req.userId, text, parentComment }); post.commentsCount += 1; await post.save(); const data = await comment.populate("user", "name username avatar"); emit("newComment", { postId: post.id, comment: data }); res.status(201).json({ success: true, data }); } catch (error) { res.status(500).json({ success: false, message: error.message }); }
}
export async function getComments(req, res) {
  try { const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20)); const [comments, total] = await Promise.all([Comment.find({ post: req.params.id, parentComment: null }).populate("user", "name username avatar").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Comment.countDocuments({ post: req.params.id, parentComment: null })]); const ids = comments.map((c) => c._id); const replies = await Comment.find({ parentComment: { $in: ids } }).populate("user", "name username avatar").sort({ createdAt: 1 }).lean(); const grouped = Object.groupBy(replies, (reply) => String(reply.parentComment)); res.json({ success: true, data: { comments: comments.map((comment) => ({ ...comment, replies: grouped[String(comment._id)] || [] })), page, hasMore: page * limit < total } }); } catch (error) { res.status(500).json({ success: false, message: error.message }); }
}
export async function deleteComment(req, res) { try { const comment = await Comment.findOne({ _id: req.params.id, user: req.userId }); if (!comment) return res.status(404).json({ success: false, message: "Comment not found" }); const result = await Comment.deleteMany({ $or: [{ _id: comment._id }, { parentComment: comment._id }] }); await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -result.deletedCount } }); res.json({ success: true }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } }
export async function likeComment(req, res) { try { const comment = await Comment.findById(req.params.id); if (!comment) return res.status(404).json({ success: false, message: "Comment not found" }); if (!comment.likedBy.some((id) => String(id) === String(req.userId))) { comment.likedBy.push(req.userId); comment.likesCount += 1; await comment.save(); } res.json({ success: true, data: comment }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } }
export async function sharePost(req, res) { try { const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { sharesCount: 1 } }, { new: true }); if (!post) return res.status(404).json({ success: false, message: "Post not found" }); const shareLink = `${process.env.CLIENT_URL?.split(",")[0] || "https://yourdomain.com"}/post/${post.id}`; emit("postShared", { postId: post.id, sharesCount: post.sharesCount, userId: req.userId }); res.json({ success: true, data: { post, shareLink } }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } }
export async function bookmarkPost(req, res) { try { const user = await User.findById(req.userId); const post = await Post.findById(req.params.id); if (!post) return res.status(404).json({ success: false, message: "Post not found" }); if (!user.savedPosts.some((id) => String(id) === String(post._id))) { user.savedPosts.push(post._id); post.bookmarksCount += 1; await Promise.all([user.save(), post.save()]); } res.json({ success: true, data: post }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } }
export async function unbookmarkPost(req, res) { try { const user = await User.findById(req.userId); const removed = user.savedPosts.some((id) => String(id) === req.params.id); user.savedPosts = user.savedPosts.filter((id) => String(id) !== req.params.id); await user.save(); const post = removed ? await Post.findByIdAndUpdate(req.params.id, { $inc: { bookmarksCount: -1 } }, { new: true }) : await Post.findById(req.params.id); res.json({ success: true, data: post }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } }
export async function recordView(req, res) { try { if (Number(req.body.watchedMs) < 2000) return res.status(400).json({ success: false, message: "A view is counted after 2 seconds" }); const viewedAt = new Date(Date.now() - 86400000); const existing = await PostView.findOne({ post: req.params.id, user: req.userId, viewedAt: { $gte: viewedAt } }); if (!existing) { await PostView.findOneAndUpdate({ post: req.params.id, user: req.userId }, { viewedAt: new Date() }, { upsert: true }); const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } }, { new: true }); return res.json({ success: true, counted: true, data: post }); } res.json({ success: true, counted: false }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } }
export async function explore(req, res) { try { const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20)); const cursor = req.query.cursor ? new Date(req.query.cursor) : null; const query = req.query.q?.trim(); const match = { ...(cursor ? { createdAt: { $lt: cursor } } : {}), ...(query ? { $or: [{ caption: { $regex: query, $options: "i" } }, { hashtags: { $regex: query.replace(/^#/, ""), $options: "i" } }] } : {}) }; const posts = await Post.aggregate([{ $match: match }, { $addFields: { trendingScore: { $add: [{ $multiply: ["$likesCount", 4] }, { $multiply: ["$commentsCount", 5] }, { $multiply: ["$sharesCount", 8] }, { $multiply: ["$bookmarksCount", 6] }, "$viewsCount", { $multiply: [{ $divide: [{ $subtract: [new Date(), "$createdAt"] }, 3600000] }, -0.08] }] } } }, { $sort: { trendingScore: -1, createdAt: -1 } }, { $limit: limit + 1 }]); const hasMore = posts.length > limit; const result = posts.slice(0, limit); await Post.populate(result, { path: "user", select: "name username avatar" }); const likedIds = new Set((await Like.find({ user: req.userId, post: { $in: result.map((post) => post._id) } }).select("post").lean()).map((like) => String(like.post))); res.json({ success: true, data: { posts: result.map((post) => ({ ...post, likedByMe: likedIds.has(String(post._id)) })), nextCursor: hasMore ? result.at(-1).createdAt.toISOString() : null, hasMore } }); } catch (error) { res.status(500).json({ success: false, message: error.message }); } }
