import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { getRecentSystemLogs } from "../services/systemLogService";
import { simulateConcurrentTransfers } from "../services/transferService";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");

const buildTransactionXml = (items: Array<{
  id: string;
  senderEmail: string;
  receiverEmail: string;
  amount: number;
  status: string;
  retryCount: number;
  createdAt: Date;
  description?: string | null;
  failureReason?: string | null;
}>) => {
  const rows = items
    .map(
      (tx) => `    <transaction>\n      <id>${escapeXml(tx.id)}</id>\n      <senderEmail>${escapeXml(tx.senderEmail)}</senderEmail>\n      <receiverEmail>${escapeXml(tx.receiverEmail)}</receiverEmail>\n      <amount>${tx.amount}</amount>\n      <status>${escapeXml(tx.status)}</status>\n      <retryCount>${tx.retryCount}</retryCount>\n      <createdAt>${tx.createdAt.toISOString()}</createdAt>\n      <description>${escapeXml(tx.description ?? "")}</description>\n      <failureReason>${escapeXml(tx.failureReason ?? "")}</failureReason>\n    </transaction>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<transactions>\n${rows}\n</transactions>`;
};

export const allTransactions = async (req: Request, res: Response) => {
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize ?? 20), 1), 100);
  const skip = (page - 1) * pageSize;

  const [total, txns] = await Promise.all([
    prisma.transaction.count(),
    prisma.transaction.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { email: true } },
        receiver: { select: { email: true } },
      },
    }),
  ]);

  return res.json({
    total,
    page,
    pageSize,
    data: txns.map((tx: any) => ({
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
  });
};

export const exportTransactionsXml = async (_req: Request, res: Response) => {
  const txns = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      sender: { select: { email: true } },
      receiver: { select: { email: true } },
    },
  });

  const payload = buildTransactionXml(
    txns.map((tx: any) => ({
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

export const systemLogs = async (_req: Request, res: Response) => {
  const logs = await getRecentSystemLogs(100);

  return res.json(
    logs.map((log: any) => ({
      id: log.id,
      level: log.level,
      event: log.event,
      message: log.message,
      transactionId: log.transactionId,
      createdAt: log.createdAt,
    })),
  );
};

export const simulateTransactions = async (req: Request, res: Response) => {
  const amount = Math.max(Number(req.body?.amount ?? 10), 1);
  const [firstUser, secondUser] = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    take: 2,
    select: { id: true, email: true },
  });

  if (!firstUser || !secondUser) {
    return res.status(400).json({ message: "Need at least two users for simulation" });
  }

  const result = await simulateConcurrentTransfers(firstUser.id, secondUser.id, amount);

  return res.json({
    message: "Concurrency simulation completed",
    users: [firstUser.email, secondUser.email],
    result,
  });
};

export const dashboardStats = async (_req: Request, res: Response) => {
  const [successCount, failedCount, volume] = await Promise.all([
    prisma.transaction.count({ where: { status: "SUCCESS" } }),
    prisma.transaction.count({ where: { status: "FAILED" } }),
    prisma.transaction.aggregate({ _sum: { amount: true } }),
  ]);

  const recentTransactions = await prisma.transaction.findMany({
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const dailyMap = new Map<string, number>();
  for (const tx of recentTransactions) {
    const day = tx.createdAt.toISOString().slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  }

  const daily = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7)
    .map(([day, count]) => ({ day, count }));

  return res.json({
    summary: {
      successCount,
      failedCount,
      totalVolume: Number(volume._sum.amount ?? 0),
    },
    daily,
    statusSplit: [
      { name: "Success", value: successCount },
      { name: "Failed", value: failedCount },
    ],
  });
};
