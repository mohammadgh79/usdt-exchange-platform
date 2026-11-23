import mongoose, { Types } from "mongoose";
import { Decimal } from "decimal.js";

import { Wallet } from "../models/wallet.model.js";
import { Withdraw } from "../models/withdraw.model.js";
import { Transaction } from "../models/transaction.model.js";
import { AppError } from "../utils/AppError.js";

function validateWithdrawAmount(amount: string): Decimal {
  if (typeof amount !== "string" || !/^\d+$/.test(amount)) {
    throw new AppError("مبلغ برداشت معتبر نیست", 400);
  }

  const parsedAmount = new Decimal(amount);

  if (!parsedAmount.isFinite() || parsedAmount.lte(0)) {
    throw new AppError("مبلغ برداشت باید بیشتر از صفر باشد", 400);
  }

  return parsedAmount;
}
function validateIdempotencyKey(key: string): string {
  if (
    typeof key !== "string" ||
    !key.trim() ||
    key.trim().length > 128
  ) {
    throw new AppError("کلید یکتای درخواست معتبر نیست", 400);
  }

  return key.trim();
}

async function getExistingWithdraw(
  userId: Types.ObjectId,
  idempotencyKey: string,
  amount: Decimal,
) {
  const withdraw = await Withdraw.findOne({
    userId,
    idempotencyKey,
  });

  if (!withdraw) {
    return null;
  }

  const existingAmount = new Decimal(withdraw.amountToman.toString());

  if (!existingAmount.eq(amount)) {
    throw new AppError(
      "این کلید قبلاً برای مبلغ دیگری استفاده شده است",
      409,
    );
  }

  const [wallet, transaction] = await Promise.all([
    Wallet.findOne({ userId }),
    Transaction.findById(withdraw.transactionId),
  ]);

  if (!wallet || !transaction) {
    throw new AppError("اطلاعات درخواست برداشت ناقص است", 500);
  }

  return {
    wallet,
    withdraw,
    transaction,
  };
}
export async function createWithdraw(
  userId: Types.ObjectId,
  amountToman: string,
  idempotencyKey: string,
) {
  const amount = validateWithdrawAmount(amountToman);
  const key = validateIdempotencyKey(idempotencyKey);

  const existingWithdraw = await getExistingWithdraw(
    userId,
    key,
    amount,
  );

  if (existingWithdraw) {
    return existingWithdraw;
  }

}