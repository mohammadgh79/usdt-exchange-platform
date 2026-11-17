import { Schema, model } from "mongoose";
import type { ITransaction } from "./transaction.interface.js";

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    type: {
      type: String,
      enum: ["BUY", "SELL", "DEPOSIT", "WITHDRAW"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED","REJECTED"],
      required: true,
    },
    amountToman: {
      type: Number,
      required: true,
      min:0,
    },
    amountUSDT: {
      type: Number,
      required: true,
      min:0,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    depositId: {
      type: Schema.Types.ObjectId,
      ref: "Deposit",
    },
    withdrawalId: {
      type: Schema.Types.ObjectId,
      ref: "Withdraw",
    },
  },
  {
    timestamps: true,
  }
);
TransactionSchema.pre("validate",function(){
  if(this.type ==="BUY" || this.type === "SELL"){
    if (this.amountToman<=0){
      this.invalidate(
        "amountToman",
        "مقدار باید همواره عدی مثبت باشد "
      )
    }
    if (this.amountUSDT<=0){
      this.invalidate(
        "amountUSDT",
        "مقدار باید همواره عددی مثبت باشد "
      )
    }
    if (!this.orderId) {
  this.invalidate(
    "orderId",
    "تراکنش باید orderIdداشته باشد"
  );
}
  if (this.depositId){
    this.invalidate(
      "depositId",
      "تراکنش نباید depositIdداشته باشد"
    )
  }
  if (this.withdrawalId){
    this.invalidate(
      "withdrawalId",
      "تراکنش نباید withdrawalId داشته باشد"
    )
  }
  }
  else if (this.type === "DEPOSIT") {
    if (this.amountToman<=0){
      this.invalidate(
        "amountToman",
        "مقدار باید همواره عددی مثبت باشد"
      )
    }
    if (this.amountUSDT!==0){
      this.invalidate(
        "amountUSDT",
        "مقدار باید همواره صفر باشد"
      )
    }
  if (!this.depositId) {
    this.invalidate(
      "depositId",
      "شناسه Deposit الزامی است"
    );
  }

  if (this.orderId) {
    this.invalidate(
      "orderId",
      "تراکنش واریز نباید orderId داشته باشد"
    );
  }

  if (this.withdrawalId) {
    this.invalidate(
      "withdrawalId",
      "تراکنش واریز نباید withdrawalId داشته باشد"
    );
  }
  
}
else if (this.type === "WITHDRAW"){
  if (this.amountToman<=0){
      this.invalidate(
        "amountToman",
        "مقدار باید همواره عددی مثبت باشد"
      )
    }
    if (this.amountUSDT!==0){
      this.invalidate(
        "amountUSDT",
        "مقدار باید همواره صفر باشد"
      )
    }
    if (!this.withdrawalId){
      this.invalidate(
        "withdrawalId",
        "تراکنش برداشت باید withdrawalId داشته باشد"
      )
    }
    if (this.orderId){
      this.invalidate(
        "orderId",
        "تراکنش برداشت نباید orderId داشته باشد"
      )
    }
    if (this.depositId){
      this.invalidate(
        "depositId",
        "تراکنش برداشت نباید depositId داشته باشد"
      )
    }
    
  }
});
export const Transaction = model<ITransaction>(
  "Transaction",
  TransactionSchema
);