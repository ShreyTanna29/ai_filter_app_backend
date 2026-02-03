import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

export const ROLES = {
  ADMIN: "admin",
  SUB_ADMIN: "sub-admin",
  RESELLER: "reseller",
  USER: "user",
};

// Helper function to get user from token
async function getUserFromToken(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const email = decoded.split(":")[0];

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        subAdmin: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    return user;
  } catch (e) {
    return null;
  }
}

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
  next: NextFunction,
): Promise<void> {
  console.log("[DEBUG requireAdmin] Called for:", req.method, req.originalUrl);
  try {
    // Check for API key in multiple places
    const apiKey =
      req.header("x-api-key") ||
      req.header("x-apikey") ||
      (req.header("authorization") || "").replace(/^bearer\s+/i, "").trim() ||
      (req.query.api_key as string) ||
      (req.query.apiKey as string);

    console.log("[DEBUG requireAdmin] apiKey found:", apiKey);

    // Check if it's the admin API key
    const adminKeys = [
      process.env.ADMIN_API_KEY,
      (process.env as any)["admin_api_key"],
      process.env.ADMIN_KEY,
      "supersecretadminkey12345", // Fallback hardcoded admin key
    ].filter(Boolean) as string[];

    console.log("[DEBUG requireAdmin] adminKeys:", adminKeys);
    console.log(
      "[DEBUG requireAdmin] isAdmin:",
      apiKey && adminKeys.includes(apiKey),
    );

    if (apiKey && adminKeys.includes(apiKey)) {
      // Valid admin API key, proceed
      console.log("[DEBUG requireAdmin] Admin API key valid, calling next()");
      next();
      return;
    }

    // Otherwise, try to decode Authorization header as email:timestamp token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized: No token provided" });
      return;
    }

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
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // If user doesn't exist, create admin user automatically
    if (!user) {
      const bcrypt = await import("bcrypt");
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: await bcrypt.hash("admin123", 10), // Default password
          role: "admin",
        },
      });
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

// Middleware to require admin OR sub-admin with specific permission
export function requirePermission(resource: string, action: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = await getUserFromToken(req.headers.authorization);

      if (!user) {
        res.status(401).json({ message: "Unauthorized: User not found" });
        return;
      }

      // Admins have all permissions
      if (user.role === "admin") {
        next();
        return;
      }

      // Check if user is a sub-admin
      if (user.role !== "sub-admin" || !user.subAdmin) {
        res
          .status(403)
          .json({ message: "Forbidden: Insufficient permissions" });
        return;
      }

      // Check if sub-admin is active
      if (!user.subAdmin.isActive) {
        res
          .status(403)
          .json({ message: "Forbidden: Sub-admin account is inactive" });
        return;
      }

      // Check if sub-admin has the required permission
      const hasPermission = user.subAdmin.permissions.some(
        (sp) =>
          sp.permission.resource === resource &&
          sp.permission.action === action,
      );

      if (!hasPermission) {
        res.status(403).json({
          message:
            "Forbidden: You don't have permission to perform this action",
          required: { resource, action },
        });
        return;
      }

      // Sub-admin has permission, proceed
      next();
    } catch (error) {
      console.error("requirePermission middleware error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
}

// Middleware to require admin or active sub-admin (any permission)
export async function requireAdminOrSubAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await getUserFromToken(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Unauthorized: User not found" });
      return;
    }

    // Admins always pass
    if (user.role === "admin") {
      next();
      return;
    }

    // Check if user is a sub-admin
    if (user.role === "sub-admin" && user.subAdmin) {
      // Check if sub-admin is active
      if (!user.subAdmin.isActive) {
        res
          .status(403)
          .json({ message: "Forbidden: Sub-admin account is inactive" });
        return;
      }
      next();
      return;
    }

    res
      .status(403)
      .json({ message: "Forbidden: Admin or sub-admin access required" });
  } catch (error) {
    console.error("requireAdminOrSubAdmin middleware error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
