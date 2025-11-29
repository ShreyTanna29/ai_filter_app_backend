/**
 * Migration script: Convert Cloudinary URLs to S3 URLs in GeneratedVideo table
 * Fetches actual video URLs from S3 bucket to verify they exist
 *
 * Run with: npx ts-node scripts/migrate-cloudinary-to-s3.ts
 * Or: npx tsx scripts/migrate-cloudinary-to-s3.ts
 */

// Load environment variables first
import "dotenv/config";

import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3, publicUrlFor } from "../src/lib/s3";
import prisma from "../src/lib/prisma";

const S3_BUCKET = process.env.AWS_S3_BUCKET || "ai-filters-vids";
const S3_REGION = process.env.AWS_REGION || "us-east-1";
const S3_BASE_URL = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`;

// Cache of all S3 video keys for fast lookup
let s3VideoCache: Map<string, string> = new Map(); // filename -> full S3 URL

// Load all video keys from S3 bucket into cache
async function loadS3VideoCache(): Promise<void> {
  console.log("Loading video list from S3 bucket...");
  console.log(`Bucket: ${S3_BUCKET}, Region: ${S3_REGION}`);

  let continuationToken: string | undefined;
  let totalCount = 0;

  do {
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: "videos/",
      ContinuationToken: continuationToken,
    });

    const response = await s3.send(command);

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key && obj.Key.endsWith(".mp4")) {
          // Extract filename from key (e.g., "videos/ai-bikini/ai-bikini-123.mp4" -> "ai-bikini-123.mp4")
          const filename = obj.Key.split("/").pop()!;
          const fullUrl = `${S3_BASE_URL}/${obj.Key}`;
          s3VideoCache.set(filename.toLowerCase(), fullUrl);
          totalCount++;
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  console.log(`Loaded ${totalCount} videos from S3 bucket\n`);
}

// Extract filename from any URL (Cloudinary, S3, or other)
function extractFilenameFromUrl(url: string): string | null {
  // Remove query parameters first
  const urlWithoutQuery = url.split("?")[0];
  // Match the filename at the end of the URL
  const match = urlWithoutQuery.match(/\/([^/]+\.mp4)$/i);
  return match ? match[1] : null;
}

// Find S3 URL for a video by matching filename
function findS3UrlForVideo(currentUrl: string): string | null {
  const filename = extractFilenameFromUrl(currentUrl);
  if (!filename) {
    return null;
  }

  // Look up in cache (case-insensitive)
  const s3Url = s3VideoCache.get(filename.toLowerCase());
  return s3Url || null;
}

async function migrateUrls() {
  console.log("Starting S3 URL sync for all videos...\n");

  // First, load all S3 videos into cache
  await loadS3VideoCache();

  // Get ALL videos from the table
  const videos = await prisma.generatedVideo.findMany({});

  console.log(`Found ${videos.length} total videos in database\n`);

  if (videos.length === 0) {
    console.log("No videos to process. Exiting.");
    return;
  }

  let successCount = 0;
  let skipCount = 0;
  let alreadyCorrectCount = 0;
  let errorCount = 0;
  const notFoundVideos: string[] = [];

  for (const video of videos) {
    const newUrl = findS3UrlForVideo(video.url);

    if (!newUrl) {
      const filename = extractFilenameFromUrl(video.url);
      console.log(
        `⏭️  Skipping ID ${video.id}: Video not found in S3 (${filename})`
      );
      notFoundVideos.push(`${video.id}: ${filename}`);
      skipCount++;
      continue;
    }

    // Check if URL is already correct
    if (video.url === newUrl) {
      alreadyCorrectCount++;
      continue;
    }

    try {
      await prisma.generatedVideo.update({
        where: { id: video.id },
        data: { url: newUrl },
      });
      console.log(`✅ ID ${video.id}: ${video.feature}`);
      console.log(`   Old: ${video.url.substring(0, 80)}...`);
      console.log(`   New: ${newUrl}`);
      successCount++;
    } catch (error) {
      console.error(`❌ ID ${video.id}: Failed to update`, error);
      errorCount++;
    }
  }

  console.log("\n--- Migration Summary ---");
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`✓  Already correct: ${alreadyCorrectCount}`);
  console.log(`⏭️  Skipped (not in S3): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total processed: ${videos.length}`);

  if (notFoundVideos.length > 0) {
    console.log("\n--- Videos Not Found in S3 ---");
    notFoundVideos.forEach((v) => console.log(`  - ${v}`));
  }
}

// Run the migration
migrateUrls()
  .then(() => {
    console.log("\nMigration complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
