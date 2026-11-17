import { Schema, model } from "mongoose";
import type { IWithdraw } from "./withdraw.interface.js";
const WithdrawSchema = new Schema<IWithdraw>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    amountToman: {
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

export const Withdraw = model<IWithdraw>("Withdraw", WithdrawSchema);