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

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
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
