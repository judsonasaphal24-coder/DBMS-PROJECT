import { Router } from "express";
import { adminLogin, login, register, resetPassword } from "../controllers/authController";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/reset-password", resetPassword);
authRoutes.post("/admin/login", adminLogin);
