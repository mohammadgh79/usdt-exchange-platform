import { z } from "zod";

export const withdrawSchema = z.object({
  amountToman: z
    .string()
    .regex(/^\d+$/, "Amount must be an integer")
    .refine(
      (value) => BigInt(value) > 0n,
      "Amount must be greater than zero",
    ),

  idempotencyKey: z
    .string()
    .trim()
    .min(1, "Idempotency key is required")
    .max(128, "Idempotency key is too long"),
});