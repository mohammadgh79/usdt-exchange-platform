import { Router } from "express";

import { protect } from "../middlewares/auth.middlewares.js";
import { adminOnly } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import { transactionLimitSchema } from "../validators/transaction-limit.validator.js";

import {
  getAdminTransactionLimits,
  updateAdminTransactionLimits,
} from "../controllers/admin.controller.js";

const router = Router();

router.get(
  "/transaction-limits",
  protect,
  adminOnly,
  getAdminTransactionLimits
);

router.patch(
  "/transaction-limits",
  protect,
  adminOnly,
  validate(transactionLimitSchema),
  updateAdminTransactionLimits
);

export default router;