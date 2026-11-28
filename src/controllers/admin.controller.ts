
import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middlewares.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

import {
  getTransactionLimits,
  updateTransactionLimits,
} from "../services/transaction-limit.service.js";

export const getAdminTransactionLimits = asyncHandler(
  async (_req: AuthRequest, res: Response) => {
    const limits = await getTransactionLimits();

    res.json({
      limits,
    });
  },
);

export const updateAdminTransactionLimits = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("دسترسی غیرمجاز", 401);
    }

    const limits = await updateTransactionLimits(req.body);

    if (!limits) {
      throw new AppError(
        "به‌روزرسانی محدودیت‌ها انجام نشد",
        500,
      );
    }

    res.json({
      message: "محدودیت‌های تراکنش با موفقیت به‌روزرسانی شدند",
      limits,
    });
  },
);
