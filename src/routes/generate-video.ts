import { Router, Request, Response, NextFunction } from "express";
import { features } from "../filters/features";
import { PrismaClient } from "../generated/prisma";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import dotenv from "dotenv";
import axios, { AxiosResponse } from "axios";
// Lazy-load Eachlabs SDK (optional dependency)
let EachSDK: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  EachSDK = require("@eachlabs/aiflow").default;
} catch (_) {
  // SDK not installed or optional; will fallback to HTTP
}
import https from "https";
import http from "http";

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
  imageUrl?: string;
  image_url?: string;
  model?: string; // "ray 2" | "ray 2 flash" | "ray 1.6" | "pixverse"
  prompt?: string;
  templateId?: string;
  template_id?: string;
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
      const {
        model: userModel,
        prompt: promptOverride,
        templateId,
        template_id,
      } = req.body as any;
      const imageUrl =
        (req.body as any).imageUrl || (req.body as any).image_url;

      if (!imageUrl) {
        res.status(400).json({
          success: false,
          error: "Image URL is required",
        });
        return;
      }

      // Step 1: Upload image to Cloudinary if not already a Cloudinary URL
      let imageCloudUrl = imageUrl;
      const isLikelyPublic =
        /^https?:\/\//i.test(imageUrl) &&
        !/localhost|127\.0\.0\.1|^file:/i.test(imageUrl);
      if (!imageUrl.includes("cloudinary.com")) {
        try {
          if (
            !process.env.CLOUDINARY_UPLOAD_URL ||
            !process.env.CLOUDINARY_UPLOAD_PRESET
          ) {
            // No unsigned upload config; fallback to using the given URL if public
            if (isLikelyPublic) {
              imageCloudUrl = imageUrl;
            } else {
              throw new Error(
                "Missing CLOUDINARY_UPLOAD_URL/UPLOAD_PRESET and image is not public"
              );
            }
          } else {
            const uploadRes = await axios.post(
              process.env.CLOUDINARY_UPLOAD_URL!,
              {
                file: imageUrl,
                upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
              },
              {
                headers: { "Content-Type": "application/json" },
                timeout: 20000,
              }
            );
            imageCloudUrl = uploadRes.data.secure_url;
          }
        } catch (err) {
          const e = err as any;
          console.error(
            "Cloudinary upload error:",
            e?.response?.data || e?.message || e
          );
          // Fallback: if original URL is public, continue with it
          if (isLikelyPublic) {
            imageCloudUrl = imageUrl;
          } else {
            res.status(503).json({
              success: false,
              error: "Failed to upload image to Cloudinary (network)",
              details: e?.response?.data || e?.message || String(e),
            });
            return;
          }
        }
      }

      // Step 2: Get the prompt for the selected feature (allow client override)
      const featureObj = features.find((f) => f.endpoint === feature);
      const prompt =
        typeof promptOverride === "string" && promptOverride.trim().length > 0
          ? promptOverride
          : featureObj
          ? featureObj.prompt
          : "";

      // Step 3: Generate video using LumaLabs Dream Machine (Ray 2 - Image to Video)
      const lumaApiKey = process.env.LUMA_API_KEY;
      if (!lumaApiKey) {
        throw new Error("LUMA_API_KEY not set in environment");
      }

      // Determine which provider/model to use
      const rawModel = (userModel || process.env.LUMA_MODE || "ray 2")
        .toString()
        .toLowerCase();
      const isPixVerse = /pixverse|pixverse-v4|pixverse-v4-effect/.test(
        rawModel
      );

      // Early branch for PixVerse (Eachlabs) model
      if (isPixVerse) {
        const pixApiKey =
          process.env.EACHLABS_API_KEY || process.env.PIXVERSE_API_KEY;
        if (!pixApiKey) {
          res.status(500).json({
            success: false,
            error: "Missing EACHLABS_API_KEY or PIXVERSE_API_KEY",
          });
          return;
        }

        // Build PixVerse payload
        const pixPayload: any = {
          model: "pixverse-v4-effect",
          version: "0.0.1",
          input: {
            image_url: imageCloudUrl,
            motion_mode: "normal",
            quality: process.env.PIXVERSE_QUALITY || "540p",
            duration: Number(process.env.PIXVERSE_DURATION || 5),
          },
        };
        // Priority: explicit request param > provided alias > env default
        const incomingTemplate = templateId || template_id;
        if (incomingTemplate && typeof incomingTemplate === "string") {
          pixPayload.input.template_id = "330523675191680";
        } else if (process.env.PIXVERSE_TEMPLATE_ID) {
          pixPayload.input.template_id = process.env.PIXVERSE_TEMPLATE_ID;
        }
        if (!pixPayload.input.template_id) {
          res.status(400).json({
            success: false,
            error: "templateId is required for pixverse v4 | effects",
          });
          return;
        }
        let predictionId: string | undefined;
        let usedSdk = false;
        // Try SDK first
        if (EachSDK) {
          try {
            const client = new EachSDK({ auth: pixApiKey });
            const createResp = await client.predictions.run(pixPayload);
            predictionId = createResp?.predictionID || createResp?.id;
            if (!predictionId)
              throw new Error("SDK run returned no predictionID");
            usedSdk = true;
          } catch (e: any) {
            console.error(
              "Eachlabs SDK run error (falling back to HTTP):",
              e?.message || e
            );
          }
        }
        // HTTP fallback if SDK not available or failed
        if (!predictionId) {
          const endpoints = [
            "https://api.eachlabs.ai/v1/prediction",
            "https://api.eachlabs.ai/v1/predictions",
          ];
          let lastErr: any;
          for (const ep of endpoints) {
            try {
              const createResp = await axios.post(ep, pixPayload, {
                headers: {
                  "X-API-Key": pixApiKey,
                  "Content-Type": "application/json",
                },
                timeout: 45000,
              });
              predictionId =
                createResp.data?.predictionID || createResp.data?.id;
              if (!predictionId) throw new Error("No prediction id returned");
              break;
            } catch (e: any) {
              lastErr = e;
              const status = e?.response?.status;
              const body = e?.response?.data;
              console.error(
                `PixVerse HTTP create failed (${ep}) status=${status}:`,
                body || e?.message || e
              );
              if (status && status !== 404) break;
            }
          }
          if (!predictionId) {
            res.status(502).json({
              success: false,
              error: "Failed to create PixVerse generation (SDK+HTTP)",
              details:
                lastErr?.response?.data || lastErr?.message || String(lastErr),
            });
            return;
          }
        }

        // Poll PixVerse
        let pvVideoUrl: string | null = null;
        for (let i = 0; i < 60; i++) {
          await new Promise((r) => setTimeout(r, 4000));
          try {
            if (usedSdk && EachSDK) {
              const client = new EachSDK({ auth: pixApiKey });
              const poll = await client.predictions.get(predictionId);
              const status = poll?.status;
              if (status === "success") {
                pvVideoUrl =
                  poll?.output?.video_url || poll?.output?.url || null;
                break;
              }
              if (status === "error") {
                console.error("PixVerse SDK failed:", poll);
                res.status(500).json({
                  success: false,
                  error: "PixVerse generation failed",
                  details: poll,
                });
                return;
              }
            } else {
              const poll = await axios.get(
                `https://api.eachlabs.ai/v1/prediction/${predictionId}`,
                { headers: { "X-API-Key": pixApiKey }, timeout: 20000 }
              );
              const status = poll.data?.status;
              if (status === "succeeded" || status === "success") {
                pvVideoUrl =
                  poll.data?.output?.video_url ||
                  poll.data?.output?.url ||
                  null;
                break;
              }
              if (status === "failed" || status === "error") {
                console.error("PixVerse failed:", poll.data);
                res.status(500).json({
                  success: false,
                  error: "PixVerse generation failed",
                  details: poll.data,
                });
                return;
              }
            }
          } catch (e: any) {
            console.warn("PixVerse poll error (continuing):", e?.message || e);
            continue;
          }
        }
        if (!pvVideoUrl) {
          res.status(504).json({
            success: false,
            error: "PixVerse generation timeout",
          });
          return;
        }

        // Download PixVerse video
        let pvStream;
        try {
          pvStream = await axios.get(pvVideoUrl, {
            responseType: "stream",
            timeout: 600000,
          });
        } catch (e: any) {
          res.status(500).json({
            success: false,
            error: "Failed to download PixVerse video",
            details: e?.response?.data || e?.message || String(e),
          });
          return;
        }

        // Upload to Cloudinary
        const pvUpload: UploadApiResponse = await new Promise(
          (resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                resource_type: "video",
                folder: "generated-videos",
                public_id: `${feature}-pixverse-${Date.now()}`,
                chunk_size: 6000000,
              },
              (error, result) => {
                if (error) return reject(error);
                resolve(result as UploadApiResponse);
              }
            );
            pvStream.data.pipe(uploadStream);
          }
        );

        await prisma.generatedVideo.create({
          data: { feature, url: pvUpload.secure_url },
        });

        res.status(200).json({
          success: true,
          video: { url: pvUpload.secure_url },
          cloudinaryId: pvUpload.public_id,
        });
        return; // End PixVerse branch
      }

      // Map friendly model names to Luma identifiers (fallback)
      const resolveLumaModel = (val?: string): string => {
        const v = (val || process.env.LUMA_MODE || "ray 2")
          .toString()
          .toLowerCase();
        if (v.includes("1.6")) return "ray-1-6";
        if (v.includes("flash")) return "ray-flash-2";
        return "ray-2";
      };
      const selectedModel = resolveLumaModel(rawModel);

      // Build payload per docs: POST https://api.lumalabs.ai/dream-machine/v1/generations
      const lumaPayload: any = {
        prompt,
        model: selectedModel,
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

      // Networking hardening: prefer IPv4 and retry transient errors
      const httpsAgent = new https.Agent({ keepAlive: true, family: 4 });
      const httpAgent = new http.Agent({ keepAlive: true, family: 4 });

      const isTransient = (err: any) => {
        const code = err?.code || err?.cause?.code;
        return [
          "ETIMEDOUT",
          "ENETUNREACH",
          "ECONNRESET",
          "EAI_AGAIN",
          "ESOCKETTIMEDOUT",
        ].includes(code);
      };

      let createGenRes: any | undefined;
      for (let attempt = 1; attempt <= 3; attempt++) {
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
              timeout: 45000,
              httpsAgent,
              httpAgent,
            }
          );
          break; // success
        } catch (err) {
          const e = err as any;
          if (attempt < 3 && isTransient(e)) {
            const backoff = attempt * 2000;
            console.warn(
              `Luma create generation transient error (attempt ${attempt}/3):`,
              e?.code || e?.message || e
            );
            await new Promise((r) => setTimeout(r, backoff));
            continue;
          }
          console.error(
            "Luma create generation error:",
            e?.response?.data || e
          );
          res.status(503).json({
            success: false,
            error: "Luma API unreachable or timed out",
            details: e?.response?.data || e?.message || String(e),
          });
          return;
        }
      }

      // Extract generation id
      if (!createGenRes) {
        res.status(503).json({
          success: false,
          error: "Failed to contact Luma after retries",
        });
        return;
      }
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
              timeout: 25000,
              httpsAgent,
              httpAgent,
            }
          );
        } catch (err) {
          const e = err as any;
          if (isTransient(e)) {
            console.warn(
              "Luma poll transient error, continuing:",
              e?.code || e?.message || e
            );
            continue; // let loop retry after delay
          }
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
