import {Deposit} from "../models/deposit.model.js";
import  {Types} from "mongoose";
import mongoose from "mongoose";
import { Decimal } from "decimal.js"
import { Wallet } from "../models/wallet.model.js";
import { Transaction } from "../models/transaction.model.js";
import { AppError } from "../utils/AppError.js";


async function createDeposit(userId: Types.ObjectId, amountToman: string){
    const parsedAmount = new Decimal(amountToman);
    if(!parsedAmount.isFinite() || parsedAmount.lte(0) || !parsedAmount.isInteger()){
        throw new AppError("مقدار واریزی باید معتبر باشد ", 400);
    }
    const amount128 = Types.Decimal128.fromString(parsedAmount.toString());
    const depositId = new Types.ObjectId();
    const transactionId = new Types.ObjectId();
    const wallet=await Wallet.findOne({userId});
    if(!wallet){
        throw new AppError("کیف پول کاربر پیدا نشد", 404);
    }
    const session = await mongoose.startSession();
    

    try{
       const result= await session.withTransaction(async ()=>{
            const [transaction] = await Transaction.create([{
                _id:transactionId,
                userId,
                type:"DEPOSIT",
                status:"PENDING",
                amountToman:amount128,
                amountUSDT:Types.Decimal128.fromString("0"),
                depositId:depositId,
            }])
            const [deposit] = await Deposit.create([{
                _id:depositId,
                userId,
                amountToman:amount128,
                transactionId,
                status:"PENDING",
            },
        ],
        
        {session});

        return {transaction,deposit};
            
        })
        async function approveDeposit(depositId:Types.ObjectId,adminId:Types.ObjectId){
            if(!depositId){
                throw new AppError("شناسه واریز معتبر نیست",400);
                
    }
    

        }finally{
        await session.endSession(); 
    }
}


