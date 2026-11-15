import { Router } from "express";

import { register, login, getMe } from "../controllers/auth.controller.js";

import { protect } from "../middlewares/auth.middlewares.js";

const router = Router();

/**
 * Registers a new user account.
 *
 * @route POST /auth/register
 */
router.post("/register", register);

/**
 * Authenticates an existing user.
 *
 * @route POST /auth/login
 */
router.post("/login", login);

/**
 * Returns the currently authenticated user's profile.
 *
 * Requires JWT authentication.
 *
 * @route GET /auth/me
 */
router.get("/me", protect, getMe);

/**
 * Authentication router containing registration,
 * login, and authenticated profile routes.
 */
export default router;