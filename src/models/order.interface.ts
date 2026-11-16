
import type { Types } from "mongoose";
import type { OrderType, OrderStatus } from "./order.type.js";

export interface IOrder {
  userId: Types.ObjectId;
  type: OrderType;
  status: OrderStatus;
  amount: number;
  price: number;
  total: number;
  feeRate: number;
  fee: number;
  taxRate: number;
  tax: number;
  finalAmount: number;
  transactionId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  idempotencyKey: string;
}
