import mongoose, { Types } from "mongoose";
import { Decimal } from "decimal.js";
import { Wallet } from "../models/wallet.model.js";
import { Order } from "../models/order.model.js";
import { Transaction } from "../models/transaction.model.js";
import { AppError } from "../utils/AppError.js";
import { getUsdtPrice } from "./price.service.js";
import { getTransactionLimits } from "./transaction-limit.service.js";

const BUY_FEE_PERCENT = 1.5;
const TAX_PERCENT = 10;

function toDecimal128(value: Decimal): Types.Decimal128 {
  return Types.Decimal128.fromString(value.toString());
}

function toTomanDecimal(value: Decimal): Decimal {
  return value.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
}

function validateAmount(amount: string): Decimal {
  if (
    typeof amount !== "string" ||
    !/^\d+(\.\d{1,6})?$/.test(amount)
  ) {
    throw new AppError("مقدار USDT معتبر نیست", 400);
  }

  const parsedAmount = new Decimal(amount);

  if (!parsedAmount.isFinite() || parsedAmount.lte(0)) {
    throw new AppError("مقدار USDT باید بیشتر از صفر باشد", 400);
  }

  return parsedAmount;
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

  const existingAmount = new Decimal(existingOrder.amount.toString());

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
    throw new AppError("کیف پول پیدا نشد", 404);
  }

  return {
    wallet,
    order: existingOrder,
    transaction,
  };
}

export async function buyUsdt(
  amount: string,
  userId: Types.ObjectId,
  idempotencyKey: string,
) {
  const amountDecimal = validateAmount(amount);
  const validIdempotencyKey = validateIdempotencyKey(idempotencyKey);

  const existingResult = await getExistingOrder(
    userId,
    validIdempotencyKey,
    amountDecimal,
  );

  if (existingResult) {
    return existingResult;
  }
  const limits = await getTransactionLimits();

const minBuyAmount = new Decimal(limits.buyMinUSDT.toString());
const maxBuyAmount = new Decimal(limits.buyMaxUSDT.toString());

if (amountDecimal.lt(minBuyAmount)) {
  throw new AppError(
    `حداقل مقدار خرید ${minBuyAmount.toString()} USDT است`,
    400
  );
}

if (amountDecimal.gt(maxBuyAmount)) {
  throw new AppError(
    `حداکثر مقدار خرید ${maxBuyAmount.toString()} USDT است`,
    400
  );
}

  const priceValue = await getUsdtPrice();
  const priceDecimal = new Decimal(String(priceValue));

  if (!priceDecimal.isFinite() || priceDecimal.lte(0)) {
    throw new AppError("قیمت USDT معتبر نیست", 500);
  }

  const total = toTomanDecimal(amountDecimal.mul(priceDecimal));

  const fee = toTomanDecimal(
    total.mul(BUY_FEE_PERCENT).div(100),
  );

  const tax = toTomanDecimal(
    total.mul(TAX_PERCENT).div(100),
  );

  const finalAmount = total.plus(fee).plus(tax);

  const amount128 = toDecimal128(amountDecimal);
  const price128 = toDecimal128(priceDecimal);
  const total128 = toDecimal128(total);
  const fee128 = toDecimal128(fee);
  const tax128 = toDecimal128(tax);
  const finalAmount128 = toDecimal128(finalAmount);

  const negativeFinalAmount128 = toDecimal128(
    finalAmount.negated(),
  );

  const session = await mongoose.startSession();

  const orderId = new Types.ObjectId();
  const transactionId = new Types.ObjectId();

  try {
    const result = await session.withTransaction(async () => {
      const currentWallet = await Wallet.findOne({ userId }).session(
        session,
      );

      if (!currentWallet) {
        throw new AppError("کیف پول پیدا نشد", 404);
      }

      const updatedWallet = await Wallet.findOneAndUpdate(
        {
          userId,
          amountToman: { $gte: finalAmount128 },
        },
        {
          $inc: {
            amountToman: negativeFinalAmount128,
            amountUSDT: amount128,
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

      if (!updatedWallet) {
        const [order] = await Order.create(
          [
            {
              _id: orderId,
              userId,
              type: "BUY",
              status: "REJECTED",
              amount: amount128,
              price: price128,
              total: total128,
              feeRate: BUY_FEE_PERCENT,
              fee: fee128,
              taxRate: TAX_PERCENT,
              tax: tax128,
              finalAmount: finalAmount128,
              transactionId,
              idempotencyKey: validIdempotencyKey,
            },
          ],
          { session },
        );

        const [transaction] = await Transaction.create(
          [
            {
              _id: transactionId,
              userId,
              type: "BUY",
              status: "REJECTED",
              amountUSDT: amount128,
              amountToman: finalAmount128,
              orderId,
            },
          ],
          { session },
        );

        return {
          wallet: currentWallet,
          order,
          transaction,
        };
      }

      const [order] = await Order.create(
        [
          {
            _id: orderId,
            userId,
            type: "BUY",
            status: "COMPLETED",
            amount: amount128,
            price: price128,
            total: total128,
            feeRate: BUY_FEE_PERCENT,
            fee: fee128,
            taxRate: TAX_PERCENT,
            tax: tax128,
            finalAmount: finalAmount128,
            transactionId,
            idempotencyKey: validIdempotencyKey,
          },
        ],
        { session },
      );

      const [transaction] = await Transaction.create(
        [
          {
            _id: transactionId,
            userId,
            type: "BUY",
            status: "COMPLETED",
            amountUSDT: amount128,
            amountToman: finalAmount128,
            orderId,
          },
        ],
        { session },
      );

      return {
        wallet: updatedWallet,
        order,
        transaction,
      };
    });

    return result;
  } catch (error: unknown) {
    if (isIdempotencyDuplicateError(error)) {
      const duplicateResult = await getExistingOrder(
        userId,
        validIdempotencyKey,
        amountDecimal,
      );

      if (duplicateResult) {
        return duplicateResult;
      }
    }

    throw error;
  } finally {
    await session.endSession();
  }
}