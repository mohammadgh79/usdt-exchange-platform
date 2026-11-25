
import mongoose, { Types } from "mongoose";
import { Decimal } from "decimal.js";

import { Deposit } from "../models/deposit.model.js";
import { Wallet } from "../models/wallet.model.js";
import { Transaction } from "../models/transaction.model.js";
import { AppError } from "../utils/AppError.js";
import { getTransactionLimits } from "./transaction-limit.service.js";

function validateDepositAmount(amount: string): Decimal {
  if (typeof amount !== "string" || !/^\d+$/.test(amount)) {
    throw new AppError("Invalid deposit amount", 400);
  }

  const parsedAmount = new Decimal(amount);

  if (!parsedAmount.isFinite() || parsedAmount.lte(0)) {
    throw new AppError("Deposit amount must be greater than zero", 400);
  }

  return parsedAmount;
}

function validateIdempotencyKey(key: string): string {
  if (
    typeof key !== "string" ||
    !key.trim() ||
    key.trim().length > 128
  ) {
    throw new AppError("Invalid idempotency key", 400);
  }

  return key.trim();
}

async function getExistingDeposit(
  userId: Types.ObjectId,
  idempotencyKey: string,
  amount: Decimal,
) {
  const deposit = await Deposit.findOne({
    userId,
    idempotencyKey,
  });

  if (!deposit) {
    return null;
  }

  const existingAmount = new Decimal(deposit.amountToman.toString());

  if (!existingAmount.eq(amount)) {
    throw new AppError(
      "This idempotency key was already used for another amount",
      409,
    );
  }

  const [wallet, transaction] = await Promise.all([
    Wallet.findOne({ userId }),
    Transaction.findById(deposit.transactionId),
  ]);

  if (!wallet || !transaction) {
    throw new AppError("Incomplete deposit information", 500);
  }

  return {
    wallet,
    deposit,
    transaction,
  };
}

export async function createDeposit(
  userId: Types.ObjectId,
  amountToman: string,
  idempotencyKey: string,
) {
  const amount = validateDepositAmount(amountToman);
  const key = validateIdempotencyKey(idempotencyKey);

  const existingDeposit = await getExistingDeposit(
    userId,
    key,
    amount,
  );

  if (existingDeposit) {
    return existingDeposit;
  }

  const limits = await getTransactionLimits();

  const minDepositAmount = new Decimal(
    limits.depositMinToman.toString(),
  );

  const maxDepositAmount = new Decimal(
    limits.depositMaxToman.toString(),
  );

  if (amount.lt(minDepositAmount)) {
    throw new AppError(
      `Minimum deposit amount is ${minDepositAmount.toString()} Toman`,
      400,
    );
  }

  if (amount.gt(maxDepositAmount)) {
    throw new AppError(
      `Maximum deposit amount is ${maxDepositAmount.toString()} Toman`,
      400,
    );
  }

  const amount128 = Types.Decimal128.fromString(amount.toString());
  const zero128 = Types.Decimal128.fromString("0");

  const depositId = new Types.ObjectId();
  const transactionId = new Types.ObjectId();

  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const wallet = await Wallet.findOne({ userId }).session(session);

      if (!wallet) {
        throw new AppError("Wallet not found", 404);
      }

      const walletAmount = new Decimal(wallet.amountToman.toString());
      const newBalance = walletAmount.plus(amount);

      wallet.amountToman = Types.Decimal128.fromString(
        newBalance.toString(),
      );

      wallet.transactions.push(transactionId);

      await wallet.save({ session });

      const [transaction] = await Transaction.create(
        [
          {
            _id: transactionId,
            userId,
            type: "DEPOSIT",
            status: "COMPLETED",
            amountToman: amount128,
            amountUSDT: zero128,
            depositId,
          },
        ],
        { session },
      );

      const [deposit] = await Deposit.create(
        [
          {
            _id: depositId,
            userId,
            amountToman: amount128,
            transactionId,
            idempotencyKey: key,
            status: "COMPLETED",
          },
        ],
        { session },
      );

      return {
        wallet,
        deposit,
        transaction,
      };
    });

    return result;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000 &&
      "keyPattern" in error &&
      typeof error.keyPattern === "object" &&
      error.keyPattern !== null &&
      "userId" in error.keyPattern &&
      "idempotencyKey" in error.keyPattern
    ) {
      const existing = await getExistingDeposit(
        userId,
        key,
        amount,
      );

      if (existing) {
        return existing;
      }
    }

    throw error;
  } finally {
    await session.endSession();
  }
}
