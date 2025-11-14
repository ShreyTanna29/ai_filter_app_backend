import { Router, Request, Response } from "express";
import axios from "axios";
import type { RequestHandler } from "express";
// S3 migration: replace Cloudinary deletion with S3 object removal
import { deleteObject } from "../lib/s3";
import { signKey, deriveKey } from "../middleware/signedUrl";
import prisma from "../lib/prisma";

const router = Router();

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
    const videos: any[] = await prisma.generatedVideo.findMany({
      where: { feature: req.params.endpoint },
      orderBy: { createdAt: "desc" },
    });
    // Map stored URL (which may be raw S3 path or legacy Cloudinary) to signed URL if S3
    const out = await Promise.all(
      videos.map(async (v) => {
        let signed = v.url;
        try {
          if (v.url && /amazonaws\.com\//.test(v.url)) {
            const key = deriveKey(v.url);
            signed = await signKey(key);
          }
        } catch (e) {
          // keep original URL if signing fails
        }
        return { ...v, signedUrl: signed };
      })
    );
    res.json(out);
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

// Delete a generated video (S3 + DB)
router.delete("/videos/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const video = await prisma.generatedVideo.findUnique({ where: { id } });
    if (!video) {
      res.status(404).json({ error: "Video not found" });
      return;
    }
    // Derive S3 key from stored URL: assume pattern https://<bucket or cdn>/<key>
    try {
      if (video.url) {
        const u = new URL(video.url);
        // Remove leading slash
        const key = u.pathname.startsWith("/")
          ? u.pathname.slice(1)
          : u.pathname;
        await deleteObject(key);
      }
    } catch (e) {
      console.warn("S3 delete failed (non-fatal):", e);
    }
    await prisma.generatedVideo.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting generated video:", error);
    res.status(500).json({ error: "Failed to delete video" });
  }
});

// Use GeneratedVideo instead of FeatureGraphic: return latest video per endpoint (now S3 URLs)
router.get("/feature-graphic", async (req: Request, res: Response) => {
  try {
    const latestVideos = await prisma.generatedVideo.findMany({
      // 1. Get only one row for each unique 'feature'
      distinct: ["feature"],

      // 2. Define the order to pick the "first" one
      orderBy: [
        { feature: "asc" }, // Order by the distinct column first
        { createdAt: "desc" }, // Then, order by date to get the newest
      ],

      // 3. Only select the fields you actually need
      select: {
        feature: true,
        url: true,
      },
    });

    // The database has already done all the work!
    const result = await Promise.all(
      latestVideos.map(async (v) => {
        let signed = v.url;
        try {
          if (v.url && /amazonaws\.com\//.test(v.url)) {
            signed = await signKey(deriveKey(v.url));
          }
        } catch {}
        return { endpoint: v.feature, graphicUrl: signed };
      })
    );

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

router.get("/photo-graphic", async (req: Request, res: Response) => {
  try {
    const latestPhotos = await prisma.generated_Photo.findMany({
      distinct: ["feature"],
      orderBy: [{ feature: "asc" }, { createdAt: "desc" }],
      select: {
        feature: true,
        url: true,
        createdAt: true,
      },
    });

    const result = await Promise.all(
      latestPhotos.map(async (photo) => {
        let signed = photo.url;
        try {
          if (photo.url && /amazonaws\.com\//.test(photo.url)) {
            signed = await signKey(deriveKey(photo.url));
          }
        } catch {}
        return {
          endpoint: photo.feature,
          graphicUrl: signed,
          createdAt: photo.createdAt,
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error("Error computing photo graphics:", error);
    res.status(500).json({ error: "Failed to get photo graphics" });
  }
});

router.get("/photo-graphic/:endpoint", async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.params;
    const photos = await prisma.generated_Photo.findMany({
      where: { feature: endpoint },
      orderBy: { createdAt: "desc" },
      take: 18,
    });

    const out = await Promise.all(
      photos.map(async (p) => {
        let signed = p.url;
        try {
          if (p.url && /amazonaws\.com\//.test(p.url)) {
            signed = await signKey(deriveKey(p.url));
          }
        } catch {}
        return { ...p, signedUrl: signed };
      })
    );
    res.json(out);
  } catch (error) {
    console.error("Error fetching generated photos:", error);
    res.status(500).json({ error: "Failed to fetch generated photos" });
  }
});

export default router;
