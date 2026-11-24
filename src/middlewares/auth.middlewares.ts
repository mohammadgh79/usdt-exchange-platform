import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: "user" | "admin";
  };
}


export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "دسترسی غیرمجاز، توکن ارسال نشده" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "توکن نامعتبر است" });
    }

    const secret = process.env.JWT_SECRET as string;

    const decoded = jwt.verify(token, secret) as unknown as { id: string };
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "کاربر یافت نشد" });
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (error) {
    res.status(401).json({ message: "توکن نامعتبر یا منقضی‌شده" });
  }
};
