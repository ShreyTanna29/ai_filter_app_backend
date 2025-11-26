import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ObjectCannedACL,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import type { Readable } from "stream";
import Sharp from "sharp";

const REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.AWS_S3_BUCKET || "";
const PUBLIC_PREFIX = process.env.AWS_S3_PUBLIC_URL_PREFIX; // e.g. https://cdn.example.com or https://YOUR_BUCKET.s3.REGION.amazonaws.com

if (!BUCKET) {
  console.warn("[S3] AWS_S3_BUCKET is not set; uploads will fail.");
}

export const s3 = new S3Client({ region: REGION });

export function publicUrlFor(key: string): string {
  if (PUBLIC_PREFIX) {
    const base = PUBLIC_PREFIX.endsWith("/")
      ? PUBLIC_PREFIX.slice(0, -1)
      : PUBLIC_PREFIX;
    return `${base}/${key}`;
  }
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

export interface UploadResult {
  key: string;
  url: string;
}

export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  contentType?: string,
  acl?: ObjectCannedACL
): Promise<UploadResult> {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: acl,
  });
  await s3.send(cmd);
  return { key, url: publicUrlFor(key) };
}

export async function uploadStream(
  key: string,
  stream: Readable,
  contentType?: string,
  acl?: ObjectCannedACL
): Promise<UploadResult> {
  const uploader = new Upload({
    client: s3,
    params: {
      Bucket: BUCKET,
      Key: key,
      Body: stream,
      ContentType: contentType,
      ACL: acl,
    },
    queueSize: 4,
    partSize: 8 * 1024 * 1024,
    leavePartsOnError: false,
  });
  await uploader.done();
  return { key, url: publicUrlFor(key) };
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// Resize to 512x512 (cover) similar to Cloudinary fill crop center; returns Buffer
export async function resizeTo512(buffer: Buffer): Promise<Buffer> {
  return Sharp(buffer)
    .resize(512, 512, { fit: "cover", position: "centre" })
    .toFormat("png")
    .toBuffer();
}

// Derive a reasonable key path for images/videos
export function makeKey(opts: {
  type: "image" | "video" | "audio";
  feature?: string;
  originalName?: string;
  ext?: string;
}): string {
  const ts = Date.now();
  const base = opts.feature
    ? opts.feature.replace(/[^a-zA-Z0-9_-]/g, "-")
    : "generic";
  const ext =
    opts.ext ||
    (opts.type === "image" ? "png" : opts.type === "audio" ? "mp3" : "mp4");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${opts.type}s/${base}/${base}-${ts}-${rand}.${ext}`;
}

export async function ensure512SquareImageFromUrl(
  url: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
  const arrayBuf = await resp.arrayBuffer();
  const inputBuf = Buffer.from(arrayBuf);
  const resized = await resizeTo512(inputBuf);
  return { buffer: resized, contentType: "image/png" };
}

export async function ensureImageSizeFromUrl(
  url: string,
  width: number,
  height: number
): Promise<{ buffer: Buffer; contentType: string }> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
  const arrayBuf = await resp.arrayBuffer();
  const inputBuf = Buffer.from(arrayBuf);
  const resized = await Sharp(inputBuf)
    .resize(width, height, { fit: "cover", position: "centre" })
    .toFormat("png")
    .toBuffer();
  return { buffer: resized, contentType: "image/png" };
}
