import UserModel from "../models/user.model.js";

export default async function requireAdmin(req, res, next) {
  try {
    const user = await UserModel.findById(req.userId).select("role").lean();
    if (!user || user.role !== "ADMIN") return res.status(403).json({ success: false, error: true, message: "Admin access required" });
    return next();
  } catch {
    return res.status(500).json({ success: false, error: true, message: "Could not validate admin access" });
  }
}
