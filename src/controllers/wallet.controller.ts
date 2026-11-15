import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middlewares.js";
import { Wallet } from "../models/wallet.model.js";
import { Transaction } from "../models/transaction.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { Types } from "mongoose";

export const getWallet = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("دسترسی غیرمجاز", 401);
    }

    const userId = new Types.ObjectId(req.user.id);

    const wallet = await Wallet.findOne({
      userId: userId,
    });

    if (!wallet) {
      throw new AppError("کیف پول پیدا نشد", 404);
    }

    res.json(wallet);
  },
);

export const getTransactions = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("دسترسی غیرمجاز", 401);
    }

    const userId = new Types.ObjectId(req.user.id);

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({
      userId: userId,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments({
      userId: userId,
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      transactions,

      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  },
);

export const getDailySummary = asyncHandler(

  async (req: AuthRequest, res: Response) => {

    if (!req.user) {
      throw new AppError("دسترسی غیرمجاز", 401);
    }

    const userId = new Types.ObjectId(req.user.id);
    const startOfDay=new Date();
    startOfDay.setHours(0,0,0,0);
    const startOfTomorrow=new Date();
    startOfTomorrow.setHours(0, 0, 0, 0);
    startOfTomorrow.setDate(startOfTomorrow.getDate()+1);
    const summary = await Transaction.aggregate([
  {
    $match: {
      userId: userId,
      createdAt: {
        $gte: startOfDay,
        $lt: startOfTomorrow,
      },
    },
  },
  {
    $group:{
      _id:"$type",
      count:{
        $sum:1
      },
      totalUSDT:{
        $sum:"$amountUSDT",
      }
    }
  }
]);
res.json({
    summary,
  })


  },
  
);

