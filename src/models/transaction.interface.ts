import type { Types } from "mongoose";
import type { TransactionType,TransactionStatus } from "./transaction.type.js";
export interface ITransaction{
    userId: Types.ObjectId;
    type: TransactionType;
    status: TransactionStatus;
    amountToman: Types.Decimal128;
    amountUSDT: Types.Decimal128;
    orderId?: Types.ObjectId;
    depositId?: Types.ObjectId;
    withdrawalId?: Types.ObjectId;
     createdAt: Date;
     updatedAt: Date;
}

