
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const TARGET_URI = process.env.MONGODB_URI;

const SOURCE_DB_NAME = "test";
const TARGET_DB_NAME = "usdt_exchange";

const RUN_MIGRATION = process.env.RUN_MIGRATION === "YES";

type MongoDoc = {
  _id: any;
  [key: string]: any;
};

type MigrationPlan = {
  usersToInsert: MongoDoc[];
  walletsToInsert: MongoDoc[];
  existingUsers: number;
  existingWallets: number;
};

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function getDate(value: unknown): Date {
  const date = value ? new Date(value as string | number) : new Date();

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid timestamp found in source data");
  }

  return date;
}

function getObjectId(value: unknown): string {
  if (!value || !mongoose.Types.ObjectId.isValid(value as any)) {
    throw new Error("Invalid ObjectId found in source data");
  }

  return String(value);
}

function getWalletUserId(wallet: MongoDoc): string {
  if (wallet.user && wallet.userId) {
    if (String(wallet.user) !== String(wallet.userId)) {
      throw new Error(
        `Wallet ${wallet._id}: conflicting user and userId fields`,
      );
    }
  }

  return getObjectId(wallet.userId ?? wallet.user);
}

function getBalances(wallet: MongoDoc) {
  const tomanBalance = Number(
    wallet.amountToman ??
    wallet.amountRial ??
    wallet.tomanBalance,
  );

  const usdtBalance = Number(
    wallet.amountUSDT ??
    wallet.tetherBalance,
  );

  if (
    !Number.isFinite(tomanBalance) ||
    !Number.isFinite(usdtBalance) ||
    tomanBalance < 0 ||
    usdtBalance < 0
  ) {
    throw new Error(
      `Wallet ${wallet._id}: invalid balance`,
    );
  }

  return { tomanBalance, usdtBalance };
}

async function buildMigrationPlan(
  sourceUsers: MongoDoc[],
  sourceWallets: MongoDoc[],
  targetDb: any,
  session?: mongoose.ClientSession,
): Promise<MigrationPlan> {
  const queryOptions = session ? { session } : {};

  const targetUsers: MongoDoc[] = await targetDb
    .collection("users")
    .find({}, queryOptions)
    .toArray();

  const targetWallets: MongoDoc[] = await targetDb
    .collection("wallets")
    .find({}, queryOptions)
    .toArray();

  const targetUsersByEmail = new Map<string, MongoDoc>();
  const targetUsersById = new Map<string, MongoDoc>();

  for (const user of targetUsers) {
    const email = normalizeEmail(user.email);
    const id = getObjectId(user._id);

    if (targetUsersByEmail.has(email)) {
      throw new Error(`Duplicate email in target database: ${email}`);
    }

    targetUsersByEmail.set(email, user);
    targetUsersById.set(id, user);
  }

  const targetWalletsByUser = new Map<string, MongoDoc>();
  const targetWalletsById = new Map<string, MongoDoc>();

  for (const wallet of targetWallets) {
    const userId = getObjectId(wallet.userId);
    const walletId = getObjectId(wallet._id);

    if (targetWalletsByUser.has(userId)) {
      throw new Error(
        `Multiple target wallets found for user ${userId}`,
      );
    }

    targetWalletsByUser.set(userId, wallet);
    targetWalletsById.set(walletId, wallet);
  }

  const sourceEmails = new Set<string>();
  const sourceUserIds = new Set<string>();

  const userIdMap = new Map<string, mongoose.Types.ObjectId>();

  const usersToInsert: MongoDoc[] = [];
  const walletsToInsert: MongoDoc[] = [];

  let existingUsers = 0;
  let existingWallets = 0;

  // Prepare users
  for (const user of sourceUsers) {
    const oldId = getObjectId(user._id);
    const email = normalizeEmail(user.email);

    if (!email || !user.name || !user.password) {
      throw new Error(`User ${oldId}: missing required fields`);
    }

    if (sourceUserIds.has(oldId)) {
      throw new Error(`Duplicate source user ID: ${oldId}`);
    }

    if (sourceEmails.has(email)) {
      throw new Error(`Duplicate source email: ${email}`);
    }

    sourceUserIds.add(oldId);
    sourceEmails.add(email);

    if (!["user", "admin"].includes(user.role)) {
      throw new Error(`User ${oldId}: invalid role`);
    }

    const existingByEmail = targetUsersByEmail.get(email);
    const existingById = targetUsersById.get(oldId);

    if (existingByEmail) {
      if (
        existingById &&
        normalizeEmail(existingById.email) !== email
      ) {
        throw new Error(
          `User ${oldId}: ID conflicts with another target user`,
        );
      }

      userIdMap.set(
        oldId,
        existingByEmail._id as mongoose.Types.ObjectId,
      );

      existingUsers++;
      continue;
    }

    if (existingById) {
      throw new Error(
        `User ${oldId}: ID already belongs to another target user`,
      );
    }

    const userId = user._id as mongoose.Types.ObjectId;

    userIdMap.set(oldId, userId);

    usersToInsert.push({
      _id: user._id,
      name: String(user.name).trim(),
      email,
      password: user.password,
      role: user.role,
      createdAt: getDate(user.createdAt),
      updatedAt: getDate(user.updatedAt),
    });
  }

  // Prepare wallets
  const sourceWalletUserIds = new Set<string>();

  for (const wallet of sourceWallets) {
    const walletId = getObjectId(wallet._id);
    const oldUserId = getWalletUserId(wallet);

    if (sourceWalletUserIds.has(oldUserId)) {
      throw new Error(
        `Multiple source wallets found for user ${oldUserId}`,
      );
    }

    sourceWalletUserIds.add(oldUserId);

    const newUserId = userIdMap.get(oldUserId);

    if (!newUserId) {
      throw new Error(
        `Wallet ${walletId}: source user was not migrated or mapped`,
      );
    }

    const existingByUser = targetWalletsByUser.get(
      String(newUserId),
    );

    if (existingByUser) {
      existingWallets++;
      continue;
    }

    const existingById = targetWalletsById.get(walletId);

    if (existingById) {
      throw new Error(
        `Wallet ${walletId}: ID already exists in target`,
      );
    }

    const { tomanBalance, usdtBalance } = getBalances(wallet);

    walletsToInsert.push({
      _id: wallet._id,
      userId: newUserId,
      amountToman: tomanBalance,
      amountUSDT: usdtBalance,
      transactions: [],
      createdAt: getDate(wallet.createdAt),
      updatedAt: getDate(wallet.updatedAt),
    });
  }

  return {
    usersToInsert,
    walletsToInsert,
    existingUsers,
    existingWallets,
  };
}

