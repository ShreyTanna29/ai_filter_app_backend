import { Router, Request, Response } from "express";
import axios from "axios";
import type { RequestHandler } from "express";
import cloudinary from "cloudinary";
import { PrismaClient } from "../generated/prisma";

const router = Router();
const prisma = new PrismaClient();

// Duplicate endpoint validation is now handled by the database unique constraint
// on the endpoint column in the Features table

// Alibaba Cloud Model Studio configuration
const ALIBABA_API_BASE = "https://dashscope-intl.aliyuncs.com/api/v1";
const ALIBABA_API_KEY = process.env.ALIBABA_API_KEY;

if (!ALIBABA_API_KEY) {
  console.warn("ALIBABA_API_KEY not found in environment variables");
}

// Create video generation task
async function createVideoTask(
  imageUrl: string,
  prompt: string
): Promise<string> {
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

      // Wait 10 seconds before next poll
      await new Promise((resolve) => setTimeout(resolve, 10000));
      attempts++;
    } catch (error) {
      if (attempts >= maxAttempts - 1) {
        throw error;
      }
      // Wait 10 seconds before retry
      await new Promise((resolve) => setTimeout(resolve, 10000));
      attempts++;
    }
  }

  throw new Error("Task polling timeout");
}

// Main video generation function
async function alibabaImageToVideo(
  req: Request,
  res: Response,
  prompt: string
) {
  try {
    const { image_url, prompt: customPrompt } = req.body;

    if (!image_url) {
      res.status(400).json({ error: "image_url is required in request body." });
      return;
    }

    if (!ALIBABA_API_KEY) {
      res.status(500).json({ error: "Alibaba Cloud API key not configured." });
      return;
    }

    // Validate image URL format
    try {
      const url = new URL(image_url);

      // Check if it's a direct image file URL
      const imageExtensions = [".jpg", ".jpeg", ".png", ".bmp", ".webp"];
      const hasImageExtension = imageExtensions.some((ext) =>
        url.pathname.toLowerCase().endsWith(ext)
      );

      if (!hasImageExtension) {
        res.status(400).json({
          error:
            "Invalid image URL. Must be a direct link to an image file (JPG, PNG, BMP, WEBP).",
          details: "The URL should end with .jpg, .jpeg, .png, .bmp, or .webp",
        });
        return;
      }

      // Ensure it's HTTP or HTTPS
      if (!["http:", "https:"].includes(url.protocol)) {
        res.status(400).json({
          error: "Invalid image URL protocol. Must be HTTP or HTTPS.",
        });
        return;
      }
    } catch (urlError: any) {
      res.status(400).json({
        error: "Invalid image_url format. Must be a valid URL.",
        details: urlError.message,
      });
      return;
    }

    // Create video generation task
    const taskId = await createVideoTask(image_url, customPrompt || prompt);

    // Poll for completion
    const result = await pollTaskStatus(taskId);

    // Return the result in a format similar to the original Fal AI response
    res.json({
      video: {
        url: result.output.video_url,
        content_type: "video/mp4",
        file_name: `video_${taskId}.mp4`,
        file_size: 0, // Size not provided by Alibaba API
      },
      seed: Math.floor(Math.random() * 1000000), // Generate a random seed
      task_id: taskId,
      prompt: result.output.orig_prompt,
      actual_prompt: result.output.actual_prompt,
    });
  } catch (err: any) {
    console.error("Video generation error:", err);

    // Handle specific Alibaba Cloud errors
    if (err.response?.data) {
      const alibabaError = err.response.data;
      res.status(err.response.status || 500).json({
        error: alibabaError.message || "Alibaba Cloud API error",
        code: alibabaError.code,
        request_id: alibabaError.request_id,
        details:
          "Please ensure the image URL is a direct link to a valid image file (JPG, PNG, BMP, WEBP) that is publicly accessible.",
      });
    } else {
      res.status(500).json({
        error: err.message || "Failed to generate video",
        details: err.toString(),
      });
    }
  }
}

