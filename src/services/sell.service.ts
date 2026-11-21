import mongoose, { Types } from "mongoose";
import { Decimal } from "decimal.js";

import { Wallet } from "../models/wallet.model.js";
import { Order } from "../models/order.model.js";
import { Transaction } from "../models/transaction.model.js";

import { AppError } from "../utils/AppError.js";
import { getUsdtPrice } from "./price.service.js";

const SELL_FEE_PERCENT = 0.99;
const TAX_PERCENT = 10;

function toDecimal128(value: Decimal): Types.Decimal128 {
  return Types.Decimal128.fromString(value.toString());
}

function toTomanDecimal(value: Decimal): Decimal {
  return value.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
}
function validateIdempotencyKey(key: string): string {
  if (
    typeof key !== "string" ||
    !key.trim() ||
    key.trim().length > 128
  ) {
    throw new AppError("کلید یکتا معتبر نیست", 400);
  }

  return key.trim();
}
function validateAmount(amount: string): Decimal {
  if (
    typeof amount !== "string" ||
    !/^\d+(\.\d{1,6})?$/.test(amount)  ) {
    throw new AppError("مقدار USDT معتبر نیست", 400);
  }

  const parsedAmount = new Decimal(amount);

  if (!parsedAmount.isFinite() || parsedAmount.lte(0)) {
    throw new AppError("مقدار USDT باید بیشتر از صفر باشد", 400);
  }

  return parsedAmount;
}
async function getExistingOrder(
  userId: Types.ObjectId,
  idempotencyKey: string,
  amount: Decimal,
) {
  const existingOrder = await Order.findOne({
    userId,
    idempotencyKey,
  });

  if (!existingOrder) {
    return null;
  }

  if (existingOrder.type !== "SELL") {
    throw new AppError(
      "این کلید قبلاً برای نوع دیگری از درخواست استفاده شده است",
      409,
    );
  }

  const existingAmount = new Decimal(
    existingOrder.amount.toString(),
  );

  if (!existingAmount.eq(amount)) {
    throw new AppError(
      "این کلید قبلاً برای درخواست دیگری استفاده شده است",
      409,
    );
  }

  const transaction = await Transaction.findById(
    existingOrder.transactionId,
  );

  if (!transaction) {
    throw new AppError("تراکنش مربوط به این سفارش پیدا نشد", 500);
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
export async function sellUsdt(
  amount: string,
  userId: Types.ObjectId,
  idempotencyKey: string
) {  
const amountDecimal = validateAmount(amount);
const validKey = validateIdempotencyKey(idempotencyKey);

const existingResult = await getExistingOrder(
  userId,
  validKey,
  amountDecimal,
);

if (existingResult) {
  return existingResult;
}

// دریافت قیمت
const price = await getUsdtPrice();
const priceDecimal = new Decimal(price);

if (!priceDecimal.isFinite() || priceDecimal.lte(0)) {
  throw new AppError("قیمت تتر معتبر نیست", 500);
}

// محاسبات مالی
const total = toTomanDecimal(
  amountDecimal.mul(priceDecimal),
);

const fee = toTomanDecimal(
  total.mul(SELL_FEE_PERCENT).div(100),
);

const tax = toTomanDecimal(
  total.mul(TAX_PERCENT).div(100),
);

const finalAmount = total.minus(fee).minus(tax);
// تبدیل مقادیر به Decimal128
const amount128 = toDecimal128(amountDecimal);
const price128 = toDecimal128(priceDecimal);
const total128 = toDecimal128(total);
const fee128 = toDecimal128(fee);
const tax128 = toDecimal128(tax);
const finalAmount128 = toDecimal128(finalAmount);

// برای کم کردن USDT از کیف پول
const negativeAmount128 = toDecimal128(
  amountDecimal.negated(),
);

// ساخت شناسه‌ها قبل از شروع تراکنش
const orderId = new Types.ObjectId();
const transactionId = new Types.ObjectId();

// شروع Session
const session = await mongoose.startSession();

try {
  const result = await session.withTransaction(async () => {
    const currentWallet = await Wallet.findOne({ userId }).session(session);

    if (!currentWallet) {
      throw new AppError("کیف پول پیدا نشد", 404);
    }

    const updatedWallet = await Wallet.findOneAndUpdate(
      {
        userId,
        amountUSDT: { $gte: amount128 },
      },
      {
        $inc: {
          amountUSDT: negativeAmount128,
          amountToman: finalAmount128,
        },
        $push: {
          transactions: transactionId,
        },
      },
      {
        session,
        new: true,
      },
    );

    const status = updatedWallet ? "COMPLETED" : "REJECTED";

    // ساخت Order
    const [order] = await Order.create(
  [
    {
      _id: orderId,
      userId,
      type: "SELL",
      status,
      amount: amount128,
      price: price128,
      total: total128,
      feeRate: SELL_FEE_PERCENT,
      fee: fee128,
      taxRate: TAX_PERCENT,
      tax: tax128,
      finalAmount: finalAmount128,
      transactionId,
      idempotencyKey: validKey,
    },
  ],
  { session },
);

    // ساخت Transaction
    const transaction = new Transaction({
      _id: transactionId,
      userId,
      type: "SELL",
      status,
      amountToman: finalAmount128,
      amountUSDT: amount128,
      orderId,
    });

    await transaction.save({ session });

    return {
      wallet: updatedWallet ?? currentWallet,
      order,
      transaction,
    };
  });

  return result;
} finally {
  await session.endSession();
}
}