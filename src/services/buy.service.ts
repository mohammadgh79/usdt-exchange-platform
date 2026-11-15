
import mongoose, { Types } from "mongoose";
import { Wallet } from "../models/wallet.model.js";
import { AppError } from "../utils/AppError.js";
import { getUsdtPrice } from "./price.service.js";
import { Order } from "../models/order.model.js";
import { Transaction } from "../models/transaction.model.js";

const BUY_FEE_PERCENT = 1.5;
const TAX_PERCENT = 10;

export async function buyUsdt(
  amount: number,
  userId: Types.ObjectId
) {
  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new AppError(
      "مقدار وارد شده باید عددی مثبت و معتبر باشد",
      400
    );
  }

  const wallet = await Wallet.findOne({ userId });

  if (!wallet) {
    throw new AppError("کیف پول یافت نشد!", 404);
  }

  const price = await getUsdtPrice();
  const total = amount * price;
  const tax = total * (TAX_PERCENT / 100);
  const fee = total * (BUY_FEE_PERCENT / 100);
  const finalAmount = total + fee + tax;

  
  const orderId = new Types.ObjectId();
  const transactionId = new Types.ObjectId();
  
  const session = await mongoose.startSession();

  
  if (wallet.amountRial < finalAmount) {
    const order = await Order.create({
      _id: orderId,
      userId,
      type: "BUY",
      status: "REJECTED",
      amount,
      price,
      total,
      feeRate: BUY_FEE_PERCENT,
      fee,
      taxRate: TAX_PERCENT,
      tax,
      finalAmount,
      transactionId,
    });

    const transaction = await Transaction.create({
      _id: transactionId,
      userId,
      type: "BUY",
      status: "REJECTED",
      amountUSDT: amount,
      amountRial: finalAmount,
      orderId,
    });

    return {
      order,
      transaction,
    };
  }

wallet.amountRial -= finalAmount;
wallet.amountUSDT += amount;
wallet.transactions.push(transactionId);

await wallet.save();
const order = await Order.create({
   _id: orderId,
      userId,
      type: "BUY",
      status: "COMPLETED",
      amount,
      price,
      total,
      feeRate: BUY_FEE_PERCENT,
      fee,
      taxRate: TAX_PERCENT,
      tax,
      finalAmount,
      transactionId,
})
const transaction = await Transaction.create({
  _id: transactionId,
      userId,
      type: "BUY",
      status: "COMPLETED",
      amountUSDT: amount,
      amountRial: finalAmount,
      orderId,
})
return {
  order,
  transaction
};
 
}
