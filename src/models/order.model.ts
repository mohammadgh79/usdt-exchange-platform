
import { Schema, model } from "mongoose";
import type { IOrder } from "./order.interface.js";

const OrderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    amount: {
      type: Schema.Types.Decimal128,
      required: true,
    },

    price: {
      type: Schema.Types.Decimal128,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "REJECTED",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
      ],
      required: true,
    },

    type: {
      type: String,
      enum: ["BUY", "SELL"],
      required: true,
    },

    total: {
      type: Schema.Types.Decimal128,
      required: true,
    },

    feeRate: {
      type: Number,
      min: 0,
      required: true,
    },

    fee: {
      type: Schema.Types.Decimal128,
      required: true,
    },

    taxRate: {
      type: Number,
      min: 0,
      required: true,
    },

    tax: {
      type: Schema.Types.Decimal128,
      required: true,
    },

    finalAmount: {
      type: Schema.Types.Decimal128,
      required: true,
    },

    transactionId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Transaction",
      unique: true,
    },

    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

OrderSchema.index(
  { userId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: "string" },
    },
  },
);

export const Order = model<IOrder>("Order", OrderSchema);
