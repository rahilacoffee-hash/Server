import mongoose from "mongoose";
import UserModel from "../models/user.model.js";
import Post from "../models/Post.model.js";

const safeUser = "name username email avatar role isVerified status createdAt";
const validId = (id) => mongoose.isValidObjectId(id);
const toUser = (user) => ({ ...user, status: String(user.status || "Active").toLowerCase() });

export async function getAdminOverview(req, res) {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [total, recent, verified, posts] = await Promise.all([UserModel.countDocuments(), UserModel.countDocuments({ createdAt: { $gte: since } }), UserModel.countDocuments({ isVerified: true }), Post.countDocuments()]);
    return res.json({ success: true, data: { users: { total, new: recent, verified }, posts: { total: posts } } });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
}

export async function getAdminUsers(req, res) {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const q = req.query.q?.trim();
    const filter = q ? { $or: ["name", "username", "email"].map((field) => ({ [field]: { $regex: q, $options: "i" } })) } : {};
    const users = await UserModel.find(filter).select(safeUser).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ success: true, data: { users: users.map(toUser) } });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
}

export async function updateUserVerification(req, res) {
  try {
    if (!validId(req.params.userId) || typeof req.body.verified !== "boolean") return res.status(400).json({ success: false, message: "A valid user and verified value are required" });
    const user = await UserModel.findByIdAndUpdate(req.params.userId, { isVerified: req.body.verified }, { new: true }).select(safeUser).lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, data: { user: toUser(user) } });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
}

export async function updateUserStatus(req, res) {
  try {
    if (!validId(req.params.userId) || !["active", "suspended"].includes(req.body.status)) return res.status(400).json({ success: false, message: "Status must be active or suspended" });
    if (String(req.params.userId) === String(req.userId)) return res.status(400).json({ success: false, message: "You cannot change your own account status" });
    const target = await UserModel.findById(req.params.userId).select("role").lean();
    if (!target) return res.status(404).json({ success: false, message: "User not found" });
    if (target.role === "ADMIN") return res.status(403).json({ success: false, message: "Admin accounts cannot be suspended" });
    const user = await UserModel.findByIdAndUpdate(req.params.userId, { status: req.body.status === "suspended" ? "Suspended" : "Active" }, { new: true }).select(safeUser).lean();
    return res.json({ success: true, data: { user: toUser(user) } });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
}

export async function getAdminPosts(req, res) {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const q = req.query.q?.trim();
    const posts = await Post.find(q ? { caption: { $regex: q, $options: "i" } } : {}).populate("user", "name username avatar isVerified").sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ success: true, data: { posts } });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
}

export async function deleteAdminPost(req, res) {
  try {
    if (!validId(req.params.postId)) return res.status(400).json({ success: false, message: "Invalid post id" });
    const post = await Post.findByIdAndDelete(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });
    return res.json({ success: true, data: { id: post.id } });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
}
