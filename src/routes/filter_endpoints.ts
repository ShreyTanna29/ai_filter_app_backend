import { Router, Request, Response } from "express";
import axios from "axios";
import { features } from "../filters/features";

// ...existing code...
const router = Router();

// ...existing code...

// Check for duplicate endpoints
const endpointSet = new Set<string>();
for (const feature of features) {
  if (endpointSet.has(feature.endpoint)) {
    throw new Error(`Duplicate endpoint found: ${feature.endpoint}`);
  }
  endpointSet.add(feature.endpoint);
}

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

    // Store generated video URL in DB
    try {
      const { PrismaClient } = require("../generated/prisma/client");
      const prisma = new PrismaClient();
      await prisma.generatedVideo.create({
        data: {
          feature: req.params.endpoint || req.path.replace("/", ""),
          url: result.output.video_url,
        },
      });
    } catch (dbError) {
      console.error("Failed to save generated video to DB:", dbError);
    }
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

// Endpoint to get all generated videos for a feature (must be outside the main function)
router.get("/videos/:endpoint", async (req: Request, res: Response) => {
  try {
    const { PrismaClient } = require("../generated/prisma/client");
    const prisma = new PrismaClient();
    // FIX: Use featureId instead of feature in Prisma query
    const videos = await prisma.generatedVideo.findMany({
      where: { feature: req.params.endpoint },
      orderBy: { createdAt: "desc" },
    });
    res.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

// Set the graphic video for an endpoint
router.post(
  "/feature-graphic/:endpoint",
  function (req: Request, res: Response) {
    (async () => {
      const endpoint = req.params.endpoint;
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "Missing video url" });
      }
      try {
        const { PrismaClient } = require("../generated/prisma/client");
        const prisma = new PrismaClient();
        const upserted = await prisma.featureGraphic.upsert({
          where: { endpoint },
          update: { graphicUrl: url },
          create: { endpoint, graphicUrl: url },
        });
        res.json(upserted);
      } catch (error) {
        console.error("Error saving feature graphic:", error);
        res.status(500).json({ error: "Failed to save feature graphic" });
      }
    })();
  }
);

// Get the graphic video for all endpoints
router.get("/feature-graphic", function (req: Request, res: Response) {
  (async () => {
    try {
      const { PrismaClient } = require("../generated/prisma/client");
      const prisma = new PrismaClient();
      const all = await prisma.featureGraphic.findMany();
      res.json(all);
    } catch (error) {
      console.error("Error fetching feature graphics:", error);
      res.status(500).json({ error: "Failed to fetch feature graphics" });
    }
  })();
});

// Create endpoints for each feature
for (const feature of features) {
  router.post(`/${feature.endpoint}`, (req: Request, res: Response) =>
    alibabaImageToVideo(req, res, feature.prompt)
  );
}

export default router;
