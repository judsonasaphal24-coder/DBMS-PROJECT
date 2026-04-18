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

const FIXED_ADMIN_EMAIL = "admin@pulsepay.com";
const FIXED_ADMIN_PASSWORD = "admin@123";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
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
  const passwordHash = await bcrypt.hash(FIXED_ADMIN_PASSWORD, 10);
  await prisma.admin.deleteMany({ where: { email: { not: FIXED_ADMIN_EMAIL } } });
  await prisma.admin.upsert({
    where: { email: FIXED_ADMIN_EMAIL },
    update: { passwordHash },
    create: { email: FIXED_ADMIN_EMAIL, passwordHash },
  });

  app.listen(env.PORT, () => {
    console.log(`Backend listening on http://localhost:${env.PORT}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
