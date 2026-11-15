
import type { Types } from "mongoose";

export interface IWallet {
  userId: Types.ObjectId;
  amountRial: number;
  amountUSDT: number;
  transactions: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
