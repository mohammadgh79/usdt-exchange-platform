
import { z } from "zod";

export const tradeSchema = z.object({
  amount: z
    .string()
    .regex(
      /^\d+(\.\d{1,6})?$/,
      "مقدار باید عدد مثبت با حداکثر ۶ رقم اعشار باشد",
    )
    .refine(
      (value) => Number(value) > 0,
      "مقدار باید بیشتر از صفر باشد",
    ),

  idempotencyKey: z
    .string()
    .trim()
    .min(1, "کلید یکتا الزامی است")
    .max(128, "کلید یکتا بیش از حد طولانی است"),
});
