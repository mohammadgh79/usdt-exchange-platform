import { Schema, model } from "mongoose";
import type { IOrder } from "./order.interface.js";

const OrderSchema = new Schema<IOrder>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref:"User"
  },
  amount: {
    type: Number,
    min:0,
    required: true,
  },
  price: {
    type: Number,
    min:0,
    required: true,
  },
  status: {
    type: String,
    enum: ["PENDING","REJECTED","PROCESSING", "COMPLETED", "FAILED", "CANCELLED"],
    required: true,
  },
  type: {
    type: String,
    enum: ["BUY", "SELL"],
    required: true,
  },

  total: {
    type: Number,
    min:0,
    required: true,
  },
  feeRate: {
    type: Number,
    min: 0,
    required: true,
  },
  fee: {
    type: Number,
    min: 0,
    required: true,
  },
  taxRate: {
    type: Number,
    min: 0,
    required: true,
  },
  tax: {
    type: Number,
    min: 0,
    required: true,
  },
  finalAmount: {
    type: Number,
    min:0,
    required: true,
  },
  transactionId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref:"Transaction",
    unique: true,

  },
  },
  {
    timestamps:true,
  }
);

export const Order = model<IOrder>("Order", OrderSchema);
