import { Router, Request, Response, NextFunction } from "express";
import { features } from "../filters/features";
import { PrismaClient } from "../generated/prisma";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import dotenv from "dotenv";
import axios, { AxiosResponse } from "axios";
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

// --- Helper serialization utilities to avoid circular JSON issues in error responses ---
const safeJson = (value: any, depth = 3): any => {
  if (value === null || value === undefined) return value;
  if (depth <= 0) return typeof value;
  if (Array.isArray(value))
    return value.slice(0, 10).map((v) => safeJson(v, depth - 1));
  if (typeof value === "object") {
    // Axios error formatting
    if ((value as any).isAxiosError) {
      const ax: any = value;
      return {
        isAxiosError: true,
        message: ax.message,
        code: ax.code,
        status: ax.response?.status,
        statusText: ax.response?.statusText,
        data: safeJson(ax.response?.data, depth - 1),
        url: ax.config?.url,
        method: ax.config?.method,
      };
    }
    const out: Record<string, any> = {};
    let count = 0;
    for (const k of Object.keys(value)) {
      if (count++ > 20) {
        out.__truncated = true;
        break;
      }
      try {
        const v: any = (value as any)[k];
        if (v === value) continue; // circular self
        if (typeof v === "function") continue;
        if (k.startsWith("_")) continue; // skip internal/private heavy props
        out[k] = safeJson(v, depth - 1);
      } catch {
        out[k] = "[unserializable]";
      }
    }
    return out;
  }
  return value;
};

const serializeError = (err: any) => {
  if (!err) return undefined;
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    return {
      message: err.message,
      name: err.name,
      code: (err as any).code,
    };
  }
  return safeJson(err);
};

