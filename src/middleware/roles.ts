import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

export const ROLES = {
  ADMIN: "admin",
  SUB_ADMIN: "sub-admin",
  RESELLER: "reseller",
  USER: "user",
};

// Legacy session-based role check (optional, kept for compatibility)
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // @ts-ignore - session.user may not be typed in express-session
    if (req.session && req.session.user && req.session.user.role === role) {
      next();
      return;
    }
    res.status(403).json({ message: "Forbidden: insufficient role" });
  };
}

// Middleware to require admin role based on token in Authorization header
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized: No token provided" });
      return;
    }

    // Extract email from simple token (format: base64 encoded "email:timestamp")
    const token = authHeader.substring(7);
    let email: string;
    try {
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      email = decoded.split(":")[0];
    } catch (e) {
      res.status(401).json({ message: "Unauthorized: Invalid token" });
      return;
    }

    // Look up user in database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      res.status(401).json({ message: "Unauthorized: User not found" });
      return;
    }

    // Check if user has admin role
    if (user.role !== "admin") {
      res.status(403).json({ message: "Forbidden: Admin access required" });
      return;
    }

    // User is admin, proceed
    next();
  } catch (error) {
    console.error("requireAdmin middleware error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
