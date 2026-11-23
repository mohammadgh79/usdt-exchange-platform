
import type { Response } from "express";
import { Types } from "mongoose";

import type { AuthRequest } from "../middlewares/auth.middlewares.js";

import {
  getUsdtPrice,
  getPriceHistory,
} from "../services/price.service.js";

import { buyUsdt } from "../services/buy.service.js";
import { sellUsdt } from "../services/sell.service.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

/**
 * Buys USDT for the authenticated user.
 *
 * Business logic is handled by buy.service.ts.
 *
 * @route POST /buy
 */
export const buy = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("دسترسی غیرمجاز", 401);
    }

    const userId = new Types.ObjectId(req.user.id);

    const { amount, idempotencyKey } = req.body;

    const result = await buyUsdt(
      amount,
      userId,
      idempotencyKey,
    );

    if (!result?.order) {
      throw new AppError("نتیجه خرید معتبر نیست", 500);
    }

    const isRejected = result.order.status === "REJECTED";

    res.status(isRejected ? 409 : 201).json({
      success: !isRejected,
      message: isRejected
        ? "موجودی کیف پول برای خرید کافی نیست"
        : "خرید با موفقیت انجام شد",
      data: result,
    });
  },
);


 
 
   
 
export const sell = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("دسترسی غیرمجاز", 401);
    }

    const userId = new Types.ObjectId(req.user.id);

    const { amount, idempotencyKey } = req.body;

    const result = await sellUsdt(
      amount,
      userId,
      idempotencyKey,
    );

    if (!result?.order) {
      throw new AppError("نتیجه فروش معتبر نیست", 500);
    }

    const isRejected = result.order.status === "REJECTED";

    res.status(isRejected ? 409 : 201).json({
      success: !isRejected,
      message: isRejected
        ? "موجودی تتر برای فروش کافی نیست"
        : "فروش با موفقیت انجام شد",
      data: result,
    });
  },
);


export const getPrice = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const price = await getUsdtPrice();

    res.json({ price });
  },
);


export const getPriceHistoryController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const history = await getPriceHistory();

    res.json({ history });
  },
);
