import { Types } from "mongoose"

export interface IDeposit{
  userId:Types.ObjectId;
  amountToman: number;
  transactionId: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;

}