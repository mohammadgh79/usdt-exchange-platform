
import { randomUUID } from "node:crypto";
import { redisClient } from "../config/redis.js";
import { PriceHistory } from "../models/price-history.model.js";

const PRICE_CACHE_KEY = "price:usdt-toman";
const LAST_PRICE_KEY = "price:usdt-toman:last";
const LOCK_KEY = "price:usdt-toman:lock";

const CACHE_TTL_SECONDS = 10;
const BASE_PRICE = 60000;
const MAX_FLUCTUATION_PERCENT = 0.5;
const MAX_PRICE_POINTS = 100;
const MEAN_REVERSION_STRENGTH = 0.02;

const LOCK_TTL_MS = 10000;
const CACHE_WAIT_INTERVAL_MS = 100;
const MAX_CACHE_WAIT_ATTEMPTS = 100;

const RELEASE_LOCK_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;

const generateMockPrice = async (): Promise<number> => {
  const lastPriceRaw = await redisClient.get(LAST_PRICE_KEY);

  const lastPrice = lastPriceRaw
    ? Number(lastPriceRaw)
    : BASE_PRICE;

  const changePercent =
    (Math.random() * 2 - 1) * MAX_FLUCTUATION_PERCENT;

  const reversionPull =
    (BASE_PRICE - lastPrice) * MEAN_REVERSION_STRENGTH;

  const newPrice = Math.max(
    1,
    Math.round(
      lastPrice * (1 + changePercent / 100) + reversionPull
    )
  );

  await redisClient.set(LAST_PRICE_KEY, newPrice);

  return newPrice;
};

const savePriceHistory = async (price: number): Promise<void> => {
  await PriceHistory.create({ price });

  const oldPrices = await PriceHistory
    .find()
    .sort({ createdAt: -1, _id: -1 })
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

const wait = async (): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, CACHE_WAIT_INTERVAL_MS);
  });
};

const releaseLock = async (lockToken: string): Promise<void> => {
  await redisClient.eval(
    RELEASE_LOCK_SCRIPT,
    1,
    LOCK_KEY,
    lockToken
  );
};

export const getUsdtPrice = async (): Promise<number> => {
  for (let attempt = 0; attempt < MAX_CACHE_WAIT_ATTEMPTS; attempt++) {
    const cached = await redisClient.get(PRICE_CACHE_KEY);

    if (cached !== null) {
      const price = Number(cached);

      if (Number.isFinite(price) && price > 0) {
        return price;
      }

      await redisClient.del(PRICE_CACHE_KEY);
    }

    const lockToken = randomUUID();

    const lockAcquired = await redisClient.set(
      LOCK_KEY,
      lockToken,
      "PX",
      LOCK_TTL_MS,
      "NX"
    );

    if (lockAcquired === "OK") {
      try {
        const existingCache = await redisClient.get(PRICE_CACHE_KEY);

        if (existingCache !== null) {
          const price = Number(existingCache);

          if (Number.isFinite(price) && price > 0) {
            return price;
          }
        }

        const price = await generateMockPrice();

        await redisClient.set(
          PRICE_CACHE_KEY,
          price,
          "EX",
          CACHE_TTL_SECONDS
        );

        await savePriceHistory(price);

        return price;
      } finally {
        await releaseLock(lockToken);
      }
    }

    await wait();
  }

  throw new Error("Could not generate USDT price: cache lock timeout");
};

export const getPriceHistory = async () => {
  return PriceHistory
    .find()
    .sort({ createdAt: 1, _id: 1 })
    .limit(MAX_PRICE_POINTS)
    .lean();
};
