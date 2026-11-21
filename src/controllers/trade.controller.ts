
import type { Response } from "express";
import { Types } from "mongoose";

import type { AuthRequest } from "../middlewares/auth.middlewares.js";

import { Wallet } from "../models/wallet.model.js";
import { Transaction } from "../models/transaction.model.js";
import { Order } from "../models/order.model.js";

import {
  getUsdtPrice,
  getPriceHistory,
} from "../services/price.service.js";

import { buyUsdt } from "../services/buy.service.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

const SELL_FEE_PERCENT = 0.99;
const TAX_PERCENT = 10;

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

/**
 * Sells USDT for the authenticated user.
 *
 * @route POST /sell
 */
export const sell = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("دسترسی غیرمجاز", 401);
    }

    const userId = new Types.ObjectId(req.user.id);
    const { amount } = req.body;

    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new AppError("مقدار واردشده معتبر نیست", 400);
    }

    const price = await getUsdtPrice();

    const total = amount * price;
    const fee = total * (SELL_FEE_PERCENT / 100);
    const tax = total * (TAX_PERCENT / 100);
    const finalAmount = total - fee - tax;

    const session = await Types.ObjectId.createFromTime
      ? await import("mongoose").then((m) => m.default.startSession())
      : null;

    if (!session) {
      throw new AppError("ایجاد نشست دیتابیس ناموفق بود", 500);
    }

    const orderId = new Types.ObjectId();
    const transactionId = new Types.ObjectId();

    try {
      const result = await session.withTransaction(async () => {
        const wallet = await Wallet.findOne({ userId }).session(session);

        if (!wallet) {
          throw new AppError("کیف پول پیدا نشد", 404);
        }

        if (Number(wallet.amountUSDT.toString()) < amount) {
          throw new AppError("موجودی تتر کافی نیست", 400);
        }

        wallet.amountUSDT = Types.Decimal128.fromString(
          (
            Number(wallet.amountUSDT.toString()) - amount
          ).toString(),
        );

        wallet.amountToman = Types.Decimal128.fromString(
          (
            Number(wallet.amountToman.toString()) + finalAmount
          ).toString(),
        );

        wallet.transactions.push(transactionId);

        await wallet.save({ session });

        const [order] = await Order.create(
          [
            {
              _id: orderId,
              userId,
              type: "SELL",
              status: "COMPLETED",
              amount,
              price,
              total,
              feeRate: SELL_FEE_PERCENT,
              fee,
              taxRate: TAX_PERCENT,
              tax,
              finalAmount,
              transactionId,
            },
          ],
          { session },
        );

        const [transaction] = await Transaction.create(
          [
            {
              _id: transactionId,
              userId,
              type: "SELL",
              status: "COMPLETED",
              amountUSDT: amount,
              amountToman: finalAmount,
              orderId,
            },
          ],
          { session },
        );

        return { wallet, order, transaction };
      });

      res.status(201).json(result);
    } finally {
      await session.endSession();
    }
  },
);

/**
 * Returns the current USDT price.
 *
 * @route GET /price
 */
export const getPrice = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const price = await getUsdtPrice();

    res.json({ price });
  },
);

/**
 * Returns the stored USDT price history.
 *
 * @route GET /price/history
 */
export const getPriceHistoryController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const history = await getPriceHistory();

    res.json({ history });
  },
);
