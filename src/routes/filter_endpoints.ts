import { Router, Request, Response } from "express";
import axios from "axios";
import type { RequestHandler } from "express";
// S3 migration: replace Cloudinary deletion with S3 object removal
import {
  deleteObject,
  getLatestVideosFromS3,
  getVideosForFeatureFromS3,
} from "../lib/s3";
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

// Endpoint to get all generated videos for a feature directly from S3
router.get("/videos/:endpoint", async (req: Request, res: Response) => {
  try {
    // Get videos directly from S3 bucket for this feature
    const videos = await getVideosForFeatureFromS3(req.params.endpoint);

    // Get database records with app permissions
    const dbVideos = await prisma.generatedVideo.findMany({
      where: { feature: req.params.endpoint },
      include: {
        apps: {
          include: {
            app: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Create a map of URL to database record
    const dbVideoMap = new Map(dbVideos.map((v) => [v.url, v]));

    // Sign S3 URLs for access and merge with database records
    const out = await Promise.all(
      videos.map(async (v, index) => {
        let signed = v.url;
        try {
          signed = await signKey(v.key);
        } catch (e) {
          // keep original URL if signing fails
        }

        const dbRecord = dbVideoMap.get(v.url);
        return {
          id: dbRecord?.id || index + 1, // Use DB ID if exists, otherwise generate pseudo-id
          feature: req.params.endpoint,
          url: v.url,
          key: v.key, // Include S3 key for deletion/selection operations
          createdAt: v.lastModified,
          signedUrl: signed,
          apps: dbRecord?.apps || [], // Include app permissions
        };
      })
    );
    res.json(out);
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

// Delete a generated video from S3 by key (passed as base64-encoded query param or in body)
router.delete("/videos/:endpoint", async (req: Request, res: Response) => {
  try {
    const { key } = req.body as { key?: string };
    if (!key) {
      res.status(400).json({ error: "Missing S3 key in request body" });
      return;
    }

    // Validate that the key belongs to the specified endpoint
    const endpoint = req.params.endpoint;
    const normalizedEndpoint = endpoint.replace(/[^a-zA-Z0-9_-]/g, "-");
    const validPrefixes = [
      `videos/${normalizedEndpoint}/`,
      `generated-videos/${normalizedEndpoint}/`,
    ];

    const isValidKey = validPrefixes.some((prefix) => key.startsWith(prefix));
    if (!isValidKey) {
      res
        .status(400)
        .json({ error: "Key does not match the specified endpoint" });
      return;
    }

    await deleteObject(key);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting generated video:", error);
    res.status(500).json({ error: "Failed to delete video" });
  }
});

// Update app permission for a generated video
router.post("/videos/app-permission", async (req: Request, res: Response) => {
  try {
    const { videoId, appId, allowed } = req.body as {
      videoId?: number;
      appId?: number;
      allowed?: boolean;
    };

    if (!videoId || !appId || typeof allowed !== "boolean") {
      res.status(400).json({
        error:
          "Missing or invalid parameters: videoId, appId, and allowed are required",
      });
      return;
    }

    // Verify the video and app exist
    const [video, app] = await Promise.all([
      prisma.generatedVideo.findUnique({ where: { id: videoId } }),
      prisma.app.findUnique({ where: { id: appId } }),
    ]);

    if (!video) {
      res.status(404).json({ error: "Video not found" });
      return;
    }

    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    if (allowed) {
      // Add permission if not exists
      await prisma.appGeneratedVideo.upsert({
        where: {
          appId_generatedVideoId: {
            appId,
            generatedVideoId: videoId,
          },
        },
        update: {},
        create: {
          appId,
          generatedVideoId: videoId,
        },
      });
    } else {
      // Remove permission if exists
      await prisma.appGeneratedVideo.deleteMany({
        where: {
          appId,
          generatedVideoId: videoId,
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating app permission:", error);
    res.status(500).json({ error: "Failed to update app permission" });
  }
});

// Return latest S3 video per endpoint directly from S3 bucket
router.get("/feature-graphic", async (req: Request, res: Response) => {
  try {
    // Get latest videos directly from S3 bucket
    const latestVideos = await getLatestVideosFromS3();

    // Sign S3 URLs for access
    const result = await Promise.all(
      latestVideos.map(async (v) => {
        let signed = v.url;
        try {
          signed = await signKey(v.key);
        } catch (e) {
          console.warn("[feature-graphic] Failed to sign URL:", v.url, e);
        }
        return { endpoint: v.endpoint, graphicUrl: signed };
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
      const { url, key } = req.body as { url?: string; key?: string };
      const endpoint = req.params.endpoint;
      if (!url && !key) {
        res.status(400).json({ error: "Missing video url or key" });
        return;
      }

      // Validate that the key belongs to the specified endpoint (if key is provided)
      if (key) {
        const normalizedEndpoint = endpoint.replace(/[^a-zA-Z0-9_-]/g, "-");
        const validPrefixes = [
          `videos/${normalizedEndpoint}/`,
          `generated-videos/${normalizedEndpoint}/`,
        ];

        const isValidKey = validPrefixes.some((prefix) =>
          key.startsWith(prefix)
        );
        if (!isValidKey) {
          res
            .status(400)
            .json({ error: "Key does not match the specified endpoint" });
          return;
        }
      }

      // Store either the S3 key or URL in the FeatureGraphic table
      const graphicUrl = key || url!;

      // Upsert the FeatureGraphic record for this endpoint
      await prisma.featureGraphic.upsert({
        where: { endpoint },
        update: { graphicUrl },
        create: { endpoint, graphicUrl },
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
