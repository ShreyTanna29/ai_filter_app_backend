import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

function extractApiKey(req: Request): string | undefined {
  // Header forms
  const headerKey = (
    req.header("x-api-key") ||
    req.header("x-apikey") ||
    ""
  ).trim();
  if (headerKey) return headerKey;
  const auth = (req.header("authorization") || "").trim();
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  // Query forms
  const q = req.query as any;
  if (typeof q?.api_key === "string" && q.api_key.trim())
    return q.api_key.trim();
  if (typeof q?.apiKey === "string" && q.apiKey.trim()) return q.apiKey.trim();
  return undefined;
}

export async function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const provided = extractApiKey(req);
    const adminKeys = [
      process.env.ADMIN_API_KEY,
      (process.env as any)["admin_api_key"],
      process.env.ADMIN_KEY,
    ].filter(Boolean) as string[];

    if (provided && adminKeys.includes(provided)) {
      (req as any).apiKeyOwner = { type: "admin" };
      next();
      return;
    }

    if (!provided) {
      res.status(401).json({ success: false, message: "Missing API key" });
      return;
    }

    const app = await prisma.app.findFirst({
      where: { apiKey: provided, isActive: true },
    });
    if (!app) {
      res.status(401).json({ success: false, message: "Invalid API key" });
      return;
    }
    (req as any).apiKeyOwner = { type: "app", app };
    next();
    return;
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "API key validation failed" });
    return;
  }
}
