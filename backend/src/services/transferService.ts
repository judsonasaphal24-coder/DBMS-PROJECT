import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { withDeadlockRetry } from "../utils/retry";

type TransferInput = {
  senderId: string;
  receiverId: string;
  amount: number;
  description?: string;
};

export const transferMoney = async ({ senderId, receiverId, amount, description }: TransferInput) => {
  if (senderId === receiverId) {
    throw Object.assign(new Error("Cannot transfer to same account"), { status: 400 });
  }

  if (amount <= 0) {
    throw Object.assign(new Error("Amount must be greater than 0"), { status: 400 });
  }

  return withDeadlockRetry(async () =>
    prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const wallets = await tx.wallet.findMany({
          where: { userId: { in: [senderId, receiverId] } },
          select: { id: true, userId: true, balance: true },
        });

        const senderWallet = wallets.find((w: { userId: string }) => w.userId === senderId);
        const receiverWallet = wallets.find((w: { userId: string }) => w.userId === receiverId);

        if (!senderWallet || !receiverWallet) {
          throw Object.assign(new Error("Wallet not found"), { status: 404 });
        }

        const senderBalance = Number(senderWallet.balance);
        if (senderBalance < amount) {
          await tx.transaction.create({
            data: {
              senderId,
              receiverId,
              amount,
              status: "FAILED",
              description,
              failureReason: "Insufficient balance",
            },
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
            status: "SUCCESS",
            description,
          },
        });

        return transaction;
      },
      { isolationLevel: "Serializable" as Prisma.TransactionIsolationLevel },
    ),
  );
};
