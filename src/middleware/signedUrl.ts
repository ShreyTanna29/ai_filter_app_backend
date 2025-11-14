import { Request, Response, NextFunction } from "express";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../lib/s3";

const BUCKET = process.env.AWS_S3_BUCKET || "";
const DEFAULT_TTL = parseInt(process.env.AWS_S3_SIGNED_URL_TTL || "3600", 10); // seconds

// Helper to derive key from stored URL or key
export function deriveKey(raw: string): string {
  try {
    // If it's a full URL, parse and strip leading slash
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      return u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
    }
    return raw; // assume already a key
  } catch {
    return raw;
  }
}

export async function signKey(
  key: string,
  ttlSeconds = DEFAULT_TTL
): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: ttlSeconds });
}

// Express middleware example usage (not yet wired): attaches signedUrl to res.locals for a given req.param 'key'
export const signAssetMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { key } = req.params;
    if (!key) return res.status(400).json({ error: "Missing key param" });
    const signed = await signKey(key);
    res.json({ key, signedUrl: signed, expiresIn: DEFAULT_TTL });
  } catch (e: any) {
    console.error("[SIGN] Error generating signed URL", e);
    res
      .status(500)
      .json({ error: "Failed to sign asset", details: e?.message });
  }
};
