import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

const connectDB = async ({ retries = 5, initialDelay = 2000 } = {}) => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI missing in env");
  }

  let attempt = 0;
  let delay = initialDelay;

  while (attempt < retries) {
    try {
      attempt += 1;

      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 35000,
        connectTimeoutMS: 30000,
      });

      console.log("✅ MongoDB connected");
      return;
    } catch (error) {
      console.error(
        `❌ MongoDB connection attempt ${attempt} failed:`,
        error.message,
      );

      if (attempt >= retries) {
        console.error("❌ All MongoDB connection attempts failed.");
        console.error(error.stack);
        throw error;
      }

      console.log(`Retrying MongoDB connection in ${delay}ms...`);
      // eslint-disable-next-line no-await-in-loop
      await wait(delay);
      delay *= 2; // exponential backoff
    }
  }
};

export default connectDB;
