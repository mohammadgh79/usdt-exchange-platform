import { Schema, model } from "mongoose";

/**
 * Represents a stored USDT price history document.
 *
 * @property {number} price - USDT price in Toman.
 */
export interface IPriceHistory {
  price: number;
   createdAt:Date;
   updatedAt:Date;
}

/**
 * Mongoose schema for storing USDT price history.
 *
 * Timestamps are automatically added to each document.
 */
const priceHistorySchema = new Schema<IPriceHistory>(
  {
    price: {
      type: Number,
      required: true,
      min: 1,
     

    },
  },
  {
    timestamps: true,
  },
);

/**
 * Mongoose model used to access price history documents.
 */
export const PriceHistory = model<IPriceHistory>(
  "PriceHistory",
  priceHistorySchema,
);