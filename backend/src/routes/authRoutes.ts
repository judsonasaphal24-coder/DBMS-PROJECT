import { Router } from "express";
import { adminLogin, forgotPassword, login, register, resetPassword } from "../controllers/authController";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/forgot-password", forgotPassword);
authRoutes.post("/reset-password", resetPassword);
authRoutes.post("/admin/login", adminLogin);
