
import { Schema, model } from "mongoose";
import type { IWithdraw } from "./withdraw.interface.js";

const withdrawSchema = new Schema<IWithdraw>(
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
      required: true,
      enum: ["COMPLETED", "REJECTED"],
    },
    idempotencyKey: {
     type: String,
     required: true,
     trim: true,  
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
withdrawSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true },
);
export const Withdraw = model<IWithdraw>("Withdraw", withdrawSchema);
