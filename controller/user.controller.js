import UserModel from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendEmail from "../config/sendEmail.js";
import verifyEmailTemplate from "../utils/verifyEmailTemplate.js";
import generatedAccessToken from "../utils/generatedAccessToken.js";
import generatedRefreshToken from "../utils/generatedRefreshToken.js";

// Browsers reject SameSite=Lax cookies on XHR requests from the separately
// hosted frontend. HTTPS deployments must use Secure + SameSite=None; local
// HTTP development keeps the more convenient Lax configuration.
const authCookieOptions = () => {
  const deployed =
    process.env.NODE_ENV === "production" ||
    process.env.CLIENT_URL?.startsWith("https://");

  return {
    httpOnly: true,
    secure: deployed,
    sameSite: deployed ? "none" : "lax",
    path: "/",
  };
};

// Register
export async function registerUserController(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Provide all required fields",
        error: true,
        success: false,
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
        error: true,
        success: false,
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await UserModel.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
        error: true,
        success: false,
      });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new UserModel({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "USER",
      otp: otpCode,
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
    });

    await user.save();

    const emailResult = await sendEmail({
      sendTo: normalizedEmail,
      subject: "Verify your Email",
      text: `Your OTP code is ${otpCode}. It expires in 10 minutes.`,
      html: verifyEmailTemplate(name, otpCode),
    });

    if (!emailResult.success) {
      return res.status(500).json({
        message:
          "Registration saved but failed to send OTP email. Please try again.",
        error: true,
        success: false,
      });
    }

    return res.status(201).json({
      message: "Registration successful. Check your email for OTP.",
      success: true,
      error: false,
    });
  } catch (error) {
    console.error("Register Error:", error);

    return res.status(500).json({
      message: error.message || "Internal Server Error",
      error: true,
      success: false,
    });
  }
}

// verify email
export async function verifyEmailController(req, res) {
  try {
    const { email, otp } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ message: "User not found", error: true, success: false });
    if (user.otp !== otp)
      return res
        .status(400)
        .json({ message: "Invalid OTP", error: true, success: false });
    if (user.otpExpiry < Date.now())
      return res
        .status(400)
        .json({ message: "OTP expired", error: true, success: false });
    user.verify_email = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();
    return res
      .status(200)
      .json({ message: "Email verified", success: true, error: false });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message, error: true, success: false });
  }
}
// login
export async function loginUserController(req, res) {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
        error: true,
        success: false,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
        error: true,
        success: false,
      });
    }

    const accessToken = await generatedAccessToken(user._id, user.role);

    const refreshToken = await generatedRefreshToken(user._id, user.role);

    user.refresh_token = refreshToken;
    await user.save();

    await UserModel.findByIdAndUpdate(user._id, {
      last_login_date: new Date(),
    });

    const cookiesOption = authCookieOptions();

    res.cookie("accessToken", accessToken, cookiesOption);

    res.cookie("refreshToken", refreshToken, cookiesOption);

    return res.status(200).json({
      message: "Login successful",
      data: {
        accessToken,
        refreshToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
      },
      success: true,
      error: false,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
      error: true,
      success: false,
    });
  }
}
// LOGOUT
export async function logoutController(req, res) {
  try {
    const userId = req.userId;
    const cookiesOption = authCookieOptions();
    res.clearCookie("accessToken", cookiesOption);
    res.clearCookie("refreshToken", cookiesOption);
    if (userId) {
      await UserModel.findByIdAndUpdate(userId, { refresh_token: "" });
    }
    return res
      .status(200)
      .json({ message: "Logout successful", success: true, error: false });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message, error: true, success: false });
  }
}

export async function userDetailsController(req, res) {
  try {
    const user = await UserModel.findById(req.userId)
      .select("-password -refresh_token -otp")
      .lean();

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
        error: true,
      });
    }

    return res.status(200).json({
      data: user,
      success: true,
      error: false,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
      success: false,
      error: true,
    });
  }
}

export async function updateUserController(req, res) {
  try {
    const { name, bio, avatar, mobile } = req.body;

    const user = await UserModel.findByIdAndUpdate(
      req.userId,
      {
        name,
        bio,
        avatar,
        mobile,
      },
      {
        new: true,
      },
    ).select("-password -refresh_token");

    return res.status(200).json({
      message: "Profile updated",
      data: user,
      success: true,
      error: false,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
      success: false,
      error: true,
    });
  }
}

export async function searchUserController(req, res) {
  try {
    const { search } = req.query;

    const users = await UserModel.find({
      $or: [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
      ],
    })
      .select("name email avatar")
      .limit(20);

    return res.status(200).json({
      data: users,
      success: true,
      error: false,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
      success: false,
      error: true,
    });
  }
}

export async function getPublicUserController(req, res) {
  try {
    const user = await UserModel.findById(req.params.userId).select("name username avatar bio mobile isOnline lastSeen");
    if (!user) return res.status(404).json({ message: "User not found", success: false, error: true });
    return res.json({ data: user, success: true, error: false });
  } catch (error) {
    return res.status(400).json({ message: "Invalid user", success: false, error: true });
  }
}

export async function forgotPasswordController(req, res) {
  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ message: "User not found", error: true, success: false });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await UserModel.findByIdAndUpdate(user._id, {
      otp,
      otpExpiry: Date.now() + 600000,
    });
    await sendEmail({
      sendTo: email,
      subject: "Reset your chatverse password",
      text: `Your OTP is ${otp}`,
      html: verifyEmailTemplate(user.name, otp),
    });
    return res
      .status(200)
      .json({ message: "OTP sent to email", success: true, error: false });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message, error: true, success: false });
  }
}

export async function verifyforgotPasswordOtp(req, res) {
  try {
    const { email, otp } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ message: "User not found", error: true, success: false });
    if (otp !== user.otp)
      return res
        .status(400)
        .json({ message: "Invalid OTP", error: true, success: false });
    if (user.otpExpiry < Date.now())
      return res
        .status(400)
        .json({ message: "OTP expired", error: true, success: false });
    user.otp = null;
    user.otpExpiry = null;
    await user.save();
    return res
      .status(200)
      .json({ message: "OTP verified", success: true, error: false });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message, error: true, success: false });
  }
}

export async function resetPassword(req, res) {
  try {
    const { email, newPassword, confirmPassword } = req.body;
    if (!email || !newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ message: "Provide all fields", error: true, success: false });
    }
    const user = await UserModel.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ message: "User not found", error: true, success: false });
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
        error: true,
        success: false,
      });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    return res.json({
      message: "Password updated",
      success: true,
      error: false,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message, error: true, success: false });
  }
}

export async function refreshToken(req, res) {
  try {
    const token =
      req.cookies.refreshToken || req?.headers?.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "Invalid token", error: true, success: false });
    }
    const verifyToken = jwt.verify(token, process.env.SECRET_KEY_REFRESH_TOKEN);

    // Reject a refresh token that was superseded by a later login or logout.
    const user = await UserModel.findById(verifyToken.id).select("refresh_token");
    if (!user || user.refresh_token !== token) {
      return res.status(401).json({
        message: "Refresh token is no longer valid",
        error: true,
        success: false,
      });
    }

    const newAccessToken = await generatedAccessToken(verifyToken.id);
    const cookiesOption = authCookieOptions();
    res.cookie("accessToken", newAccessToken, cookiesOption);
    return res.json({
      message: "New token generated",
      data: { accessToken: newAccessToken },
      success: true,
      error: false,
    });
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid or expired refresh token",
        error: true,
        success: false,
      });
    }
    return res
      .status(500)
      .json({ message: error.message, error: true, success: false });
  }
}
