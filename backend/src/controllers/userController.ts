import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { transferMoney } from "../services/transferService";
import { buildTransactionXml } from "../utils/xml";

const transferSchema = z.object({
  receiverEmail: z.email(),
  amount: z.number().positive(),
  description: z.string().max(120).optional(),
});

export const me = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { wallet: true },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    balance: Number(user.wallet?.balance ?? 0),
  });
};

export const transfer = async (req: Request, res: Response) => {
  const input = transferSchema.parse(req.body);
  const receiver = await prisma.user.findUnique({ where: { email: input.receiverEmail } });

  if (!receiver) {
    return res.status(404).json({ message: "Receiver not found" });
  }

  const transaction = await transferMoney({
    senderId: req.user!.userId,
    receiverId: receiver.id,
    amount: input.amount,
    description: input.description,
  });

  return res.status(201).json(transaction);
};

export const myTransactions = async (req: Request, res: Response) => {
  const items = await prisma.transaction.findMany({
    where: {
      OR: [{ senderId: req.user!.userId }, { receiverId: req.user!.userId }],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      sender: { select: { email: true, name: true } },
      receiver: { select: { email: true, name: true } },
    },
  });

  return res.json(
    items.map((tx: any) => ({
      id: tx.id,
      amount: Number(tx.amount),
      status: tx.status,
      retryCount: tx.retryCount,
      description: tx.description,
      createdAt: tx.createdAt,
      senderEmail: tx.sender.email,
      receiverEmail: tx.receiver.email,
      failureReason: tx.failureReason,
    })),
  );
};

export const myTransactionsXml = async (req: Request, res: Response) => {
  const items = await prisma.transaction.findMany({
    where: {
      OR: [{ senderId: req.user!.userId }, { receiverId: req.user!.userId }],
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      sender: { select: { email: true } },
      receiver: { select: { email: true } },
    },
  });

  const payload = buildTransactionXml(
    items.map((tx: any) => ({
      id: tx.id,
      senderEmail: tx.sender.email,
      receiverEmail: tx.receiver.email,
      amount: Number(tx.amount),
      status: tx.status,
      retryCount: tx.retryCount,
      createdAt: tx.createdAt,
      description: tx.description,
      failureReason: tx.failureReason,
    })),
  );

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  return res.send(payload);
};
