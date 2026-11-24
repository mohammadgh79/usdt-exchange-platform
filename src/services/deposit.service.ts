import mongoose, { Types } from "mongoose";
import { Decimal } from "decimal.js";
import { Deposit } from "../models/deposit.model.js";
import { Wallet } from "../models/wallet.model.js";
import { Transaction } from "../models/transaction.model.js";
import { AppError } from "../utils/AppError.js";
import { getTransactionLimits } from "./transaction-limit.service.js";
function validateDepositAmount(amount: string): Decimal {
  if (
    typeof amount !== "string" ||
    !/^\d+$/.test(amount)
  ) {
    throw new AppError("مبلغ واریز معتبر نیست", 400);
  }

  const parsedAmount = new Decimal(amount);

  if (!parsedAmount.isFinite() || parsedAmount.lte(0)) {
    throw new AppError("مبلغ واریز باید بیشتر از صفر باشد", 400);
  }

  return parsedAmount;
}

export async function createDeposit(
  userId: Types.ObjectId,
  amountToman: string,
) {
  const parsedAmount = validateDepositAmount(amountToman);
  const limits = await getTransactionLimits();

const minDepositAmount = new Decimal(
  limits.depositMinToman.toString()
);

const maxDepositAmount = new Decimal(
  limits.depositMaxToman.toString()
);

if (parsedAmount.lt(minDepositAmount)) {
  throw new AppError(
    `حداقل مبلغ واریز ${minDepositAmount.toString()} تومان است`,
    400
  );
}

if (parsedAmount.gt(maxDepositAmount)) {
  throw new AppError(
    `حداکثر مبلغ واریز ${maxDepositAmount.toString()} تومان است`,
    400
  );
}

  const amount128 = Types.Decimal128.fromString(
    parsedAmount.toString(),
  );

  const zero128 = Types.Decimal128.fromString("0");

  const depositId = new Types.ObjectId();
  const transactionId = new Types.ObjectId();

  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const wallet = await Wallet.findOne({ userId }).session(session);

      if (!wallet) {
        throw new AppError("کیف پول کاربر پیدا نشد", 404);
      }

      const walletAmount = new Decimal(wallet.amountToman.toString());
      const newBalance = walletAmount.plus(parsedAmount);

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
  } finally {
    await session.endSession();
  }
}