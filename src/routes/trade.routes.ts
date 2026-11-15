import { Router } from "express";

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

/**
 * Returns the current USDT price.
 *
 * @route GET /price
 */
router.get("/price", getPrice);

/**
 * Returns the stored USDT price history.
 *
 * @route GET /price/history
 */
router.get("/price/history", getPriceHistoryController);

/**
 * Returns the authenticated user's wallet.
 *
 * Requires JWT authentication.
 *
 * @route GET /wallet
 */
router.get("/wallet", protect, getWallet);

/**
 * Returns the authenticated user's paginated transactions.
 *
 * Requires JWT authentication.
 *
 * @route GET /transactions
 */
router.get("/transactions", protect, getTransactions);

/**
 * Returns the authenticated user's daily transaction summary.
 *
 * Requires JWT authentication.
 *
 * @route GET /transactions/daily-summary
 */
router.get("/transactions/daily-summary", protect, getDailySummary);

/**
 * Buys USDT for the authenticated user.
 *
 * The request body is validated using the trade schema.
 *
 * @route POST /buy
 */
router.post("/buy", protect, validate(tradeSchema), buy);

/**
 * Sells USDT for the authenticated user.
 *
 * The request body is validated using the trade schema.
 *
 * @route POST /sell
 */
router.post("/sell", protect, validate(tradeSchema), sell);

/**
 * Trade and wallet router containing price,
 * wallet, transaction, buy, and sell endpoints.
 */
export default router;