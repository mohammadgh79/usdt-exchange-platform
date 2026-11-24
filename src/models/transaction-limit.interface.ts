import type { Types } from "mongoose";

export interface ITransactionLimit {
  buyMinUSDT: Types.Decimal128;
  buyMaxUSDT: Types.Decimal128;

  sellMinUSDT: Types.Decimal128;
  sellMaxUSDT: Types.Decimal128;

  depositMinToman: Types.Decimal128;
  depositMaxToman: Types.Decimal128;

  withdrawMinToman: Types.Decimal128;
  withdrawMaxToman: Types.Decimal128;

  createdAt: Date;
  updatedAt: Date;
}