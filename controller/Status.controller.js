import StatusModel from "../models/Status.model.js";

export async function createStatusController(req, res) {
  try {
    const { text = "", mediaUrl = "", type = "text" } = req.body;
    if (!text.trim() && !mediaUrl) {
      return res.status(400).json({ message: "Add text or an image", success: false, error: true });
    }

    const status = await StatusModel.create({
      author: req.userId,
      text: text.trim(),
      mediaUrl,
      type: mediaUrl ? "image" : type,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const populated = await status.populate("author", "name avatar");
    return res.status(201).json({ data: populated, success: true, error: false });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false, error: true });
  }
}

export async function getStatusesController(req, res) {
  try {
    const now = new Date();
    const statuses = await StatusModel.find({
      author: { $ne: req.userId },
      expiresAt: { $gt: now },
    })
      .populate("author", "name avatar")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ data: statuses, success: true, error: false });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false, error: true });
  }
}

export async function getMyStatusesController(req, res) {
  try {
    const statuses = await StatusModel.find({ author: req.userId, expiresAt: { $gt: new Date() } })
      .populate("author", "name avatar")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ data: statuses, success: true, error: false });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false, error: true });
  }
}

export async function markStatusViewedController(req, res) {
  try {
    const status = await StatusModel.findOneAndUpdate(
      { _id: req.params.statusId, expiresAt: { $gt: new Date() } },
      { $addToSet: { viewedBy: req.userId } },
      { returnDocument: "after" }
    );
    if (!status) return res.status(404).json({ message: "Status not found", success: false, error: true });
    return res.json({ data: status, success: true, error: false });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false, error: true });
  }
}

export async function deleteStatusController(req, res) {
  try {
    const status = await StatusModel.findOneAndDelete({ _id: req.params.statusId, author: req.userId });
    if (!status) return res.status(404).json({ message: "Status not found", success: false, error: true });
    return res.json({ success: true, error: false });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false, error: true });
  }
}
