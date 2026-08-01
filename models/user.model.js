import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Provide name"],
      trim: true
    },

    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },

    email: {
      type: String,
      required: [true, "Provide email"],
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: [true, "Provide password"]
    },

    avatar: {
      type: String,
      default: ""
    },

    bio: {
      type: String,
      default: ""
    },

    mobile: {
      type: String,
      default: null
    },

    refresh_token: {
      type: String,
      default: ""
    },

    verify_email: {
      type: Boolean,
      default: false
    },

    isOnline: {
      type: Boolean,
      default: false
    },

    lastSeen: {
      type: Date,
      default: null
    },

    last_login_date: {
      type: Date,
      default: null
    },

    followers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],

    following: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],

    savedPosts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post"
    }],

    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended"],
      default: "Active"
    },

    otp: {
      type: String,
      default: null
    },

    otpExpiry: {
      type: Date,
      default: null
    },

    role: {
      type: String,
      enum: ["ADMIN", "USER"],
      default: "USER"
    }
  },
  {
    timestamps: true
  }
);

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
