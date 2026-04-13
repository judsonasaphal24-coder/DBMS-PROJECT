import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import bcrypt from "bcryptjs";
import { authRoutes } from "./routes/authRoutes";
import { userRoutes } from "./routes/userRoutes";
import { adminRoutes } from "./routes/adminRoutes";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { prisma } from "./lib/prisma";

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
  await prisma.admin.upsert({
    where: { email: env.ADMIN_EMAIL },
    update: {},
    create: { email: env.ADMIN_EMAIL, passwordHash },
  });

  app.listen(env.PORT, () => {
    console.log(`Backend listening on port ${env.PORT}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
