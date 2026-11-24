import mongoose, { Types } from "mongoose";
import { Decimal } from "decimal.js";

import { Wallet } from "../models/wallet.model.js";
import { Withdraw } from "../models/withdraw.model.js";
import { Transaction } from "../models/transaction.model.js";
import { AppError } from "../utils/AppError.js";
import { getTransactionLimits } from "./transaction-limit.service.js";

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
  const limits = await getTransactionLimits();

const minWithdrawAmount = new Decimal(
  limits.withdrawMinToman.toString()
);

const maxWithdrawAmount = new Decimal(
  limits.withdrawMaxToman.toString()
);

if (amount.lt(minWithdrawAmount)) {
  throw new AppError(
    `حداقل مبلغ برداشت ${minWithdrawAmount.toString()} تومان است`,
    400
  );
}

if (amount.gt(maxWithdrawAmount)) {
  throw new AppError(
    `حداکثر مبلغ برداشت ${maxWithdrawAmount.toString()} تومان است`,
    400
  );
}
  
const amount128 = Types.Decimal128.fromString(amount.toString());
const negativeAmount128 = Types.Decimal128.fromString(
  amount.neg().toString()
);

const zero128 = Types.Decimal128.fromString("0");
const withdrawId = new Types.ObjectId();
const transactionId = new Types.ObjectId();
const session = await mongoose.startSession();
try{
  const result = await session.withTransaction(async()=>{
    const currentwallet= await Wallet.findOne({
      userId,
    }).session(session)
    if(!currentwallet){
      throw new AppError("کیف پول پیدا نشد ",404) 
    }
    const updateWallet = await Wallet.findOneAndUpdate(
  {
    userId,
    amountToman: { $gte: amount128 },
  },
  {
    $inc: {
      amountToman: negativeAmount128,
    },
  },
  {
    session,
    new: true,
  },
);
let withdrawStatus: "COMPLETED" | "REJECTED";

if (!updateWallet) {
  withdrawStatus = "REJECTED";
} else {
  withdrawStatus = "COMPLETED";
}

const withdraw = new Withdraw({
_id:withdrawId,
userId:userId,
amountToman:amount128,
status:withdrawStatus,
transactionId:transactionId,
idempotencyKey:key,

});
await withdraw.save({ session });
const transaction = new Transaction({
_id:transactionId,
userId:userId,
type:"WITHDRAW",
status:withdrawStatus,
amountToman:amount128,
amountUSDT:zero128,
withdrawalId:withdrawId,
});
  await transaction.save({ session });
  const finalWallet = await Wallet.findByIdAndUpdate(
  currentwallet._id,
  {
    $push: {
      transactions: transactionId,
    },
  },
  {
    session,
    new: true,
  },
);

if (!finalWallet) {
  throw new AppError("به‌روزرسانی کیف پول انجام نشد", 500);
}

return {
  wallet: finalWallet,
  withdraw,
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
    const existing = await getExistingWithdraw(
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


