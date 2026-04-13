import { NextFunction, Request, Response } from "express";

export const notFound = (_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
};

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const err = error as { message?: string; status?: number };
  res.status(err.status ?? 500).json({ message: err.message ?? "Internal server error" });
};
