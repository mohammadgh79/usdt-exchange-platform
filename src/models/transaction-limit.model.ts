
import mongoose, { Schema } from "mongoose";
import type { ITransactionLimit } from "./transaction-limit.interface.js";

const transactionLimitSchema = new Schema<ITransactionLimit>(
  {
    singletonKey: {
      type: String,
      required: true,
      default: "global",
      immutable: true,
    },

    buyMinUSDT: { type: Schema.Types.Decimal128, required: true },
    buyMaxUSDT: { type: Schema.Types.Decimal128, required: true },

    sellMinUSDT: { type: Schema.Types.Decimal128, required: true },
    sellMaxUSDT: { type: Schema.Types.Decimal128, required: true },

    depositMinToman: { type: Schema.Types.Decimal128, required: true },
    depositMaxToman: { type: Schema.Types.Decimal128, required: true },

    withdrawMinToman: { type: Schema.Types.Decimal128, required: true },
    withdrawMaxToman: { type: Schema.Types.Decimal128, required: true },
  },
  { timestamps: true }
);

transactionLimitSchema.index(
  { singletonKey: 1 },
  { unique: true }
);

const TransactionLimit = mongoose.model<ITransactionLimit>(
  "TransactionLimit",
  transactionLimitSchema
);

export default TransactionLimit;
