import jwt from "jsonwebtoken";
import User from "../models/user.js";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      
      token = req.headers.authorization.split(" ")[1];
      console.log("Token extracted:", token ? "Token exists" : "No token");

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token decoded:", decoded);


      req.user = await User.findById(decoded.id).select("-password");
      console.log("User found:", req.user ? `User ID: ${req.user._id}` : "No user found");

      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      next();
    } catch (error) {
      console.error("Token verification error:", error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    console.error("No authorization header found");
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};
