import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    const token =
      req.cookies?.accessToken ||
      (authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null);

    if (!token) {
      return res.status(401).json({
        message: "Provide token",
        error: true,
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.SECRET_KEY_ACCESS_TOKEN
    );

    req.userId = decoded.id;

    next();
  } catch (error) {
    console.log("AUTH ERROR:", error.message);

    return res.status(401).json({
      message: "Invalid token",
      error: true,
    });
  }
};

export default auth;