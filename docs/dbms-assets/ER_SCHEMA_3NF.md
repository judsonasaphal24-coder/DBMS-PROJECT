# PulsePay ER Model, Relational Schema, and 3NF Justification

## ER Model

```mermaid
erDiagram
  USER ||--|| ACCOUNT : owns
  USER ||--o{ TRANSACTION : sends
  USER ||--o{ TRANSACTION : receives
  TRANSACTION ||--o{ SYSTEM_LOG : produces

  USER {
    string id PK
    string name
    string email UNIQUE
    string passwordHash
    datetime createdAt
    datetime updatedAt
  }

  ACCOUNT {
    string id PK
    string userId FK
    decimal balance
    datetime createdAt
    datetime updatedAt
  }

  TRANSACTION {
    string id PK
    string senderId FK
    string receiverId FK
    decimal amount
    string status
    int retryCount
    string description
    string failureReason
    datetime createdAt
  }

  SYSTEM_LOG {
    string id PK
    string level
    string event
    string message
    string transactionId FK
    datetime createdAt
  }

  ADMIN {
    string id PK
    string email UNIQUE
    string passwordHash
    datetime createdAt
    datetime updatedAt
  }
```

Note: In code, ACCOUNT maps to the Prisma model Wallet.

## Relational Schema (PostgreSQL Naming)

- User(id PK, name, email UNIQUE, passwordHash, resetTokenHash, resetTokenExpiresAt, createdAt, updatedAt)
- Wallet(id PK, userId FK -> User.id UNIQUE, balance, createdAt, updatedAt)
- Transaction(id PK, senderId FK -> User.id, receiverId FK -> User.id, amount, status, retry_count, description, failureReason, createdAt)
- SystemLog(id PK, level, event, message, transactionId FK -> Transaction.id NULLABLE, createdAt)
- Admin(id PK, email UNIQUE, passwordHash, createdAt, updatedAt)

## 3NF Justification

1. First normal form (1NF): Every attribute is atomic; no repeating groups.
2. Second normal form (2NF): All non-key attributes depend on full primary key (single-column PKs across tables).
3. Third normal form (3NF): No transitive dependency inside a table.

Examples:
- Balance is in Wallet, not User.
- Sender and receiver details are referenced by foreign keys in Transaction, not duplicated.
- Operational logs are split into SystemLog, avoiding transaction table bloat.

## Viva-ready Explanation

The PulsePay schema is normalized to 3NF because each table stores one business entity, relationships are represented using foreign keys, and non-key attributes depend only on the table key. This minimizes redundancy and prevents update, insert, and delete anomalies.
