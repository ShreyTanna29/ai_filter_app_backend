import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "your-super-secret-refresh-key";
const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days

// User roles
export const ROLES = {
  ADMIN: "admin",
  SUB_ADMIN: "sub-admin",
  RESELLER: "reseller",
};

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
      };
    }
  }
}

// Generate access token
export function generateAccessToken(user: {
  id: number;
  email: string;
  role: string;
}) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

// Generate refresh token
export function generateRefreshToken(user: {
  id: number;
  email: string;
  role: string;
}) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

// Verify access token middleware
export function verifyAccessToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ message: "Access token required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired access token" });
    return;
  }
}

// Verify refresh token
export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as any;
  } catch (error) {
    return null;
  }
}

// Role-based access middleware
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user && req.user.role === role) {
      next();
      return;
    }
    res.status(403).json({ message: "Forbidden: insufficient role" });
  };
}

// Store refresh token in database
export async function storeRefreshToken(userId: number, refreshToken: string) {
  try {
    await prisma.refreshToken.upsert({
      where: { userId },
      update: { token: refreshToken },
      create: {
        userId,
        token: refreshToken,
      },
    });
  } catch (error) {
    console.error("Error storing refresh token:", error);
    throw error;
  }
}

// Validate refresh token from database
export async function validateRefreshToken(
  userId: number,
  refreshToken: string
) {
  try {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { userId },
    });
    return storedToken && storedToken.token === refreshToken;
  } catch (error) {
    console.error("Error validating refresh token:", error);
    return false;
  }
}

// Revoke refresh token
export async function revokeRefreshToken(userId: number) {
  try {
    await prisma.refreshToken.delete({
      where: { userId },
    });
  } catch (error) {
    console.error("Error revoking refresh token:", error);
  }
}
