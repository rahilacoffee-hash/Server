import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import http from "http";
import connectDB from "./config/connectDb.js";
import userRouter from "./route/user.route.js";
import { initSocket } from "./config/Socketserver.js";
import chatRouter from "./route/Chat.route.js";
import uploadRouter from "./route/Upload.route.js";
import statusRouter from "./route/Status.route.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const clientOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
// Restrict production to CLIENT_URL when it is set.  Until then, permit a
// browser origin so a separately deployed frontend can reach this API.
const corsOrigin = process.env.CLIENT_URL ? clientOrigins : true;
const corsOptions = {
  origin: corsOrigin,
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const app = express();
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("ChatVerse API running 🚀");
});

app.use("/api/user", userRouter);
app.use("/api/chat", chatRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/status", statusRouter);

// Socket.io needs a raw http server to attach to — Express's app.listen()
// creates one internally, but we need direct access to pass it to Socket.io.
const httpServer = http.createServer(app);
initSocket(httpServer);

const startServer = async () => {
  try {
    await connectDB();

    httpServer.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `❌ Port ${PORT} is already in use. Stop the process using it or set a different PORT in .env.`,
        );
      } else {
        console.error("❌ Server error:", err);
      }
      process.exit(1);
    });

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();
