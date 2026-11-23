
import type { Types } from "mongoose";
import type { OrderType, OrderStatus } from "./order.type.js";
export interface IOrder {
  userId: Types.ObjectId;
  type: OrderType;
  status: OrderStatus;
  amount: Types.Decimal128;
  price: Types.Decimal128;
  total: Types.Decimal128;
  feeRate: number;
  fee: Types.Decimal128;
  taxRate: number;
  tax: Types.Decimal128;
  finalAmount: Types.Decimal128;
  transactionId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  idempotencyKey: string;
}
