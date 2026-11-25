import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";

import { connectDB } from "./config/db.js";
import { connectRedis } from "./config/redis.js";

import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import tradeRoutes from "./routes/trade.routes.js";

import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(process.cwd(), "public")));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/", tradeRoutes);

app.use(errorHandler);

const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    await connectRedis();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Application startup failed:", error);
    process.exit(1);
  }
};

void startServer();