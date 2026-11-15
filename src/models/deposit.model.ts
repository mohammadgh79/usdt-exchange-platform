import { Schema, model } from "mongoose";
import type { IDeposit } from "./deposit.interface.js";
const DepositSchema = new Schema<IDeposit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    amountRial: {
      type: Number,
      required: true,
      min: 1,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Transaction",
      unique: true,

    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export const Deposit = model<IDeposit>("Deposit", DepositSchema);