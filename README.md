# PulsePay (GPay Alternative Demo)

This project provides a demo payment application with:
- React frontend
- Node.js + Express + Prisma backend
- PostgreSQL database
- ACID-oriented transfer flow with serializable transactions
- Deadlock/serialization failure retry handling
- Admin login with transaction table and charts

## Tech Stack
- Frontend: React, TypeScript, Vite, Recharts
- Backend: Express, Prisma ORM, JWT auth, Zod validation
- Database: PostgreSQL (Docker Compose)

## Project Structure
- `frontend` React app
- `backend` Express API + Prisma schema
- `docker-compose.yml` PostgreSQL service

## 1) Start PostgreSQL
From project root:

```bash
docker compose up -d
```

## 2) Configure Backend
Copy env and run migrations:

```bash
cd backend
# .env is already created, adjust values if needed
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## 3) Run Backend

```bash
cd backend
npm run dev
```

Backend runs on `http://localhost:4000`.
Default seeded admin credentials:
- Email: `admin@pulsepay.local`
- Password: `admin12345`

Seeded demo users:
- Aarav Mehta: `aarav@example.com` / `User@1234`
- Diya Sharma: `diya@example.com` / `User@1234`
- Kabir Singh: `kabir@example.com` / `User@1234`

Try these demo actions after login:
- Aarav transfers `150` to `diya@example.com`
- Diya transfers `75` to `kabir@example.com`
- Kabir has one failed transfer record already in the seed data

## 4) Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Key API Endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/admin/login`
- `GET /api/user/me`
- `POST /api/user/transfer`
- `GET /api/user/transactions`
- `GET /api/admin/transactions?page=1&pageSize=20`
- `GET /api/admin/stats`

## ACID and Deadlock Handling Notes
- Transfers run inside a DB transaction with `SERIALIZABLE` isolation.
- Wallet rows are locked with `SELECT ... FOR UPDATE` in consistent order.
- Known retriable conflicts (`deadlock`, `serialization`) are retried with exponential backoff.
- Failed transfers due to insufficient balance are recorded with `FAILED` status.

## Basic Demo Flow
1. Register two users from frontend user page.
2. Login as user and transfer amount using receiver email.
3. Open admin page and login using seeded admin credentials.
4. View full transactions and chart summaries.
