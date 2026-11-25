
import type { Types } from "mongoose";
import type { DepositStatus } from "./deposit.type.js";

export interface IDeposit {
  userId: Types.ObjectId;
  amountToman: Types.Decimal128;
  status: DepositStatus;
  transactionId: Types.ObjectId;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}
