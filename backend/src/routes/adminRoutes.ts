import { Router } from "express";
import { allTransactions, dashboardStats } from "../controllers/adminController";
import { requireAuth, requireRole } from "../middleware/auth";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireRole("ADMIN"));
adminRoutes.get("/transactions", allTransactions);
adminRoutes.get("/stats", dashboardStats);
