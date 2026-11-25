import type { Response } from "express";
import { Types } from "mongoose";

import type { AuthRequest } from "../middlewares/auth.middlewares.js";
import { createDeposit } from "../services/deposit.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const deposit = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const userId = new Types.ObjectId(req.user.id);

    const { amountToman, idempotencyKey } = req.body;

    const result = await createDeposit(
      userId,
      amountToman,
      idempotencyKey,
    );

    res.status(201).json({
      success: true,
      message: "Deposit completed successfully",
      data: result,
    });
  },
);