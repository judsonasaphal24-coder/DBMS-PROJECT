import { LogLevel, Prisma, TransactionStatus } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { appendSystemLog } from "./systemLogService";

type TransferInput = {
  senderId: string;
  receiverId: string;
  amount: number;
  description?: string;
  lockOrder?: "sorted" | "sender-first" | "receiver-first";
  holdMs?: number;
};

type LockedWallet = {
  id: string;
  userId: string;
  balance: Prisma.Decimal;
};

const isPostgres = env.DATABASE_URL.startsWith("postgresql");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const pickLockOrder = (
  senderId: string,
  receiverId: string,
  lockOrder: TransferInput["lockOrder"] = "sorted",
) => {
  if (lockOrder === "sender-first") {
    return [senderId, receiverId] as const;
  }

  if (lockOrder === "receiver-first") {
    return [receiverId, senderId] as const;
  }

  return [senderId, receiverId].sort() as [string, string];
};

const lockWallets = async (
  tx: Prisma.TransactionClient,
  senderId: string,
  receiverId: string,
  lockOrder: TransferInput["lockOrder"],
) => {
  const [firstId, secondId] = pickLockOrder(senderId, receiverId, lockOrder);

  if (isPostgres) {
    const wallets = await tx.$queryRaw<LockedWallet[]>`
      SELECT id, "userId", balance
      FROM "Wallet"
      WHERE "userId" IN (${firstId}, ${secondId})
      ORDER BY CASE WHEN "userId" = ${firstId} THEN 0 ELSE 1 END
      FOR UPDATE
    `;

    const senderWallet = wallets.find((wallet) => wallet.userId === senderId);
    const receiverWallet = wallets.find((wallet) => wallet.userId === receiverId);
    return { senderWallet, receiverWallet };
  }

  const wallets = await tx.wallet.findMany({
    where: { userId: { in: [firstId, secondId] } },
    select: { id: true, userId: true, balance: true },
  });

  const senderWallet = wallets.find((wallet) => wallet.userId === senderId);
  const receiverWallet = wallets.find((wallet) => wallet.userId === receiverId);
  return { senderWallet, receiverWallet };
};

const createTransferRecord = async ({
  senderId,
  receiverId,
  amount,
  status,
  description,
  failureReason,
  retryCount,
}: {
  senderId: string;
  receiverId: string;
  amount: number;
  status: TransactionStatus;
  description?: string;
  failureReason?: string;
  retryCount: number;
}) =>
  prisma.transaction.create({
    data: {
      senderId,
      receiverId,
      amount,
      status,
      description,
      failureReason,
      retryCount,
    },
  });

export const transferMoney = async ({
  senderId,
  receiverId,
  amount,
  description,
  lockOrder = "sorted",
  holdMs = 0,
}: TransferInput) => {
  if (senderId === receiverId) {
    throw Object.assign(new Error("Cannot transfer to same account"), { status: 400 });
  }

  if (amount <= 0) {
    throw Object.assign(new Error("Amount must be greater than 0"), { status: 400 });
  }

  let retryCount = 0;
  let attempt = 0;
  let lastError: unknown;

  await appendSystemLog({
    event: "TRANSACTION_STARTED",
    message: `Transaction started from ${senderId} to ${receiverId} for ${amount}`,
  });

  while (attempt < 5) {
    try {
      const transaction = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const { senderWallet, receiverWallet } = await lockWallets(tx, senderId, receiverId, lockOrder);

          if (!senderWallet || !receiverWallet) {
            throw Object.assign(new Error("Wallet not found"), { status: 404 });
          }

          await appendSystemLog({
            event: "LOCK_ACQUIRED",
            message: `Lock acquired for ${senderId} and ${receiverId}`,
          });

          if (holdMs > 0) {
            await sleep(holdMs);
          }

          const senderBalance = Number(senderWallet.balance);
          if (senderBalance < amount) {
            const failed = await createTransferRecord({
              senderId,
              receiverId,
              amount,
              status: "FAILED",
              description,
              failureReason: "Insufficient balance",
              retryCount,
            });

            await appendSystemLog({
              level: LogLevel.ERROR,
              event: "TRANSACTION_FAILED",
              message: `Transaction failed because of insufficient balance`,
              transactionId: failed.id,
            });

            throw Object.assign(new Error("Insufficient balance"), { status: 400 });
          }

          await tx.wallet.update({
            where: { userId: senderId },
            data: { balance: { decrement: amount } },
          });

          await tx.wallet.update({
            where: { userId: receiverId },
            data: { balance: { increment: amount } },
          });

          const transaction = await tx.transaction.create({
            data: {
              senderId,
              receiverId,
              amount,
              status: retryCount > 0 ? "RETRIED" : "SUCCESS",
              retryCount,
              description,
            },
          });

          return transaction;
        },
        { isolationLevel: "Serializable" as Prisma.TransactionIsolationLevel },
      );

      await appendSystemLog({
        event: retryCount > 0 ? "TRANSACTION_RETRIED" : "TRANSACTION_COMMITTED",
        message:
          retryCount > 0
            ? `Transaction retried ${retryCount} time(s) and committed`
            : `Transaction committed successfully`,
      });

      return transaction;
    } catch (error) {
      lastError = error;
      attempt += 1;

      const err = error as { code?: string; meta?: { code?: string } };
      const code = err.code || err.meta?.code;
      const isRetriable = code === "P2034" || code === "40P01" || code === "40001";

      if (!isRetriable || attempt >= 5) {
        const failed = await createTransferRecord({
          senderId,
          receiverId,
          amount,
          status: "FAILED",
          description,
          failureReason: isRetriable ? "Deadlock or serialization failure" : (error as Error).message,
          retryCount,
        });

        await appendSystemLog({
          level: LogLevel.ERROR,
          event: "TRANSACTION_FAILED",
          message: `Transaction failed after ${retryCount} retry(s)`,
          transactionId: failed.id,
        });

        throw error;
      }

      retryCount += 1;

      await appendSystemLog({
        level: LogLevel.WARN,
        event: "DEADLOCK_DETECTED",
        message: `Deadlock detected for ${senderId} -> ${receiverId}`,
      });

      await appendSystemLog({
        level: LogLevel.WARN,
        event: "RETRYING",
        message: `Retrying transaction (${retryCount}) for ${senderId} -> ${receiverId}`,
      });

      await sleep(40 * 2 ** attempt);
    }
  }

  throw lastError;
};

export const simulateConcurrentTransfers = async (senderId: string, receiverId: string, amount: number) => {
  const [first, second] = await Promise.allSettled([
    transferMoney({ senderId, receiverId, amount, description: "Concurrency simulation A", lockOrder: "sender-first", holdMs: 120 }),
    transferMoney({ senderId: receiverId, receiverId: senderId, amount, description: "Concurrency simulation B", lockOrder: "receiver-first", holdMs: 120 }),
  ]);

  return {
    first: first.status,
    second: second.status,
  };
};