// Define interfaces for better type safety
interface VideoGenerationRequest {
  imageUrl?: string; // primary key
  image_url?: string; // alias supported by frontend
  lastFrameUrl?: string; // optional second image for transition models (pixverse)
  last_frame_url?: string; // alias snake_case
  model?: string; // "pixverse-v4-transition" | "MiniMax-Hailuo-02" | "I2V-01-Director" | "I2V-01-live" | "ray 2" | "ray 2 flash" | "ray 1.6" | others
  prompt?: string; // optional override
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
      const { model: userModel, prompt: promptOverride } = req.body as any;
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
              details: serializeError(e),
            });
            return;
          }
        }
      }

      // Optional: second image for transition models (Pixverse) - treat similarly
      const lastFrameRaw =
        (req.body as any).lastFrameUrl || (req.body as any).last_frame_url;
      let lastFrameCloudUrl: string | undefined = lastFrameRaw;
      if (lastFrameRaw && !lastFrameRaw.includes("cloudinary.com")) {
        const isLikelyPublicLast =
          /^https?:\/\//i.test(lastFrameRaw) &&
          !/localhost|127\\.0\\.0\\.1|^file:/i.test(lastFrameRaw);
        try {
          if (
            process.env.CLOUDINARY_UPLOAD_URL &&
            process.env.CLOUDINARY_UPLOAD_PRESET
          ) {
            const uploadRes = await axios.post(
              process.env.CLOUDINARY_UPLOAD_URL!,
              {
                file: lastFrameRaw,
                upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
              },
              {
                headers: { "Content-Type": "application/json" },
                timeout: 20000,
              }
            );
            lastFrameCloudUrl = uploadRes.data.secure_url;
          } else if (!isLikelyPublicLast) {
            throw new Error(
              "Missing CLOUDINARY_UPLOAD_URL/UPLOAD_PRESET and last frame image is not public"
            );
          }
        } catch (err) {
          console.warn(
            "Last frame Cloudinary upload failed; proceeding if public:",
            (err as any)?.message || err
          );
          if (!isLikelyPublicLast) lastFrameCloudUrl = undefined; // drop unusable
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

      // Step 3: Provider branching (Pixverse transition, then MiniMax, else Luma)
      const rawModel = (userModel || "").toString();
      const isPixverseTransition = /pixverse-v4-transition/i.test(rawModel);
      // Support v4, v4.5 and v5 image to video variants
      const isPixverseImage2Video =
        /pixverse-v4(?:\.5)?-image-to-video|pixverse-v5-image-to-video/i.test(
          rawModel
        );
      if (isPixverseTransition || isPixverseImage2Video) {
        // Helper: ensure Cloudinary image URLs transformed to 512x512 (fill & crop center)
        const force512 = (url: string | undefined): string | undefined => {
          if (!url) return url;
          // Only transform Cloudinary urls of pattern /upload/... (avoid double transform)
          try {
            if (!/res\.cloudinary\.com\//i.test(url)) return url; // skip non-cloudinary
            if (/\/image\/upload\/c_fill,w_512,h_512\//.test(url)) return url; // already transformed
            // Insert transformation right after '/upload/' segment
            return url.replace(
              /(\/image\/upload\/)(?!c_fill,w_512,h_512\/)/,
              "$1c_fill,w_512,h_512,q_auto,f_auto/"
            );
          } catch {
            return url; // fallback silently
          }
        };
        const firstFrame512 = force512(imageCloudUrl);
        const lastFrame512 = force512(lastFrameCloudUrl);
        const pixKey =
          process.env.PIXVERSE_API_KEY || process.env.EACHLABS_API_KEY;
        if (!pixKey) {
          res
            .status(500)
            .json({ success: false, error: "PIXVERSE_API_KEY not set" });
          return;
        }
        if (isPixverseTransition && !lastFrameCloudUrl) {
          res.status(400).json({
            success: false,
            error: "lastFrameUrl is required for pixverse-v4-transition",
          });
          return;
        }
        // Create prediction (single attempt, simplified)
        const pixVersion = process.env.PIXVERSE_VERSION || "0.0.1";
        const commonInput: any = {
          motion_mode: process.env.PIXVERSE_MOTION_MODE || "normal",
          quality: process.env.PIXVERSE_QUALITY || "540p",
          duration: Number(process.env.PIXVERSE_DURATION || 5),
          prompt,
          webhook_url: process.env.PIXVERSE_WEBHOOK_URL || "",
        };
        if (isPixverseTransition) {
          commonInput.last_frame_url = lastFrame512 || lastFrameCloudUrl;
          commonInput.first_frame_url = firstFrame512 || imageCloudUrl;
        } else {
          // image to video uses single image param (docs show image_url)
          commonInput.image_url = firstFrame512 || imageCloudUrl;
        }
        const createPayload = {
          model: isPixverseTransition
            ? "pixverse-v4-transition"
            : /pixverse-v5-image-to-video/i.test(rawModel)
            ? "pixverse-v5-image-to-video"
            : /pixverse-v4\.5-image-to-video/i.test(rawModel)
            ? "pixverse-v4-5-image-to-video"
            : "pixverse-v4-image-to-video",
          version: pixVersion,
          input: commonInput,
        };
        let predictionId: string | undefined;
        try {
          const createResp = await axios.post(
            "https://api.eachlabs.ai/v1/prediction/",
            createPayload,
            {
              headers: {
                "X-API-Key": pixKey,
                "Content-Type": "application/json",
              },
            }
          );
          const prediction = createResp.data || {};
          console.log("Pixverse create response:", prediction);
          const statusStr = String(prediction.status || "").toLowerCase();
          if (statusStr !== "success") {
            res.status(502).json({
              success: false,
              error: `Pixverse creation unexpected status: ${prediction.status}`,
              details: safeJson(prediction),
            });
            return;
          }
          predictionId =
            prediction.predictionID ||
            prediction.predictionId ||
            prediction.id ||
            prediction.task_id;
          if (!predictionId) {
            res.status(502).json({
              success: false,
              error: "Pixverse response missing prediction id",
              details: safeJson(prediction),
            });
            return;
          }
        } catch (err) {
          console.error(
            "Pixverse create error (single attempt):",
            serializeError(err)
          );
          res.status(502).json({
            success: false,
            error: "Failed to create Pixverse prediction",
            details: serializeError(err),
          });
          return;
        }

        // Poll prediction (works for both variants)
        let pixVideoUrl: string | undefined;
        for (let i = 0; i < 300; i++) {
          // up to ~5 min (300 *1s) typical runtime 45s
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const pollResp = await axios.get(
              `https://api.eachlabs.ai/v1/prediction/${predictionId}`,
              { headers: { "X-API-Key": pixKey }, timeout: 20000 }
            );
            const result = pollResp.data;
            console.log(result);

            const status = result.status;
            const lower = (status || "").toLowerCase();
            if (lower === "success" || lower === "completed") {
              // Output may be a direct URL string or an object/array
              const rawOut = result.output;
              if (typeof rawOut === "string") {
                pixVideoUrl = rawOut;
              } else if (rawOut) {
                const out: any = rawOut;
                pixVideoUrl =
                  out.video_url ||
                  out.video ||
                  (Array.isArray(out) ? out[0]?.video_url || out[0] : null) ||
                  result.video_url ||
                  result.video ||
                  out.url ||
                  result.url ||
                  null;
              } else {
                pixVideoUrl =
                  result.video_url || result.video || result.url || null;
              }
              break;
            } else if (
              ["error", "failed", "canceled", "cancelled"].includes(lower)
            ) {
              res.status(500).json({
                success: false,
                error: "Pixverse prediction failed",
                details: safeJson(result),
              });
              return;
            } else {
              // still processing; continue loop
            }
          } catch (e) {
            console.warn(
              "Pixverse poll error (continuing)",
              (e as any)?.message || e
            );
            continue;
          }
        }
        if (!pixVideoUrl) {
          res
            .status(504)
            .json({ success: false, error: "Pixverse prediction timeout" });
          return;
        }
        // Download & upload to Cloudinary
        let pixStream;
        try {
          pixStream = await axios.get(pixVideoUrl, {
            responseType: "stream",
            timeout: 600000,
          });
        } catch (e) {
          res.status(500).json({
            success: false,
            error: "Failed to download Pixverse video",
            details: serializeError(e),
          });
          return;
        }
        let pixUpload: UploadApiResponse;
        try {
          pixUpload = await new Promise((resolve, reject) => {
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
            pixStream.data.pipe(uploadStream);
          });
        } catch (e) {
          res.status(500).json({
            success: false,
            error: "Failed to upload Pixverse video",
            details: serializeError(e),
          });
          return;
        }
        await prisma.generatedVideo.create({
          data: { feature, url: pixUpload.secure_url },
        });
        res.status(200).json({
          success: true,
          video: { url: pixUpload.secure_url },
          cloudinaryId: pixUpload.public_id,
        });
        return;
      }
      const isMiniMax =
        /MiniMax-Hailuo-02|I2V-01-Director|I2V-01-live|I2V-01/i.test(rawModel);

      if (isMiniMax) {
        const miniMaxKey = process.env.MINIMAX_API_KEY;
        if (!miniMaxKey) {
          res
            .status(500)
            .json({ success: false, error: "MINIMAX_API_KEY not set" });
          return;
        }
        // Build payload per docs
        const duration = Number(process.env.MINIMAX_DURATION || 6); // MiniMax supports 6 or 10 for some models
        const resolution =
          process.env.MINIMAX_RESOLUTION ||
          (rawModel === "MiniMax-Hailuo-02" ? "768P" : "720P");
        const mmPayload: any = {
          model: rawModel,
          prompt: prompt, // MiniMax requires prompt
          duration,
          resolution,
        };
        // first_frame_image required for I2V models (and Hailuo at some resolutions)
        mmPayload.first_frame_image = imageCloudUrl;

        let taskId: string | undefined;
        try {
          const createResp = await axios.post(
            "https://api.minimax.io/v1/video_generation",
            mmPayload,
            {
              headers: {
                Authorization: `Bearer ${miniMaxKey}`,
                "Content-Type": "application/json",
              },
              timeout: 45000,
            }
          );
          taskId = createResp.data?.task_id;
          if (!taskId) throw new Error("No task_id returned from MiniMax");
        } catch (e: any) {
          console.error("MiniMax create error:", serializeError(e));
          res.status(502).json({
            success: false,
            error: "Failed to create MiniMax generation",
            details: serializeError(e),
          });
          return;
        }

        // Poll task status
        let mmVideoUrl: string | null = null;
        let mmFileId: string | null = null;
        for (let i = 0; i < 90; i++) {
          // up to ~6 min (90 * 4s)
          await new Promise((r) => setTimeout(r, 4000));
          try {
            const pollResp = await axios.get(
              "https://api.minimax.io/v1/query/video_generation",
              {
                headers: { Authorization: `Bearer ${miniMaxKey}` },
                params: { task_id: taskId },
                timeout: 20000,
              }
            );
            const status = pollResp.data?.status;
            if (status === "Success" || status === "success") {
              // Assume file_id -> downloadable endpoint
              const fileId = pollResp.data?.file_id;
              console.log(
                "MiniMax generation success payload:",
                safeJson(pollResp.data)
              );
              mmFileId = fileId || null;
              // If API already provides a direct downloadable URL use it, else will fetch below
              mmVideoUrl =
                pollResp.data?.video_url || pollResp.data?.file_url || null;
              break; // exit loop, will handle retrieval next
            }
            if (
              status === "Fail" ||
              status === "failed" ||
              status === "error"
            ) {
              res.status(500).json({
                success: false,
                error: "MiniMax generation failed",
                details: safeJson(pollResp.data),
              });
              return;
            }
          } catch (e: any) {
            console.warn("MiniMax poll error (continuing):", e?.message || e);
            continue;
          }
        }
        if (!mmVideoUrl && !mmFileId) {
          res
            .status(504)
            .json({ success: false, error: "MiniMax generation timeout" });
          return;
        }

        // If we only have file id, call official retrieve endpoint per docs
        if (!mmVideoUrl && mmFileId) {
          try {
            const retrieveResp = await axios.get(
              "https://api.minimax.io/v1/files/retrieve",
              {
                headers: {
                  Authorization: `Bearer ${miniMaxKey}`,
                  "Content-Type": "application/json",
                },
                params: { file_id: mmFileId },
                timeout: 30000,
              }
            );
            mmVideoUrl =
              retrieveResp.data?.file?.download_url ||
              retrieveResp.data?.download_url ||
              null;
            if (!mmVideoUrl) {
              console.error(
                "MiniMax retrieve missing download_url",
                safeJson(retrieveResp.data)
              );
              res.status(502).json({
                success: false,
                error: "MiniMax retrieve missing download_url",
                details: safeJson(retrieveResp.data),
              });
              return;
            }
          } catch (e: any) {
            console.error("MiniMax retrieve error:", serializeError(e));
            res.status(502).json({
              success: false,
              error: "Failed to retrieve MiniMax video file",
              details: serializeError(e),
            });
            return;
          }
        }

        if (!mmVideoUrl) {
          res
            .status(500)
            .json({ success: false, error: "MiniMax video URL unresolved" });
          return;
        }
        // Download video
        let mmStream;
        try {
          mmStream = await axios.get(mmVideoUrl, {
            responseType: "stream",
            timeout: 600000,
          });
        } catch (e: any) {
          res.status(500).json({
            success: false,
            error: "Failed to download MiniMax video",
            details: serializeError(e),
          });
          return;
        }
        // Upload to Cloudinary
        const mmUpload: UploadApiResponse = await new Promise(
          (resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                resource_type: "video",
                folder: "generated-videos",
                public_id: `${feature}-minimax-${Date.now()}`,
                chunk_size: 6000000,
              },
              (error, result) => {
                if (error) return reject(error);
                resolve(result as UploadApiResponse);
              }
            );
            mmStream.data.pipe(uploadStream);
          }
        );
        await prisma.generatedVideo.create({
          data: { feature, url: mmUpload.secure_url },
        });
        res.status(200).json({
          success: true,
          video: { url: mmUpload.secure_url },
          cloudinaryId: mmUpload.public_id,
        });
        return;
      }

      // Step 3 (fallback): Generate video using LumaLabs Dream Machine (Ray 2 - Image to Video)
      const lumaApiKey = process.env.LUMA_API_KEY;
      if (!lumaApiKey) {
        throw new Error("LUMA_API_KEY not set in environment");
      }

      // Map friendly model names to Luma identifiers
      const resolveLumaModel = (val?: string): string => {
        const v = (val || process.env.LUMA_MODE || "ray 2")
          .toString()
          .toLowerCase();
        if (v.includes("1.6")) return "ray-1-6";
        if (v.includes("flash")) return "ray-flash-2"; // fast Ray 2
        return "ray-2"; // default
      };
      const selectedModel = resolveLumaModel(userModel);

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
          console.error("Luma create generation error:", serializeError(e));
          res.status(503).json({
            success: false,
            error: "Luma API unreachable or timed out",
            details: serializeError(e),
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
          details: safeJson(createGenRes.data),
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
          console.error("Luma poll error:", serializeError(e));
          res.status(500).json({
            success: false,
            error: "Failed to poll Luma generation",
            details: serializeError(e),
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
            details: safeJson(pollRes.data),
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
          details: serializeError(e),
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
      console.error("Error generating video:", serializeError(error));
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
