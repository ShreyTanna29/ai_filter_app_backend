import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
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

export interface LatestVideoResult {
  endpoint: string;
  key: string;
  url: string;
  lastModified: Date;
}

// Get the latest video for each feature directly from S3 (from both videos/ and generated-videos/)
export async function getLatestVideosFromS3(): Promise<LatestVideoResult[]> {
  const videosByFeature: Map<string, { key: string; lastModified: Date }> =
    new Map();

  // Fetch from both 'videos/' and 'generated-videos/' prefixes
  const prefixes = ["videos/", "generated-videos/"];

  for (const prefix of prefixes) {
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const response = await s3.send(command);

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key && obj.Key.endsWith(".mp4") && obj.LastModified) {
            // Extract feature from key: "videos/{feature}/{feature}-{timestamp}-{random}.mp4"
            // or "generated-videos/{feature}/{feature}-{timestamp}-{random}.mp4"
            const parts = obj.Key.split("/");
            if (parts.length >= 2) {
              const feature = parts[1]; // The folder name is the feature/endpoint

              const existing = videosByFeature.get(feature);
              if (!existing || obj.LastModified > existing.lastModified) {
                videosByFeature.set(feature, {
                  key: obj.Key,
                  lastModified: obj.LastModified,
                });
              }
            }
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
  }

  // Convert map to array of results
  const results: LatestVideoResult[] = [];
  for (const [endpoint, data] of videosByFeature) {
    results.push({
      endpoint,
      key: data.key,
      url: publicUrlFor(data.key),
      lastModified: data.lastModified,
    });
  }

  return results;
}

// Get all videos for a specific feature from S3 (from both videos/ and generated-videos/)
export async function getVideosForFeatureFromS3(
  feature: string
): Promise<{ key: string; url: string; lastModified: Date }[]> {
  const videos: { key: string; url: string; lastModified: Date }[] = [];
  const normalizedFeature = feature.replace(/[^a-zA-Z0-9_-]/g, "-");

  // Fetch from both 'videos/' and 'generated-videos/' prefixes
  const prefixes = [
    `videos/${normalizedFeature}/`,
    `generated-videos/${normalizedFeature}/`,
  ];

  for (const featurePrefix of prefixes) {
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: featurePrefix,
        ContinuationToken: continuationToken,
      });

      const response = await s3.send(command);

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key && obj.Key.endsWith(".mp4") && obj.LastModified) {
            videos.push({
              key: obj.Key,
              url: publicUrlFor(obj.Key),
              lastModified: obj.LastModified,
            });
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
  }

  // Sort by lastModified descending (newest first)
  videos.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

  return videos;
}

// Get all sounds organized by category from S3
export async function getSoundsFromS3(): Promise<{
  [category: string]: { key: string; url: string; name: string }[];
}> {
  const soundsByCategory: {
    [category: string]: { key: string; url: string; name: string }[];
  } = {};
  const soundsPrefix = "Sounds/";

  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: soundsPrefix,
      ContinuationToken: continuationToken,
    });

    const response = await s3.send(command);

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key && obj.Key.endsWith(".mp3")) {
          // Extract category and file name from key: "Sounds/{category}/{filename}.mp3"
          const parts = obj.Key.split("/");
          if (parts.length >= 3) {
            const category = parts[1]; // The folder name is the category
            const fileName = parts[parts.length - 1]; // The actual file name

            if (!soundsByCategory[category]) {
              soundsByCategory[category] = [];
            }

            soundsByCategory[category].push({
              key: obj.Key,
              url: publicUrlFor(obj.Key),
              name: fileName.replace(".mp3", ""), // Remove extension for display
            });
          }
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  // Sort sounds within each category by name
  for (const category in soundsByCategory) {
    soundsByCategory[category].sort((a, b) => a.name.localeCompare(b.name));
  }

  return soundsByCategory;
}
