import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middlewares.js";
export const adminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      message: "ابتدا باید وارد حساب کاربری شوید.",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "شما دسترسی لازم برای انجام این عملیات را ندارید.",
    });
  }

  next();
};