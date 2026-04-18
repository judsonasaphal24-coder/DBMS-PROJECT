import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  PORT: z.coerce.number().default(5000),
  ADMIN_EMAIL: z.email().default("admin@pulsepay.local"),
  ADMIN_PASSWORD: z.string().min(8).default("admin12345"),
});

export const env = schema.parse(process.env);
