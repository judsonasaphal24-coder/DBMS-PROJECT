import { Router } from "express";
import { allTransactions, dashboardStats, exportTransactionsXml, simulateTransactions, systemLogs } from "../controllers/adminController";
import { requireAuth, requireRole } from "../middleware/auth";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireRole("ADMIN"));
adminRoutes.get("/transactions", allTransactions);
adminRoutes.get("/transactions/export/xml", exportTransactionsXml);
adminRoutes.post("/simulate-transactions", simulateTransactions);
adminRoutes.get("/logs", systemLogs);
adminRoutes.get("/stats", dashboardStats);
