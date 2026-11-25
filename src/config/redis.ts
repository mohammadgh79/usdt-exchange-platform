import "dotenv/config";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL در فایل .env تعریف نشده است");
}

export const redisClient = new Redis(redisUrl, {
  lazyConnect: true,
});

redisClient.on("connect", () => {
  console.log("Redis connected successfully");
});

redisClient.on("error", (error) => {
  console.error("Redis connection error:", error);
});

export const connectRedis = async (): Promise<void> => {
  await redisClient.connect();
  await redisClient.ping();
};