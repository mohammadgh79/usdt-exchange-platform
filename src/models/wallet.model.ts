
import { Schema, model,Types } from "mongoose";
import type { IWallet } from "./wallet.interface.js";

const walletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    amountToman: {
      type: Schema.Types.Decimal128,
      required: true,
      default: () => Types.Decimal128.fromString("0"),
    },

    amountUSDT: {
      type: Schema.Types.Decimal128,
      required: true,
      default: () => Types.Decimal128.fromString("0"),
    },

    transactions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Transaction",
      },
    ],
  },
  {
    timestamps: true,
  },
);

export const Wallet = model<IWallet>("Wallet", walletSchema);