async function migrate(): Promise<void> {
  if (!TARGET_URI) {
    throw new Error("MONGODB_URI is missing from .env");
  }

  const connection = await mongoose
    .createConnection(TARGET_URI)
    .asPromise();

  const session = await connection.startSession();

  try {
    const sourceDb = connection.useDb(SOURCE_DB_NAME).db;
    const targetDb = connection.useDb(TARGET_DB_NAME).db;

    if (!sourceDb || !targetDb) {
      throw new Error("Could not access source or target database");
    }

    const sourceUsers: MongoDoc[] = await sourceDb
      .collection("users")
      .find({})
      .toArray();

    const sourceWallets: MongoDoc[] = await sourceDb
      .collection("wallets")
      .find({})
      .toArray();

    console.log("\n========== MIGRATION ==========");

    console.log("\nSOURCE:");
    console.log("Users:", sourceUsers.length);
    console.log("Wallets:", sourceWallets.length);

    let finalPlan: MigrationPlan | undefined;

    if (!RUN_MIGRATION) {
      finalPlan = await buildMigrationPlan(
        sourceUsers,
        sourceWallets,
        targetDb,
      );

      console.log("\nMODE: DRY RUN");

      console.log(
        "Users to insert:",
        finalPlan.usersToInsert.length,
      );

      console.log(
        "Existing users:",
        finalPlan.existingUsers,
      );

      console.log(
        "Wallets to insert:",
        finalPlan.walletsToInsert.length,
      );

      console.log(
        "Existing wallets:",
        finalPlan.existingWallets,
      );

      console.log("\nNO DATA WAS MODIFIED.");
      console.log(
        "To execute migration, explicitly set RUN_MIGRATION=YES.",
      );

      return;
    }

    // Execute both collections in one MongoDB transaction
    await session.withTransaction(async () => {
      finalPlan = await buildMigrationPlan(
        sourceUsers,
        sourceWallets,
        targetDb,
        session,
      );

      if (finalPlan.usersToInsert.length > 0) {
        await targetDb.collection("users").insertMany(
          finalPlan.usersToInsert,
          {
            session,
            ordered: true,
          },
        );
      }

      if (finalPlan.walletsToInsert.length > 0) {
        await targetDb.collection("wallets").insertMany(
          finalPlan.walletsToInsert,
          {
            session,
            ordered: true,
          },
        );
      }
    });

    console.log("\nMODE: REAL MIGRATION");
    console.log("Transaction committed successfully.");

    console.log(
      "Users inserted:",
      finalPlan?.usersToInsert.length ?? 0,
    );

    console.log(
      "Existing users skipped:",
      finalPlan?.existingUsers ?? 0,
    );

    console.log(
      "Wallets inserted:",
      finalPlan?.walletsToInsert.length ?? 0,
    );

    console.log(
      "Existing wallets skipped:",
      finalPlan?.existingWallets ?? 0,
    );
  } finally {
    await session.endSession();
    await connection.close();
  }
}

migrate().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown error";

  console.error("\nMigration failed:", message);
  console.error("No partial transaction should remain committed.");

  process.exitCode = 1;
});
