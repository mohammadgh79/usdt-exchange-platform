import type { Types } from "mongoose";
import type { WithdrawStatus } from "./withdraw.type.js";

export interface IWithdraw {
  userId: Types.ObjectId;
  amountToman: Types.Decimal128;
  status: WithdrawStatus;
  transactionId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  idempotencyKey: string;
}