-- PulsePay trigger + stored procedure package (PostgreSQL)
-- Optional advanced DBMS component for coursework.

-- 1) Audit table for DB-level logging
CREATE TABLE IF NOT EXISTS "DbAuditLog" (
  id BIGSERIAL PRIMARY KEY,
  "transactionId" TEXT NOT NULL,
  action TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2) Trigger function: log every inserted transaction
CREATE OR REPLACE FUNCTION pulsepay_log_transaction_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "DbAuditLog" ("transactionId", action)
  VALUES (NEW.id, 'TRANSACTION_CREATED');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pulsepay_log_transaction_insert ON "Transaction";

CREATE TRIGGER trg_pulsepay_log_transaction_insert
AFTER INSERT ON "Transaction"
FOR EACH ROW
EXECUTE FUNCTION pulsepay_log_transaction_insert();

-- 3) Stored procedure: safe transfer with locking and rollback semantics
CREATE OR REPLACE PROCEDURE pulsepay_transfer_money(
  IN p_sender_id TEXT,
  IN p_receiver_id TEXT,
  IN p_amount NUMERIC,
  IN p_description TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  sender_balance NUMERIC;
BEGIN
  IF p_sender_id = p_receiver_id THEN
    RAISE EXCEPTION 'Sender and receiver cannot be the same';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  -- Row-level lock to prevent write conflicts during debit.
  SELECT balance INTO sender_balance
  FROM "Wallet"
  WHERE "userId" = p_sender_id
  FOR UPDATE;

  IF sender_balance IS NULL THEN
    RAISE EXCEPTION 'Sender wallet not found';
  END IF;

  IF sender_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Lock receiver wallet row as well.
  PERFORM 1
  FROM "Wallet"
  WHERE "userId" = p_receiver_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receiver wallet not found';
  END IF;

  UPDATE "Wallet"
  SET balance = balance - p_amount
  WHERE "userId" = p_sender_id;

  UPDATE "Wallet"
  SET balance = balance + p_amount
  WHERE "userId" = p_receiver_id;

  INSERT INTO "Transaction" (
    id,
    "senderId",
    "receiverId",
    amount,
    status,
    "retry_count",
    description,
    "createdAt"
  )
  VALUES (
    gen_random_uuid()::text,
    p_sender_id,
    p_receiver_id,
    p_amount,
    'SUCCESS',
    0,
    p_description,
    NOW()
  );
END;
$$;

-- Example call:
-- CALL pulsepay_transfer_money('user_a_id', 'user_b_id', 250, 'Course demo transfer');
