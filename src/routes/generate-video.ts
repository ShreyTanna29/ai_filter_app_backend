import { Router, Request, Response, NextFunction } from "express";
import { features } from "../filters/features";
import { PrismaClient } from "../generated/prisma";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import dotenv from "dotenv";
import axios, { AxiosResponse } from "axios";

dotenv.config();

// Configure Cloudinary
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  throw new Error("Missing required Cloudinary configuration");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const router = Router();
const prisma = new PrismaClient();

// Define interfaces for better type safety
interface VideoGenerationRequest {
  imageUrl: string;
}

interface VideoGenerationResponse {
  success: boolean;
  video?: {
    url: string;
  };
  videoUrl?: string;
  cloudinaryId?: string;
  error?: string;
  details?: string;
}

// Generate video from feature endpoint
router.post<
  { feature: string },
  VideoGenerationResponse,
  VideoGenerationRequest
>(
  "/:feature",
  async (
    req: Request<
      { feature: string },
      VideoGenerationResponse,
      VideoGenerationRequest
    >,
    res: Response<VideoGenerationResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { feature } = req.params;
      const { imageUrl } = req.body;

      if (!imageUrl) {
        res.status(400).json({
          success: false,
          error: "Image URL is required",
        });
        return;
      }

      // Step 1: Upload image to Cloudinary if not already a Cloudinary URL
      let imageCloudUrl = imageUrl;
      if (!imageUrl.includes("cloudinary.com")) {
        try {
          const uploadRes = await axios.post(
            process.env.CLOUDINARY_UPLOAD_URL!,
            {
              file: imageUrl,
              upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
            },
            { headers: { "Content-Type": "application/json" } }
          );
          imageCloudUrl = uploadRes.data.secure_url;
        } catch (err) {
          const e = err as any;
          console.error("Cloudinary upload error:", e?.response?.data || e);
          res.status(500).json({
            success: false,
            error: "Failed to upload image to Cloudinary",
            details: e?.response?.data || String(e),
          });
          return;
        }
      }

      // Step 2: Get the prompt for the selected feature
      const featureObj = features.find((f) => f.endpoint === feature);
      const prompt = featureObj ? featureObj.prompt : "";

      // Step 3: Generate video using LumaLabs Dream Machine (Ray 2 - Image to Video)
      const lumaApiKey = process.env.LUMA_API_KEY;
      if (!lumaApiKey) {
        throw new Error("LUMA_API_KEY not set in environment");
      }

      // Build payload per docs: POST https://api.lumalabs.ai/dream-machine/v1/generations
      const lumaPayload: any = {
        prompt,
        model: process.env.LUMA_MODE || "ray-flash-2", // Ray 2 (flash)
        keyframes: {
          frame0: {
            type: "image",
            url: imageCloudUrl,
          },
        },
      };
      if (process.env.LUMA_RESOLUTION)
        lumaPayload.resolution = process.env.LUMA_RESOLUTION;
      if (process.env.LUMA_DURATION)
        lumaPayload.duration = process.env.LUMA_DURATION;

      let createGenRes;
      try {
        createGenRes = await axios.post(
          "https://api.lumalabs.ai/dream-machine/v1/generations",
          lumaPayload,
          {
            headers: {
              accept: "application/json",
              "content-type": "application/json",
              authorization: `Bearer ${lumaApiKey}`,
            },
            timeout: 30000,
          }
        );
      } catch (err) {
        const e = err as any;
        console.error("Luma create generation error:", e?.response?.data || e);
        res.status(500).json({
          success: false,
          error: "Failed to create Luma generation",
          details: e?.response?.data || String(e),
        });
        return;
      }

      // Extract generation id
      const generationId = createGenRes.data?.id || createGenRes.data?.data?.id;
      if (!generationId) {
        res.status(500).json({
          success: false,
          error: "No generation id returned from Luma",
          details: createGenRes.data,
        });
        return;
      }

      // Poll generation status per docs (statuses: dreaming | completed | failed)
      let videoUrl: string | null = null;
      let state = "";
      for (let i = 0; i < 90; i++) {
        // up to ~7.5 minutes (90 * 5s)
        await new Promise((r) => setTimeout(r, 5000));
        let pollRes;
        try {
          pollRes = await axios.get(
            `https://api.lumalabs.ai/dream-machine/v1/generations/${generationId}`,
            {
              headers: {
                accept: "application/json",
                authorization: `Bearer ${lumaApiKey}`,
              },
              timeout: 20000,
            }
          );
        } catch (err) {
          const e = err as any;
          console.error("Luma poll error:", e?.response?.data || e);
          res.status(500).json({
            success: false,
            error: "Failed to poll Luma generation",
            details: e?.response?.data || String(e),
          });
          return;
        }

        // Try to read state/status and the video URL in a robust way
        state =
          pollRes.data?.state ||
          pollRes.data?.status ||
          pollRes.data?.data?.state ||
          "";
        if (state === "completed") {
          videoUrl =
            pollRes.data?.assets?.video ||
            pollRes.data?.video ||
            pollRes.data?.data?.video_url ||
            pollRes.data?.assets?.mp4?.[0]?.url ||
            null;
          console.log("Luma poll response:", pollRes.data);
          break;
        }
        if (state === "failed") {
          console.error("Luma generation failed:", pollRes.data);
          res.status(500).json({
            success: false,
            error: "Luma generation failed",
            details: pollRes.data,
          });
          return;
        }
      }

      if (!videoUrl) {
        console.error("Luma video generation did not complete in time");
        res.status(500).json({
          success: false,
          error: "Video generation did not complete in time",
        });
        return;
      }

      // Download the video as a stream
      let videoResponse;
      try {
        videoResponse = await axios.get(videoUrl, {
          responseType: "stream",
          timeout: 600000,
        });
      } catch (err) {
        const e = err as any;
        console.error("Error downloading Luma video:", e?.response?.data || e);
        res.status(500).json({
          success: false,
          error: "Failed to download Luma video",
          details: e?.response?.data || String(e),
        });
        return;
      }

      // Upload the video stream to Cloudinary
      const uploadResult: UploadApiResponse = await new Promise(
        (resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: "video",
              folder: "generated-videos",
              public_id: `${feature}-${Date.now()}`,
              chunk_size: 6000000,
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result as UploadApiResponse);
            }
          );
          videoResponse.data.pipe(uploadStream);
        }
      );

      // Save the generated video to the database
      await prisma.generatedVideo.create({
        data: {
          feature,
          url: uploadResult.secure_url,
        },
      });

      res.status(200).json({
        success: true,
        video: {
          url: uploadResult.secure_url,
        },
        cloudinaryId: uploadResult.public_id,
      });
    } catch (error) {
      console.error("Error generating video:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to generate video",
        details: errorMessage,
      });
    }
  }
);

export default router;
