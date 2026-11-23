import { Schema, model } from "mongoose";
import type { IDeposit } from "./deposit.interface.js";

const DepositSchema = new Schema<IDeposit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    amountToman: {
      type: Schema.Types.Decimal128,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["COMPLETED"],
      default: "COMPLETED",
      required: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Transaction",
      unique: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Deposit = model<IDeposit>("Deposit", DepositSchema);