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

      // Step 3: Create a task with Alibaba WAN 2.1 i2v turbo (Singapore)
      const apiKey =
        process.env.ALIBABA_API_KEY || process.env.DASHSCOPE_API_KEY;
      if (!apiKey)
        throw new Error(
          "ALIBABA_API_KEY or DASHSCOPE_API_KEY not set in environment"
        );
      let createTaskRes;
      try {
        createTaskRes = await axios.post(
          "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis",
          {
            model: "wan2.1-i2v-turbo",
            input: {
              img_url: imageCloudUrl,
              prompt: prompt,
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "X-DashScope-Async": "enable",
            },
          }
        );
      } catch (err) {
        const e = err as any;
        console.error("Alibaba create task error:", e?.response?.data || e);
        res.status(500).json({
          success: false,
          error: "Failed to create Alibaba video generation task",
          details: e?.response?.data || String(e),
        });
        return;
      }

      // Check for task_id in response
      const taskId = createTaskRes.data?.output?.task_id;
      if (!taskId) {
        res.status(500).json({
          success: false,
          error: "No task_id returned from Alibaba",
          details: createTaskRes.data,
        });
        return;
      }

      // Step 2: Poll for result
      let videoUrl = null;
      let status = "";
      for (let i = 0; i < 60; i++) {
        // Poll up to 10 minutes
        await new Promise((r) => setTimeout(r, 10000)); // 10s interval
        let pollRes;
        try {
          pollRes = await axios.get(
            `https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
            }
          );
        } catch (err) {
          const e = err as any;
          console.error("Alibaba poll error:", e?.response?.data || e);
          res.status(500).json({
            success: false,
            error: "Failed to poll Alibaba video generation task",
            details: e?.response?.data || String(e),
          });
          return;
        }
        status = pollRes.data?.output?.task_status;
        console.log(pollRes.data);

        if (status === "SUCCEEDED") {
          videoUrl = pollRes.data?.output?.video_url;
          break;
        } else if (["FAILED", "CANCELED", "UNKNOWN"].includes(status)) {
          console.error("Alibaba task failed:", pollRes.data);
          res.status(500).json({
            success: false,
            error: `Task failed with status: ${status}`,
            details: pollRes.data,
          });
          return;
        }
      }
      if (!videoUrl) {
        console.error("Video generation did not succeed in time");
        res.status(500).json({
          success: false,
          error: "Video generation did not succeed in time",
        });
        return;
      }

      // Download the video as a stream
      const videoResponse = await axios.get(videoUrl, {
        responseType: "stream",
      });

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
