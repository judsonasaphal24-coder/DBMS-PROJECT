import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

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
      createdAt: tx.createdAt,
      description: tx.description,
      failureReason: tx.failureReason,
    })),
  });
};

export const dashboardStats = async (_req: Request, res: Response) => {
  const [successCount, failedCount, volume] = await Promise.all([
    prisma.transaction.count({ where: { status: "SUCCESS" } }),
    prisma.transaction.count({ where: { status: "FAILED" } }),
    prisma.transaction.aggregate({ _sum: { amount: true } }),
  ]);

  const dailyRaw = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
    SELECT DATE("createdAt") AS day, COUNT(*)::bigint AS count
    FROM "Transaction"
    GROUP BY DATE("createdAt")
    ORDER BY DATE("createdAt") DESC
    LIMIT 7
  `;

  return res.json({
    summary: {
      successCount,
      failedCount,
      totalVolume: Number(volume._sum.amount ?? 0),
    },
    daily: dailyRaw
      .map((d: { day: Date; count: bigint }) => ({ day: d.day.toISOString().slice(0, 10), count: Number(d.count) }))
      .reverse(),
    statusSplit: [
      { name: "Success", value: successCount },
      { name: "Failed", value: failedCount },
    ],
  });
};
