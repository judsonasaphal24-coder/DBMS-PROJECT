-- PulsePay indexing recommendations for PostgreSQL
-- Improves transaction history lookups, admin dashboards, and failure analysis.

-- Core lookup indexes (sender, receiver, time)
CREATE INDEX IF NOT EXISTS idx_txn_sender_id
  ON "Transaction" ("senderId");

CREATE INDEX IF NOT EXISTS idx_txn_receiver_id
  ON "Transaction" ("receiverId");

CREATE INDEX IF NOT EXISTS idx_txn_created_at
  ON "Transaction" ("createdAt" DESC);

-- Filter-heavy index for status-based analytics
CREATE INDEX IF NOT EXISTS idx_txn_status
  ON "Transaction" (status);

-- Composite index for common admin filters
CREATE INDEX IF NOT EXISTS idx_txn_status_created_at
  ON "Transaction" (status, "createdAt" DESC);

-- Wallet index for balance update path
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_user_id
  ON "Wallet" ("userId");

-- System log access patterns
CREATE INDEX IF NOT EXISTS idx_syslog_created_at
  ON "SystemLog" ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_syslog_transaction_id
  ON "SystemLog" ("transactionId");

-- Optional expression index for high-value scan
CREATE INDEX IF NOT EXISTS idx_txn_amount
  ON "Transaction" (amount);

-- Performance note:
-- Use EXPLAIN ANALYZE before and after index creation to show measurable improvements in report.
