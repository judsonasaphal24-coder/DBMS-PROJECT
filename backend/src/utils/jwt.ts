import jwt from "jsonwebtoken";
import { env } from "../config/env";

type JwtPayload = {
  userId: string;
  role: "USER" | "ADMIN";
};

export const signToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: "12h" });

export const verifyToken = (token: string) =>
  jwt.verify(token, env.JWT_SECRET) as JwtPayload;
