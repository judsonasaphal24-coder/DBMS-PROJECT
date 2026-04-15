import { LogLevel } from "@prisma/client";
import { prisma } from "../lib/prisma";

export type SystemLogEvent =
  | "TRANSACTION_STARTED"
  | "LOCK_ACQUIRED"
  | "DEADLOCK_DETECTED"
  | "RETRYING"
  | "TRANSACTION_COMMITTED"
  | "TRANSACTION_FAILED"
  | "TRANSACTION_RETRIED";

export const appendSystemLog = async ({
  level = LogLevel.INFO,
  event,
  message,
  transactionId,
}: {
  level?: LogLevel;
  event: SystemLogEvent;
  message: string;
  transactionId?: string;
}) => {
  try {
    return await prisma.systemLog.create({
      data: {
        level,
        event,
        message,
        transactionId,
      },
    });
  } catch {
    return null;
  }
};

export const getRecentSystemLogs = async (take = 50) =>
  prisma.systemLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
  });
