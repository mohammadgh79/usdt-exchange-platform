
import TransactionLimit from "../models/transaction-limit.model.js";
import { Decimal } from "decimal.js";
import { AppError } from "../utils/AppError.js";

const SINGLETON_KEY = "global";

const DEFAULT_LIMITS = {
  buyMinUSDT: "1",
  buyMaxUSDT: "10000",

  sellMinUSDT: "1",
  sellMaxUSDT: "10000",

  depositMinToman: "100000",
  depositMaxToman: "500000000",

  withdrawMinToman: "100000",
  withdrawMaxToman: "500000000",
};

export const getTransactionLimits = async () => {
  await TransactionLimit.init();

  try {
    const limits = await TransactionLimit.findOneAndUpdate(
      { singletonKey: SINGLETON_KEY },
      { $setOnInsert: DEFAULT_LIMITS },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    if (!limits) {
      throw new AppError("Could not retrieve transaction limits.", 500);
    }

    return limits;
  } catch (error) {
    const existingLimits = await TransactionLimit.findOne({
      singletonKey: SINGLETON_KEY,
    });

    if (existingLimits) {
      return existingLimits;
    }

    throw error;
  }
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

  const updatedLimits = await TransactionLimit.findOneAndUpdate(
    { singletonKey: SINGLETON_KEY },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!updatedLimits) {
    throw new AppError("Could not update transaction limits.", 500);
  }

  return updatedLimits;
};
