
import type { Types } from "mongoose";

export interface IWallet {
  userId: Types.ObjectId;
  amountToman: Types.Decimal128;
  amountUSDT: Types.Decimal128;
  transactions: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
