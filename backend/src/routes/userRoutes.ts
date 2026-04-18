import { Router } from "express";
import { me, myTransactions, myTransactionsXml, transfer } from "../controllers/userController";
import { requireAuth, requireRole } from "../middleware/auth";

export const userRoutes = Router();

userRoutes.use(requireAuth, requireRole("USER"));
userRoutes.get("/me", me);
userRoutes.post("/transfer", transfer);
userRoutes.get("/transactions", myTransactions);
userRoutes.get("/transactions/export/xml", myTransactionsXml);
