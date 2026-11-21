
import { Schema, model } from "mongoose";
import type { ITransaction } from "./transaction.interface.js";

function isPositive(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  const number = Number(value.toString());

  return Number.isFinite(number) && number > 0;
}

function isZero(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  return Number(value.toString()) === 0;
}

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
      enum: [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
        "REJECTED",
      ],
      required: true,
    },
    amountToman: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    amountUSDT: {
      type: Schema.Types.Decimal128,
      required: true,
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
  },
);

TransactionSchema.pre("validate", function () {
  if (this.type === "BUY" || this.type === "SELL") {
    if (!isPositive(this.amountToman)) {
      this.invalidate("amountToman", "مقدار باید مثبت باشد");
    }

    if (!isPositive(this.amountUSDT)) {
      this.invalidate("amountUSDT", "مقدار باید مثبت باشد");
    }

    if (!this.orderId) {
      this.invalidate("orderId", "تراکنش باید orderId داشته باشد");
    }

    if (this.depositId) {
      this.invalidate("depositId", "تراکنش نباید depositId داشته باشد");
    }

    if (this.withdrawalId) {
      this.invalidate(
        "withdrawalId",
        "تراکنش نباید withdrawalId داشته باشد",
      );
    }
  } else if (this.type === "DEPOSIT") {
    if (!isPositive(this.amountToman)) {
      this.invalidate("amountToman", "مقدار باید مثبت باشد");
    }

    if (!isZero(this.amountUSDT)) {
      this.invalidate("amountUSDT", "مقدار باید صفر باشد");
    }

    if (!this.depositId) {
      this.invalidate("depositId", "شناسه Deposit الزامی است");
    }

    if (this.orderId) {
      this.invalidate("orderId", "تراکنش واریز نباید orderId داشته باشد");
    }

    if (this.withdrawalId) {
      this.invalidate(
        "withdrawalId",
        "تراکنش واریز نباید withdrawalId داشته باشد",
      );
    }
  } else if (this.type === "WITHDRAW") {
    if (!isPositive(this.amountToman)) {
      this.invalidate("amountToman", "مقدار باید مثبت باشد");
    }

    if (!isZero(this.amountUSDT)) {
      this.invalidate("amountUSDT", "مقدار باید صفر باشد");
    }

    if (!this.withdrawalId) {
      this.invalidate(
        "withdrawalId",
        "تراکنش برداشت باید withdrawalId داشته باشد",
      );
    }

    if (this.orderId) {
      this.invalidate(
        "orderId",
        "تراکنش برداشت نباید orderId داشته باشد",
      );
    }

    if (this.depositId) {
      this.invalidate(
        "depositId",
        "تراکنش برداشت نباید depositId داشته باشد",
      );
    }
  }
});

export const Transaction = model<ITransaction>(
  "Transaction",
  TransactionSchema,
);
