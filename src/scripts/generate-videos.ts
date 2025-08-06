import axios from "axios";
import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { graphics } from "../filters/graphics";
import { features } from "../filters/features";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Alibaba Cloud Model Studio configuration
const ALIBABA_API_BASE = "https://dashscope-intl.aliyuncs.com/api/v1";
const ALIBABA_API_KEY = process.env.ALIBABA_API_KEY;

if (!ALIBABA_API_KEY) {
  console.error("ALIBABA_API_KEY not found in environment variables");
  process.exit(1);
}

// Create video generation task
async function createVideoTask(
  imageUrl: string,
  prompt: string
): Promise<string> {
  try {
    const response = await axios.post(
      `${ALIBABA_API_BASE}/services/aigc/video-generation/video-synthesis`,
      {
        model: "wan2.1-i2v-turbo",
        input: {
          prompt: prompt,
          img_url: imageUrl,
        },
        parameters: {
          resolution: "720P",
          duration: 5,
          prompt_extend: true,
          watermark: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ALIBABA_API_KEY}`,
          "Content-Type": "application/json",
          "X-DashScope-Async": "enable",
        },
      }
    );

    return response.data.output.task_id;
  } catch (error) {
    console.error("Error creating video task:", error);
    throw error;
  }
}

// Poll for task completion
async function pollTaskStatus(taskId: string): Promise<any> {
  const maxAttempts = 120; // 20 minutes with 10-second intervals
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(`${ALIBABA_API_BASE}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${ALIBABA_API_KEY}`,
        },
      });

      const taskStatus = response.data.output.task_status;

      if (taskStatus === "SUCCEEDED") {
        return response.data;
      } else if (taskStatus === "FAILED" || taskStatus === "CANCELED") {
        throw new Error(`Task failed with status: ${taskStatus}`);
      } else if (taskStatus === "UNKNOWN") {
        throw new Error("Task ID has expired or is invalid");
      }

      console.log(
        `Task ${taskId} status: ${taskStatus}, attempt ${
          attempts + 1
        }/${maxAttempts}`
      );

      // Wait 10 seconds before next poll
      await new Promise((resolve) => setTimeout(resolve, 10000));
      attempts++;
    } catch (error) {
      if (attempts >= maxAttempts - 1) {
        throw error;
      }
      console.log(`Error polling task ${taskId}, retrying...`);
      // Wait 10 seconds before retry
      await new Promise((resolve) => setTimeout(resolve, 10000));
      attempts++;
    }
  }

  throw new Error("Task polling timeout");
}

// Download video from URL
async function downloadVideo(
  videoUrl: string,
  filename: string
): Promise<string> {
  try {
    const response = await axios({
      method: "GET",
      url: videoUrl,
      responseType: "stream",
    });

    const filePath = path.join(__dirname, "downloads", filename);

    // Ensure downloads directory exists
    const downloadsDir = path.dirname(filePath);
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const writer = fs.createWriteStream(filePath);

    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      writer.on("finish", () => {
        console.log(`Video downloaded: ${filename}`);
        resolve(filePath);
      });
      writer.on("error", reject);
    });
  } catch (error) {
    console.error(`Error downloading video ${filename}:`, error);
    throw error;
  }
}

// Upload video to Cloudinary
async function uploadToCloudinary(
  filePath: string,
  publicId: string
): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "video",
      public_id: publicId,
      folder: "generated-videos",
      overwrite: true,
    });

    console.log(`Video uploaded to Cloudinary: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error(`Error uploading to Cloudinary:`, error);
    throw error;
  }
}

// Update graphics.ts file with new Cloudinary URLs
async function updateGraphicsFile(
  updates: Array<{ endpoint: string; cloudinaryUrl: string }>
) {
  try {
    const graphicsPath = path.join(__dirname, "..", "filters", "graphics.ts");
    let graphicsContent = fs.readFileSync(graphicsPath, "utf8");

    // Update each endpoint with its new Cloudinary URL
    for (const update of updates) {
      const regex = new RegExp(
        `(endpoint:\\s*"${update.endpoint}",[\\s\\S]*?generated_video_cloudinary_url:\\s*")([^"]*)(")`,
        "g"
      );

      graphicsContent = graphicsContent.replace(
        regex,
        `$1${update.cloudinaryUrl}$3`
      );
    }

    // Write the updated content back to the file
    fs.writeFileSync(graphicsPath, graphicsContent);
    console.log("Graphics file updated successfully");
  } catch (error) {
    console.error("Error updating graphics file:", error);
    throw error;
  }
}

// Main function to process all graphics
async function processAllGraphics() {
  const updates: Array<{ endpoint: string; cloudinaryUrl: string }> = [];

  for (const graphic of graphics) {
    try {
      console.log(`\n=== Processing ${graphic.endpoint} ===`);

      // Find the corresponding feature to get the prompt
      const feature = features.find((f) => f.endpoint === graphic.endpoint);
      if (!feature) {
        console.error(`No feature found for endpoint: ${graphic.endpoint}`);
        continue;
      }

      // Skip if already has a generated video URL
      if (graphic.generated_video_cloudinary_url) {
        console.log(
          `Skipping ${graphic.endpoint} - already has generated video`
        );
        continue;
      }

      // Create video generation task
      console.log(`Creating video task for ${graphic.endpoint}...`);
      const taskId = await createVideoTask(graphic.photo_url, feature.prompt);
      console.log(`Task created with ID: ${taskId}`);

      // Poll for completion
      console.log(`Polling for task completion...`);
      const result = await pollTaskStatus(taskId);
      const videoUrl = result.output.video_url;
      console.log(`Video generated: ${videoUrl}`);

      // Download the video
      const filename = `${graphic.endpoint}_${Date.now()}.mp4`;
      console.log(`Downloading video...`);
      const filePath = await downloadVideo(videoUrl, filename);

      // Upload to Cloudinary
      const publicId = `generated-videos/${graphic.endpoint}`;
      console.log(`Uploading to Cloudinary...`);
      const cloudinaryUrl = await uploadToCloudinary(filePath, publicId);

      // Store the update
      updates.push({
        endpoint: graphic.endpoint,
        cloudinaryUrl: cloudinaryUrl,
      });

      // Clean up downloaded file
      fs.unlinkSync(filePath);
      console.log(`Cleaned up downloaded file: ${filename}`);

      // Add delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.error(`Error processing ${graphic.endpoint}:`, error);
      continue;
    }
  }

  // Update the graphics.ts file with all new URLs
  if (updates.length > 0) {
    console.log(
      `\n=== Updating graphics file with ${updates.length} new URLs ===`
    );
    await updateGraphicsFile(updates);
  } else {
    console.log("\nNo new videos to update");
  }
}

// Error handling and logging
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  console.log("Starting video generation process...");
  processAllGraphics()
    .then(() => {
      console.log("Video generation process completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Video generation process failed:", error);
      process.exit(1);
    });
}

export { processAllGraphics };
