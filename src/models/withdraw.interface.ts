import type { Types } from "mongoose"

export interface IWithdraw{
  userId:Types.ObjectId;
  amountRial: number;
  transactionId: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;

}