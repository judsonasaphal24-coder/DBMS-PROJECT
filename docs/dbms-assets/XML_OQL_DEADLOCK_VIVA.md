# PulsePay XML Integration, OQL Mapping, Deadlock Walkthrough, and Viva Notes

## 1) XML Data Integration

### Implemented Endpoints

- Admin export: GET /api/admin/transactions/export/xml
- User export (own history): GET /api/user/transactions/export/xml

The backend builds XML using a shared utility in backend/src/utils/xml.ts and returns payloads with Content-Type application/xml.

### XML Sample

```xml
<?xml version="1.0" encoding="UTF-8"?>
<transactions>
  <transaction>
    <id>cma8x123</id>
    <senderEmail>aarav@example.com</senderEmail>
    <receiverEmail>diya@example.com</receiverEmail>
    <amount>150</amount>
    <status>SUCCESS</status>
    <retryCount>0</retryCount>
    <createdAt>2026-04-18T09:10:20.000Z</createdAt>
    <description>Rent split</description>
    <failureReason></failureReason>
  </transaction>
</transactions>
```

### XPath Examples

High-value transactions:

```xpath
/transactions/transaction[number(amount) > 1000]
```

Failed transactions:

```xpath
/transactions/transaction[status = 'FAILED']
```

### XQuery Examples

High-value transactions:

```xquery
for $t in doc("transactions.xml")/transactions/transaction
where xs:decimal($t/amount) > 1000
return $t
```

Failed transactions:

```xquery
for $t in doc("transactions.xml")/transactions/transaction
where $t/status = 'FAILED'
return <failed>{ $t/id, $t/senderEmail, $t/receiverEmail, $t/failureReason }</failed>
```

### Viva-ready Explanation

XML export demonstrates semi-structured data integration from a relational system. PulsePay keeps transactional data in PostgreSQL/Prisma and provides XML output for interoperability and analytics tooling.

## 2) OQL Mapping (Conceptual)

Prisma models already represent object-style entities with relations:
- User has one Wallet.
- User has many sent and received Transactions.
- Transaction references sender and receiver User objects.

This is conceptually equivalent to object navigation in OQL.

### OQL-style Query Examples

```oql
SELECT t
FROM Transaction t
WHERE t.amount > 1000 AND t.status = "SUCCESS";
```

```oql
SELECT u
FROM User u
WHERE EXISTS tx IN u.sentTxns : tx.status = "FAILED";
```

```oql
SELECT u.email, u.wallet.balance
FROM User u
WHERE u.wallet.balance < 500;
```

### Viva-ready Explanation

OQL is used here as a conceptual layer: Prisma relation access (for example sender.email and receiver.email) maps to object graph querying, while PostgreSQL remains the physical relational engine.

## 3) Deadlock Scenario and Resolution

### Scenario

- Transaction T1: User A sends money to User B.
- Transaction T2: User B sends money to User A at the same time.

### Deadlock Formation Steps

1. T1 acquires lock on A wallet row.
2. T2 acquires lock on B wallet row.
3. T1 tries to lock B row and waits.
4. T2 tries to lock A row and waits.
5. Circular wait appears, so database detects deadlock and aborts one transaction.

### PulsePay Resolution

- Transfer logic runs in serializable transaction isolation.
- Wallet lock order is controlled to reduce circular wait.
- Retriable DB errors (deadlock/serialization) are detected.
- Exponential backoff retry executes up to configured attempts.
- On unrecoverable failure, rollback happens and FAILED status is persisted.

### Viva-ready Explanation

PulsePay handles deadlocks using two layers: prevention (consistent lock ordering) and recovery (rollback plus retry). This preserves atomicity and consistency under concurrent transfers.

## 4) Quick Viva Answers

- Why ACID matters: Banking transfers must be all-or-nothing and always consistent.
- Why serializable isolation: It prevents anomalies in concurrent balance updates.
- Why retry mechanism: Deadlocks and serialization conflicts are expected under load and should be recovered automatically.
- Why XML export: It demonstrates interoperability with semi-structured data systems.
- Why indexes: They reduce query time for history screens and admin analytics.
- Why trigger/procedure: They show DB-level automation and robust transactional design.
