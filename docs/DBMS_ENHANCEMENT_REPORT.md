# PulsePay DBMS Enhancement Report (Course Submission Ready)

This document extends the existing PulsePay project for DBMS scoring criteria without changing the core architecture (React + Express + Prisma).

## What Was Extended

1. Added DBMS asset documents in docs/dbms-assets.
2. Added SQL showcase scripts in backend/sql.
3. Added reusable XML serializer utility in backend/src/utils/xml.ts.
4. Added user-facing XML export endpoint in backend/src/controllers/userController.ts and backend/src/routes/userRoutes.ts.
5. Reused existing admin XML export endpoint in backend/src/controllers/adminController.ts.

## 1) ER Diagram and Schema Design

See: docs/dbms-assets/ER_SCHEMA_3NF.md

Highlights:
- ER entities covered: User, Account(Wallet), Transaction, Admin, SystemLog.
- Relational schema includes PK/FK mappings.
- 3NF justification provided with anomaly prevention explanation.

Viva line:
The PulsePay schema is normalized to 3NF because each table stores one entity type, foreign keys represent relationships, and non-key attributes depend only on the primary key.

## 2) SQL Query Showcase

See: backend/sql/query_showcase.sql

Includes:
- SELECT with conditions.
- JOIN-based transaction stream.
- GROUP BY and aggregates.
- Nested subquery.
- High-value and failed-transfer analytics.

Viva line:
These SQL queries show both transaction processing and decision-support use cases, matching real banking workloads.

## 3) XML Data Integration

Implemented endpoints:
- GET /api/admin/transactions/export/xml
- GET /api/user/transactions/export/xml

Implementation files:
- backend/src/utils/xml.ts
- backend/src/controllers/adminController.ts
- backend/src/controllers/userController.ts
- backend/src/routes/userRoutes.ts

Sample XML, XPath, and XQuery:
- docs/dbms-assets/XML_OQL_DEADLOCK_VIVA.md

Viva line:
XML export demonstrates semi-structured data interoperability while preserving relational storage for transactional integrity.

## 4) OQL Mapping

See: docs/dbms-assets/XML_OQL_DEADLOCK_VIVA.md

What is covered:
- Prisma object relations mapped to OQL concepts.
- OQL-style examples for high-value, failed, and low-balance analysis.

Viva line:
Although the physical database is relational, Prisma relations enable object-style querying semantics that align with OQL concepts.

## 5) Deadlock Scenario Documentation

See: docs/dbms-assets/XML_OQL_DEADLOCK_VIVA.md

What is covered:
- A->B and B->A concurrent transfer deadlock scenario.
- Step-by-step lock wait cycle.
- Existing project strategy: serializable isolation, lock ordering, retry with rollback.

Viva line:
PulsePay handles deadlock using prevention (consistent lock ordering) plus recovery (automatic rollback and retry).

## 6) Indexing and Optimization

See: backend/sql/indexing_optimization.sql

What is covered:
- Sender, receiver, status, amount, time, and log indexes.
- Composite index example for dashboard filters.

Viva line:
Indexes reduce full scans and improve latency for transaction history, monitoring, and analytics endpoints.

## 7) Triggers and Stored Procedures

See: backend/sql/trigger_procedure_postgres.sql

What is covered:
- Trigger for automatic audit logging after transaction insert.
- Stored procedure for safe transfer using row-level locks and validation.

Viva line:
Trigger and procedure examples show DB-side automation and transactional control commonly expected in banking systems.

## 8) Viva Summary (Short Answer Pack)

1. Why normalization: Prevent redundancy and update anomalies.
2. Why ACID: Ensure reliable all-or-nothing money transfer.
3. Why serializable isolation: Avoid inconsistent concurrent balance updates.
4. Why retry logic: Recover from deadlock/serialization failures automatically.
5. Why XML: Support interoperable exchange/reporting format.
6. Why indexes: Improve read/query performance for key workloads.
7. Why trigger/procedure: Demonstrate advanced DB-level automation and safety.

## Step-by-step Demo Plan for Evaluation

1. Start backend and frontend normally.
2. Perform transfers from user dashboard.
3. Open admin transactions and stats.
4. Call XML export endpoint and show structured output.
5. Run SQL showcase queries in PostgreSQL client.
6. Explain deadlock scenario using concurrent simulation endpoint.
7. Present indexing and trigger/procedure scripts as advanced DBMS extension.

## Notes on Compatibility

- The extensions do not alter application architecture.
- SQL assets are PostgreSQL-compatible by design.
- Prisma model relationships remain the same and are used directly by new XML export code.
