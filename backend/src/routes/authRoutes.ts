import { Router } from "express";
import { adminLogin, login, register } from "../controllers/authController";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/admin/login", adminLogin);