// Dynamic route to support renamed endpoints without server restart
router.post("/:endpoint", async (req: Request, res: Response, next) => {
  try {
    const requested = req.params.endpoint;
    const feature = await prisma.features.findUnique({
      where: { endpoint: requested },
    });
    if (!feature) {
      return next(); // not a known feature endpoint; allow other routes to handle
    }
    return alibabaImageToVideo(req, res, feature.prompt);
  } catch (e) {
    return next(e);
  }
});

// Endpoint to get all generated videos for a feature
router.get("/videos/:endpoint", async (req: Request, res: Response) => {
  try {
    const { PrismaClient } = require("../generated/prisma/client");
    const prisma = new PrismaClient();
    const videos: any[] = await prisma.generatedVideo.findMany({
      where: { feature: req.params.endpoint },
      orderBy: { createdAt: "desc" },
    });
    res.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

// Delete a generated video (Cloudinary + DB)
router.delete("/videos/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const { PrismaClient } = require("../generated/prisma/client");
    const prisma = new PrismaClient();
    const video = await prisma.generatedVideo.findUnique({ where: { id } });
    if (!video) {
      res.status(404).json({ error: "Video not found" });
      return;
    }
    // Extract public id from cloudinary URL
    let publicId: string | null = null;
    if (video.url) {
      const match = video.url.match(/\/upload\/v\d+\/(.+?)\.mp4/);
      if (match) publicId = match[1];
    }
    if (publicId) {
      try {
        await cloudinary.v2.uploader.destroy(publicId, {
          resource_type: "video",
        });
      } catch (e) {
        // Non-fatal – continue with DB deletion
        console.warn("Cloudinary delete failed for", publicId, e);
      }
    }
    await prisma.generatedVideo.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting generated video:", error);
    res.status(500).json({ error: "Failed to delete video" });
  }
});

// Use GeneratedVideo instead of FeatureGraphic: return latest video per endpoint
router.get("/feature-graphic", async (req: Request, res: Response) => {
  try {
    const { PrismaClient } = require("../generated/prisma/client");
    const prisma = new PrismaClient();
    // Get recent videos
    const all: any[] = await prisma.generatedVideo.findMany({
      orderBy: { createdAt: "desc" },
    });
    const seen = new Set<string>();
    const result: Array<{ endpoint: string; graphicUrl: string }> = [];
    for (const v of all) {
      const endpoint = (v.feature ?? v.featureId) as string;
      if (!endpoint || seen.has(endpoint)) continue;
      seen.add(endpoint);
      if (v.url) result.push({ endpoint, graphicUrl: v.url });
    }
    res.json(result);
  } catch (error) {
    console.error("Error computing feature graphics:", error);
    res.status(500).json({ error: "Failed to get feature graphics" });
  }
});

// Set the selected video as the feature's graphic (persist in FeatureGraphic table)
router.post(
  "/feature-graphic/:endpoint",
  async (req: Request, res: Response) => {
    try {
      const { url } = req.body as { url?: string };
      const endpoint = req.params.endpoint;
      if (!url) {
        res.status(400).json({ error: "Missing video url" });
        return;
      }
      const { PrismaClient } = require("../generated/prisma/client");
      const prisma = new PrismaClient();
      const exists = await prisma.generatedVideo.findFirst({
        where: { feature: endpoint, url },
      });
      if (!exists) {
        res.status(404).json({ error: "Video url not found for endpoint" });
        return;
      }
      // Upsert the FeatureGraphic record for this endpoint
      await prisma.featureGraphic.upsert({
        where: { endpoint },
        update: { graphicUrl: url },
        create: { endpoint, graphicUrl: url },
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting feature graphic:", error);
      res.status(500).json({ error: "Failed to set feature graphic" });
    }
  }
);

export default router;
