import { Request, Response, NextFunction } from "express";

export const ROLES = {
  ADMIN: "admin",
  SUB_ADMIN: "sub-admin",
  RESELLER: "reseller",
};

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.session && req.session.user && req.session.user.role === role) {
      next();
      return;
    }
    res.status(403).json({ message: "Forbidden: insufficient role" });
  };
}
