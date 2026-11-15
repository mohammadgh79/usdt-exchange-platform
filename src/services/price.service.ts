import { redisClient } from "../config/redis.js";
import { PriceHistory } from "../models/price-history.model.js";

/**
 * Redis key used to cache the current USDT price.
 */
const PRICE_CACHE_KEY = "price:usdt-toman";

/**
 * Redis key used to store the last generated USDT price.
 */
const LAST_PRICE_KEY = "price:usdt-toman:last";

/**
 * Cache lifetime in seconds.
 */
const CACHE_TTL_SECONDS = 10;

/**
 * Base price used when no previous price exists.
 */
const BASE_PRICE = 60000;

/**
 * Maximum random price fluctuation percentage.
 */
const MAX_FLUCTUATION_PERCENT = 0.5;

/**
 * Maximum number of price history points stored in MongoDB.
 */
const MAX_PRICE_POINTS = 100;

/**
 * Generates a new mock USDT price based on the previous price.
 *
 * 
 * 
 * @returns {Promise<number>} Newly generated USDT price.
 */
const MEAN_REVERSION_STRENGTH = 0.02;
const generateMockPrice = async (): Promise<number> => {
  const lastPriceRaw = await redisClient.get(LAST_PRICE_KEY);

  const lastPrice = lastPriceRaw
    ? Number(lastPriceRaw)
    : BASE_PRICE;

  const changePercent =
    (Math.random() * 2 - 1) * MAX_FLUCTUATION_PERCENT;

  const reversionPull = (BASE_PRICE - lastPrice) * MEAN_REVERSION_STRENGTH;

  const newPrice = Math.round(
    lastPrice * (1 + changePercent / 100) + reversionPull
  );

  await redisClient.set(LAST_PRICE_KEY, newPrice);

  return newPrice;
};

/**
 * Saves a price point to MongoDB and removes
 * price points older than the latest 100 records.
 *
 * @param {number} price - USDT price to store.
 * @returns {Promise<void>}
 */
const savePriceHistory = async (price: number): Promise<void> => {
  await PriceHistory.create({
    price,
  });

  const oldPrices = await PriceHistory
    .find()
    .sort({ createdAt: -1 })
    .skip(MAX_PRICE_POINTS)
    .select("_id")
    .lean();

  if (oldPrices.length > 0) {
    await PriceHistory.deleteMany({
      _id: {
        $in: oldPrices.map((item) => item._id),
      },
    });
  }
};

/**
 * Returns the current USDT price.
 *
 * The price is retrieved from Redis when available.
 * Otherwise, a new mock price is generated and cached.
 *
 * @returns {Promise<number>} Current USDT price.
 */
export const getUsdtPrice = async (): Promise<number> => {
  const cached = await redisClient.get(PRICE_CACHE_KEY);

  if (cached) {
    const price = Number(cached);

    await savePriceHistory(price);

    return price;
  }

  const price = await generateMockPrice();

  await redisClient.set(
    PRICE_CACHE_KEY,
    price,
    "EX",
    CACHE_TTL_SECONDS,
  );

  await savePriceHistory(price);

  return price;
};

/**
 * Returns the latest stored USDT price history points.
 *
 * @returns {Promise<object[]>} Price history ordered from oldest to newest.
 */
export const getPriceHistory = async () => {
  return PriceHistory
    .find()
    .sort({ createdAt: 1 })
    .limit(MAX_PRICE_POINTS)
    .lean();
};