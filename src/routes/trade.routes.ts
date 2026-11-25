import { Router } from "express";
import { deposit } from "../controllers/deposit.controller.js";
import { withdraw } from "../controllers/withdraw.controller.js";
import { depositSchema } from "../validators/deposit.validator.js";
import { withdrawSchema } from "../validators/withdraw.validator.js";
import { validate } from "../middlewares/validate.middleware.js";
import { tradeSchema } from "../validators/trade.validator.js";
import {
  buy,
  sell,
  getPrice,
  getPriceHistoryController,
} from "../controllers/trade.controller.js";

import {
  getWallet,
  getTransactions,
  getDailySummary,
} from "../controllers/wallet.controller.js";

import { protect } from "../middlewares/auth.middlewares.js";

const router = Router();


router.get("/price", getPrice);


router.get("/price/history", getPriceHistoryController);


router.get("/wallet", protect, getWallet);

router.get("/transactions", protect, getTransactions);


router.get("/transactions/daily-summary", protect, getDailySummary);


router.post("/buy", protect, validate(tradeSchema), buy);

 router.post(
  "/deposit",
  protect,
  validate(depositSchema),
  deposit,
);

router.post(
  "/withdraw",
  protect,
  validate(withdrawSchema),
  withdraw,
);
 
router.post("/sell", protect, validate(tradeSchema), sell);


export default router;