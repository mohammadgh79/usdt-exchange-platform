
import type { Types } from "mongoose";

export interface IWallet {
  userId: Types.ObjectId;
  amountToman: number;
  amountUSDT: number;
  transactions: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
