import type { Response } from "express";
import { Types } from "mongoose";

import type { AuthRequest } from "../middlewares/auth.middlewares.js";
import { createWithdraw } from "../services/withdraw.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const withdraw = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const userId = new Types.ObjectId(req.user.id);

    const { amountToman, idempotencyKey } = req.body;

    const result = await createWithdraw(
      userId,
      amountToman,
      idempotencyKey,
    );

    const isRejected = result.withdraw.status === "REJECTED";

    res.status(isRejected ? 409 : 201).json({
      success: !isRejected,
      message: isRejected
        ? "Insufficient wallet balance"
        : "Withdrawal completed successfully",
      data: result,
    });
  },
);