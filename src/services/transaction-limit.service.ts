import TransactionLimit from "../models/transaction-limit.model.js";
import { Decimal } from "decimal.js";
import { AppError } from "../utils/AppError.js";

export const getTransactionLimits = async () => {
  let limits = await TransactionLimit.findOne();

  if (!limits) {
    limits = await TransactionLimit.create({
      buyMinUSDT: "1",
      buyMaxUSDT: "10000",

      sellMinUSDT: "1",
      sellMaxUSDT: "10000",

      depositMinToman: "100000",
      depositMaxToman: "500000000",

      withdrawMinToman: "100000",
      withdrawMaxToman: "500000000",
    });
  }

  return limits;
};

export const updateTransactionLimits = async (
  updates: Partial<{
    buyMinUSDT: string;
    buyMaxUSDT: string;
    sellMinUSDT: string;
    sellMaxUSDT: string;
    depositMinToman: string;
    depositMaxToman: string;
    withdrawMinToman: string;
    withdrawMaxToman: string;
  }>
) => {
  const currentLimits = await getTransactionLimits();

  const newLimits = {
    ...currentLimits.toObject(),
    ...updates,
  };

  const limitPairs = [
    ["buyMinUSDT", "buyMaxUSDT"],
    ["sellMinUSDT", "sellMaxUSDT"],
    ["depositMinToman", "depositMaxToman"],
    ["withdrawMinToman", "withdrawMaxToman"],
  ] as const;

  for (const [minKey, maxKey] of limitPairs) {
    const min = new Decimal(String(newLimits[minKey]));
    const max = new Decimal(String(newLimits[maxKey]));

    if (
      !min.isFinite() ||
      !max.isFinite() ||
      min.lte(0) ||
      max.lte(0) ||
      min.gt(max)
    ) {
      throw new AppError(
        `محدودیت نامعتبر است: مقدار حداقل (${minKey}) باید کمتر یا مساوی مقدار حداکثر (${maxKey}) باشد.`,
        400
      );
    }
  }

  return TransactionLimit.findByIdAndUpdate(
    currentLimits._id,
    updates,
    { new: true, runValidators: true }
  );
};