-- PulsePay SQL Query Showcase (PostgreSQL style)
-- These queries align with real banking operations and admin analytics.

-- 1) SELECT with conditions: successful high-value transfers
SELECT id, "senderId", "receiverId", amount, status, "createdAt"
FROM "Transaction"
WHERE status = 'SUCCESS'
  AND amount >= 1000
ORDER BY "createdAt" DESC;

-- 2) JOIN query: human-readable transaction stream
SELECT
  t.id,
  su.email AS sender_email,
  ru.email AS receiver_email,
  t.amount,
  t.status,
  t."retry_count",
  t."createdAt"
FROM "Transaction" t
JOIN "User" su ON su.id = t."senderId"
JOIN "User" ru ON ru.id = t."receiverId"
ORDER BY t."createdAt" DESC;

-- 3) GROUP BY + aggregation: status-wise summary
SELECT
  status,
  COUNT(*) AS transaction_count,
  SUM(amount) AS total_volume,
  AVG(amount) AS avg_amount
FROM "Transaction"
GROUP BY status
ORDER BY transaction_count DESC;

-- 4) Nested query: users who sent more than 5000 total
SELECT u.id, u.name, u.email
FROM "User" u
WHERE u.id IN (
  SELECT t."senderId"
  FROM "Transaction" t
  WHERE t.status IN ('SUCCESS', 'RETRIED')
  GROUP BY t."senderId"
  HAVING SUM(t.amount) > 5000
)
ORDER BY u.name;

-- 5) Daily high-value transaction report
SELECT
  DATE(t."createdAt") AS txn_day,
  COUNT(*) AS high_value_count,
  SUM(t.amount) AS high_value_volume
FROM "Transaction" t
WHERE t.amount >= 1000
GROUP BY DATE(t."createdAt")
ORDER BY txn_day DESC;

-- 6) Failed transactions with latest retry attempts
SELECT
  t.id,
  su.email AS sender_email,
  ru.email AS receiver_email,
  t.amount,
  t."retry_count",
  t."failureReason",
  t."createdAt"
FROM "Transaction" t
JOIN "User" su ON su.id = t."senderId"
JOIN "User" ru ON ru.id = t."receiverId"
WHERE t.status = 'FAILED'
ORDER BY t."createdAt" DESC;
