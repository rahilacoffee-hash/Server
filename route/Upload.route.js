import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import auth  from "../middlewares/auth.js";

const uploadRouter = Router();

// Memory storage — we never write the file to local disk, just hold it
// in a buffer long enough to stream straight to Cloudinary.
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB cap, adjust as needed
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/upload  (multipart/form-data, field name: "file")
uploadRouter.post("/", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file provided",
        success: false,
        error: true,
      });
    }

    // Convert the in-memory buffer to a base64 data URI, which Cloudinary's
    // upload() method accepts directly — no temp file on disk needed.
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
      "base64"
    )}`;

    const isAudio = req.file.mimetype.startsWith("audio");

    // Cloudinary streams audio through its `video` asset type. Uploading it
    // as `raw` can result in a generic download response that browsers cannot
    // reliably range-request or decode in an <audio> element.
    const uploadOptions = isAudio
      ? {
          folder: "chatverse/chat-media",
          resource_type: "video",
          public_id: `voice-${Date.now()}`,
        }
      : {
          folder: "chatverse/chat-media",
          resource_type: "auto",
        };

    const result = await cloudinary.uploader.upload(base64, uploadOptions);

    return res.status(200).json({
      url: result.secure_url,
      success: true,
      error: false,
    });
  } catch (err) {
    console.error("Upload error:", err.message);
    return res.status(500).json({
      message: "Upload failed",
      success: false,
      error: true,
    });
  }
});

export default uploadRouter;
