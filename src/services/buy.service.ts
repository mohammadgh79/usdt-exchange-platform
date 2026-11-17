
import mongoose, { Types } from "mongoose";

import { Wallet } from "../models/wallet.model.js";
import { Order } from "../models/order.model.js";
import { Transaction } from "../models/transaction.model.js";

import { AppError } from "../utils/AppError.js";
import { getUsdtPrice } from "./price.service.js";

const BUY_FEE_PERCENT = 1.5;
const TAX_PERCENT = 10;

function isIdempotencyDuplicateError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const mongoError = error as {
    code?: unknown;
    keyPattern?: Record<string, unknown>;
  };

  return (
    mongoError.code === 11000 &&
    mongoError.keyPattern?.userId === 1 &&
    mongoError.keyPattern?.idempotencyKey === 1
  );
}

export async function buyUsdt(
  amount: number,
  userId: Types.ObjectId,
  idempotencyKey: string
) {
  // 1. Validate input
  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new AppError("مقدار وارد شده معتبر نیست", 400);
  }

  if (
  typeof idempotencyKey !== "string" ||
  !idempotencyKey.trim() ||
  idempotencyKey.trim().length > 128
) {
  throw new AppError("کلید یکتا معتبر نیست", 400);
}


  idempotencyKey = idempotencyKey.trim();

  // 2. Check for an existing request
  const existingOrder = await Order.findOne({
    userId,
    idempotencyKey,
  });

  if (existingOrder) {
    if (existingOrder.amount !== amount) {
      throw new AppError(
        "این کلید قبلاً برای درخواست دیگری استفاده شده است",
        409
      );
    }

    const transaction = await Transaction.findById(
      existingOrder.transactionId
    );
    if (!transaction) {
  throw new AppError(
    "تراکنش مربوط به این سفارش پیدا نشد",
    500
  );
}
const wallet = await Wallet.findOne({ userId });

if (!wallet) {
  throw new AppError("Wallet not found", 404);
}

    return {
  wallet,
  order: existingOrder,
  transaction,
};
  }

  // 3. Calculate purchase amounts
  const price = await getUsdtPrice();

  const total = amount * price;
  const fee = total * (BUY_FEE_PERCENT / 100);
  const tax = total * (TAX_PERCENT / 100);
  const finalAmount = total + fee + tax;

  // 4. Create session and document IDs
  const session = await mongoose.startSession();

  const orderId = new Types.ObjectId();
  const transactionId = new Types.ObjectId();

  try {
    // 5. Start database transaction
    const result = await session.withTransaction(async () => {
      // 6. Atomic wallet update
      const wallet = await Wallet.findOneAndUpdate(
        {
          userId,
          amountToman: { $gte: finalAmount },
        },
        {
          $inc: {
            amountToman: -finalAmount,
            amountUSDT: amount,
          },
          $push: {
            transactions: transactionId,
          },
        },
        {
          session,
          new: true,
        }
      );

      // 7. Handle missing wallet or insufficient balance
      if (!wallet) {
        const wallet = await Wallet.findOne({ userId }).session(session);

if (!wallet) {
  throw new AppError("Wallet not found", 404);
}

        // 8. Create rejected order
        const [order] = await Order.create(
          [
            {
              _id: orderId,
              userId,
              type: "BUY",
              status: "REJECTED",
              amount,
              price,
              total,
              feeRate: BUY_FEE_PERCENT,
              fee,
              taxRate: TAX_PERCENT,
              tax,
              finalAmount,
              idempotencyKey,
              transactionId,
            },
          ],
          { session }
        );

        // 9. Create rejected transaction
        const [transaction] = await Transaction.create(
          [
            {
              _id: transactionId,
              userId,
              type: "BUY",
              status: "REJECTED",
              amountUSDT: amount,
              amountToman: finalAmount,
              orderId,
            },
          ],
          { session }
        );

        return { wallet,order, transaction };
      }

      // 10. Create completed order
      const [order] = await Order.create(
        [
          {
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
            idempotencyKey,
            transactionId,
          },
        ],
        { session }
      );

      // 11. Create completed transaction
      const [transaction] = await Transaction.create(
        [
          {
            _id: transactionId,
            userId,
            type: "BUY",
            status: "COMPLETED",
            amountUSDT: amount,
            amountToman: finalAmount,
            orderId,
          },
        ],
        { session }
      );

      return { wallet, order, transaction };
    });

    return result;
  } catch (error: unknown) {
    // 12. Handle duplicate idempotency key
    if (isIdempotencyDuplicateError(error)) {
      const existingOrder = await Order.findOne({
        userId,
        idempotencyKey,
      });

      if (existingOrder) {
        if (existingOrder.amount !== amount) {
          throw new AppError(
            "این کلید قبلاً برای درخواست دیگری استفاده شده است",
            409
          );
        }

        const transaction = await Transaction.findById(
          existingOrder.transactionId,
           
        );
        if (!transaction) {
           throw new AppError(
          "تراکنش مربوط به این سفارش پیدا نشد",
          500
        );
      }
      const wallet = await Wallet.findOne({ userId });

if (!wallet) {
  throw new AppError("Wallet not found", 404);
}

        return {
          wallet,
          order: existingOrder,
          transaction,
        };
      }
    }

    throw error;
  } finally {
    // 13. Always close the session
    await session.endSession();
  }
}
