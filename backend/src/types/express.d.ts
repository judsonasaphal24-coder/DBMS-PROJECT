declare namespace Express {
  interface Request {
    user?: {
      userId: string;
      role: "USER" | "ADMIN";
    };
  }
}
