import { Schema, model } from "mongoose";
import type { IWallet } from "./wallet.interface.js";

const walletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    amountRial: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    amountUSDT: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
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