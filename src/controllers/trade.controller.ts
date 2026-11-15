
import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middlewares.js";

import { Wallet } from "../models/wallet.model.js";
import { Transaction } from "../models/transaction.model.js";
import { Order } from "../models/order.model.js";

import {
  getUsdtPrice,
  getPriceHistory,
} from "../services/price.service.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

import mongoose, { Types } from "mongoose";

/**
 * Fee percentage applied when buying USDT.
 */
const BUY_FEE_PERCENT = 1.5;

/**
 * Fee percentage applied when selling USDT.
 */
const SELL_FEE_PERCENT = 0.99;

/**
 * Tax percentage applied to the total order amount.
 */
const TAX_PERCENT = 10;


/**
 * Buys USDT for the authenticated user.
 *
 * Updates the wallet and creates an Order and Transaction
 * atomically using a MongoDB transaction.
 *
 * @route POST /buy
 */
export const buy = asyncHandler(async (req: AuthRequest, res: Response) => {

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
  const fee = total * (BUY_FEE_PERCENT / 100);
  const tax = total * (TAX_PERCENT / 100);
  const finalAmount = total + fee + tax;

  const session = await mongoose.startSession();

  const orderId = new Types.ObjectId();
  const transactionId = new Types.ObjectId();

  try {
    const result = await session.withTransaction(async () => {

      const wallet = await Wallet.findOne({ userId }).session(session);

      if (!wallet) {
        throw new AppError("کیف پول پیدا نشد", 404);
      }

      if (wallet.amountRial < finalAmount) {
        throw new AppError("موجودی تومانی کافی نیست", 400);
      }

      wallet.amountRial -= finalAmount;
      wallet.amountUSDT += amount;
      wallet.transactions.push(transactionId);

      await wallet.save({ session });

      const [order] = await Order.create(
        [{
          _id: orderId,
          userId,
          type: "BUY",
          status: "COMPLETED",
          amount,
          price,
          total,
          feeRate: BUY_FEE_PERCENT,
          fee,
          taxRate: TAX_PERCENT,
          tax,
          finalAmount,
          transactionId,
        }],
        { session }
      );

      const [transaction] = await Transaction.create(
        [{
          _id: transactionId,
          userId,
          type: "BUY",
          status: "COMPLETED",
          amountUSDT: amount,
          amountRial: finalAmount,
          orderId,
        }],
        { session }
      );

      return { wallet, order, transaction };
    });

    res.status(201).json(result);

  } finally {
    await session.endSession();
  }
});


/**
 * Sells USDT for the authenticated user.
 *
 * Updates the wallet and creates an Order and Transaction
 * atomically using a MongoDB transaction.
 *
 * @route POST /sell
 */
export const sell = asyncHandler(async (req: AuthRequest, res: Response) => {

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

  const session = await mongoose.startSession();

  const orderId = new Types.ObjectId();
  const transactionId = new Types.ObjectId();

  try {
    const result = await session.withTransaction(async () => {

      const wallet = await Wallet.findOne({ userId }).session(session);

      if (!wallet) {
        throw new AppError("کیف پول پیدا نشد", 404);
      }

      if (wallet.amountUSDT < amount) {
        throw new AppError("موجودی تتر کافی نیست", 400);
      }

      wallet.amountUSDT -= amount;
      wallet.amountRial += finalAmount;
      wallet.transactions.push(transactionId);

      await wallet.save({ session });

      const [order] = await Order.create(
        [{
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
        }],
        { session }
      );

      const [transaction] = await Transaction.create(
        [{
          _id: transactionId,
          userId,
          type: "SELL",
          status: "COMPLETED",
          amountUSDT: amount,
          amountRial: finalAmount,
          orderId,
        }],
        { session }
      );

      return { wallet, order, transaction };
    });

    res.status(201).json(result);

  } finally {
    await session.endSession();
  }
});


/**
 * Returns the current USDT price.
 *
 * @route GET /price
 */
export const getPrice = asyncHandler(
  async (req: AuthRequest, res: Response) => {

    const price = await getUsdtPrice();

    res.json({ price });

  }
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

  }
);
