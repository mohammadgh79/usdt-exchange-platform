import { z } from "zod";

const usdtLimit = z
  .string()
  .regex(/^\d+(\.\d{1,6})?$/, "مقدار USDT نامعتبر است");

const tomanLimit = z
  .string()
  .regex(/^\d+$/, "مقدار تومان باید عدد صحیح باشد");

export const transactionLimitSchema = z
  .object({
    buyMinUSDT: usdtLimit.optional(),
    buyMaxUSDT: usdtLimit.optional(),

    sellMinUSDT: usdtLimit.optional(),
    sellMaxUSDT: usdtLimit.optional(),

    depositMinToman: tomanLimit.optional(),
    depositMaxToman: tomanLimit.optional(),

    withdrawMinToman: tomanLimit.optional(),
    withdrawMaxToman: tomanLimit.optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "حداقل یک محدودیت باید ارسال شود"
  );