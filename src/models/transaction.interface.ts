import type { Types } from "mongoose";
import type { TransactionType,TransactionStatus } from "./transaction.type.js";
export interface ITransaction{
    userId: Types.ObjectId;
    type: TransactionType;
    status: TransactionStatus;
    amountRial: number;
    amountUSDT: number;
    orderId?: Types.ObjectId;
    depositId?: Types.ObjectId;
    withdrawalId?: Types.ObjectId;
     createdAt: Date;
     updatedAt: Date;
}

