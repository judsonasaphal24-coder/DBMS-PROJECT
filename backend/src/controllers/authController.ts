import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../utils/jwt";

const userSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

const getValidationMessage = (error: z.ZodError) =>
  error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; ");

export const register = async (req: Request, res: Response) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: getValidationMessage(parsed.error) });
  }
  const input = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      wallet: { create: { balance: 1000 } },
    },
    include: { wallet: true },
  });

  const token = signToken({ userId: user.id, role: "USER" });
  return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
};

export const login = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: getValidationMessage(parsed.error) });
  }
  const input = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = signToken({ userId: user.id, role: "USER" });
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
};

export const adminLogin = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: getValidationMessage(parsed.error) });
  }
  const input = parsed.data;
  const admin = await prisma.admin.findUnique({ where: { email: input.email } });

  if (!admin || !(await bcrypt.compare(input.password, admin.passwordHash))) {
    return res.status(401).json({ message: "Invalid admin credentials" });
  }

  const token = signToken({ userId: admin.id, role: "ADMIN" });
  return res.json({ token, admin: { id: admin.id, email: admin.email } });
};
