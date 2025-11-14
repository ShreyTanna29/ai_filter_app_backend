import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import prisma from "../lib/prisma";
// Cloudinary removed – migrating to S3 private bucket storage
import { Readable } from "stream";
import {
  uploadStream as s3UploadStream,
  makeKey,
  publicUrlFor,
  uploadBuffer,
  ensure512SquareImageFromUrl,
} from "../lib/s3";
import { signKey } from "../middleware/signedUrl";
import dotenv from "dotenv";
import axios, { AxiosResponse } from "axios";
import https from "https";
import http from "http";
import { randomUUID } from "crypto";
import { log } from "console";

dotenv.config();

// Legacy Cloudinary configuration removed. All generated videos now stored in S3.

const router = Router();

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

// Extract a short, user-friendly Cloudinary error summary (if structure matches)
function summarizeCloudinaryError(err: any): string | undefined {
  if (!err) return undefined;
  const data = err?.response?.data || err?.data || err;
  // Common Cloudinary error shapes: { error: { message: "..." } } or { message: "..." }
  const msg = data?.error?.message || data?.message || err?.message;
  if (!msg) return undefined;
  // Trim overly long messages
  return msg.length > 180 ? msg.slice(0, 177) + "..." : msg;
}

// Extract structured Runware error details for UI surfacing
function extractRunwareError(raw: any) {
  try {
    const body = typeof raw === "string" ? JSON.parse(raw) : raw;
    const firstErr = Array.isArray(body?.errors) ? body.errors[0] : undefined;
    if (!firstErr) return undefined;
    return {
      code: firstErr.code,
      message: firstErr.message,
      responseContent: firstErr.responseContent,
      documentation: firstErr.documentation,
      taskUUID: firstErr.taskUUID,
      taskType: firstErr.taskType,
    };
  } catch {
    return undefined;
  }
}

// Define interfaces for better type safety
interface VideoGenerationRequest {
  imageUrl?: string; // primary key
  image_url?: string; // alias supported by frontend
  lastFrameUrl?: string; // optional second image for transition models (pixverse)
  last_frame_url?: string; // alias snake_case
  model?: string; // "pixverse-v4-transition" | "MiniMax-Hailuo-02" | "I2V-01-Director" | "I2V-01-live" | "ray 2" | "ray 2 flash" | "ray 1.6" | others
  prompt?: string; // optional override
  // Optional additional reference images for models like Vidu Q1 that accept multiple refs
  image_url2?: string;
  image_url3?: string;
}

interface VideoGenerationResponse {
  success: boolean;
  video?: { url: string; signedUrl?: string; key?: string };
  videoUrl?: string;
  s3Key?: string;
  error?: string;
  details?: any;
  provider?: string;
  provider_status?: string;
  provider_message?: string;
  provider_code?: string | number;
}

// Helper: upload generated video stream to S3 and return signed + canonical URLs
async function uploadGeneratedVideo(
  feature: string,
  variant: string,
  readable: Readable
): Promise<{ key: string; url: string; signedUrl: string }> {
  const key = makeKey({ type: "video", feature, ext: "mp4" });
  await s3UploadStream(key, readable, "video/mp4");
  const url = publicUrlFor(key);
  let signedUrl = url;
  try {
    signedUrl = await signKey(key);
  } catch (e) {
    // If signing fails, fall back to canonical (may be inaccessible if bucket is private)
    console.warn("[uploadGeneratedVideo] Failed to sign key", key, e);
  }
  await prisma.generatedVideo.create({ data: { feature, url } });
  return { key, url, signedUrl };
}

// Helper: ensure image is accessible via URL for provider (uploads to S3 if not clearly public)
async function prepareImageForProvider(
  rawUrl: string,
  feature: string
): Promise<{ providerUrl: string; storedUrl: string }> {
  const isLikelyPublic =
    /^https?:\/\//i.test(rawUrl) &&
    !/localhost|127\.0\.0\.1|^file:/i.test(rawUrl);
  // If already a public http(s) URL we can use directly (providers will fetch it)
  if (isLikelyPublic) {
    return { providerUrl: rawUrl, storedUrl: rawUrl };
  }
  // Otherwise fetch + resize + upload to S3 then return signed URL for provider
  try {
    const { buffer, contentType } = await ensure512SquareImageFromUrl(rawUrl);
    const key = makeKey({ type: "image", feature, ext: "png" });
    await uploadBuffer(key, buffer, contentType);
    const storedUrl = publicUrlFor(key);
    let providerUrl = storedUrl;
    try {
      providerUrl = await signKey(key);
    } catch (e) {
      console.warn("[prepareImageForProvider] sign failed", e);
    }
    return { providerUrl, storedUrl };
  } catch (e) {
    console.error("[prepareImageForProvider] failed", e);
    // Fallback to raw URL (will likely fail at provider if not reachable)
    return { providerUrl: rawUrl, storedUrl: rawUrl };
  }
}

// Multer setup for audio upload (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// Generate video from feature endpoint
router.post(
  "/:feature",
  upload.single("audio_file"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { feature } = req.params;
      const userModel = req.body.model;
      const promptOverride = req.body.prompt;
      const imageUrl = req.body.imageUrl || req.body.image_url;

      if (!imageUrl) {
        res.status(400).json({
          success: false,
          error: "Image URL is required",
        });
        return;
      }

      // Step 1: Prepare image for provider (S3 private bucket migration)
      const { providerUrl: imageCloudUrl } = await prepareImageForProvider(
        imageUrl,
        feature
      );

      // Optional: second image for transition models (Pixverse) - treat similarly
      const lastFrameRaw =
        (req.body as any).lastFrameUrl || (req.body as any).last_frame_url;
      let lastFrameCloudUrl: string | undefined = undefined;
      if (lastFrameRaw) {
        try {
          const prep = await prepareImageForProvider(lastFrameRaw, feature);
          lastFrameCloudUrl = prep.providerUrl;
        } catch (e) {
          console.warn("[lastFrame] prepare failed; ignoring", e);
        }
      }

      // Step 2: Get the prompt for the selected feature (allow client override)
      const featureObj = await prisma.features.findUnique({
        where: { endpoint: feature },
      });
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
        /pixverse-v4(?:\.5)?-image-to-video|pixverse-v5-image-to-video|kling-v1-pro-image-to-video|kling-v1-standard-image-to-video|kling-1\.5-pro-image-to-video|kling-v1\.6-pro-image-to-video|kling-1\.6-standard-image-to-video|kling-v2-master-image-to-video|kling-v2\.1-standard-image-to-video|kling-v2\.1-pro-image-to-video/i.test(
          rawModel
        );
      // Runware Veo 3 Fast (native audio) direct support
      const isRunwareVeo3Fast = /veo3@fast/i.test(rawModel);
      const isRunwareVeo31Fast = /veo\s*3\.1.*fast|google:3@3/i.test(rawModel);
      const isRunwareVeo31 = /veo\s*3\.1(?!.*fast)|google:3@2/i.test(rawModel);
      const isRunwareSeedanceProFast =
        /seedance[\s-]*1\.0[\s-]*pro[\s-]*fast|seedance[\s-]*pro[\s-]*fast|bytedance:2@2/i.test(
          rawModel
        );
      const isRunwareLTX2Pro = /ltx[\s-]*2.*pro|lightricks:2@0/i.test(rawModel);
      const isRunwareLTX2Fast = /ltx[\s-]*2.*fast|lightricks:2@1/i.test(
        rawModel
      );
      const isRunwareViduQ2Turbo = /vidu[\s-]*q?2.*turbo|vidu:3@2/i.test(
        rawModel
      );
      const isRunwareViduQ2Pro = /vidu[\s-]*q?2.*pro|vidu:3@1/i.test(rawModel);
      if (isRunwareSeedanceProFast) {
        try {
          console.log("[Seedance] Start generation", {
            feature,
            rawModel,
            imageCloudUrlInitial: imageCloudUrl?.slice(0, 120),
          });

          const runwareHeaders = {
            Authorization: `Bearer ${
              process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY
            }`,
            "Content-Type": "application/json",
          };

          // 1) Upload first frame image to get imageUUID
          const uploadPayload = [
            {
              taskType: "imageUpload",
              taskUUID: randomUUID(),
              image: imageCloudUrl,
            },
          ];
          let firstUUID: string | undefined;
          try {
            const up = await axios.post(
              "https://api.runware.ai/v1",
              uploadPayload,
              { headers: runwareHeaders, timeout: 180000 }
            );
            const d = up.data;
            const obj = Array.isArray(d?.data) ? d.data[0] : d?.data;
            firstUUID = obj?.imageUUID || obj?.imageUuid;
            console.log("[Seedance] imageUpload success", { firstUUID });
          } catch (e: any) {
            console.error(
              "Runware Seedance imageUpload failed:",
              e?.response?.data || e?.message || e
            );
            res.status(400).json({
              success: false,
              error: "Failed to upload image to Runware (Seedance)",
              details: serializeError(e),
            });
            return;
          }
          if (!firstUUID) {
            res.status(400).json({
              success: false,
              error: "Runware imageUpload did not return imageUUID",
            });
            return;
          }

          // 2) Create videoInference task
          const taskUUIDCreated = randomUUID();
          const task: any = {
            taskType: "videoInference",
            taskUUID: taskUUIDCreated,
            model: "bytedance:2@2",
            positivePrompt: prompt || "",
            width: 864,
            height: 480,
            duration: 5,
            deliveryMethod: "async",
            frameImages: [{ inputImage: firstUUID, frame: "first" }],
            providerSettings: { bytedance: { cameraFixed: false } },
          };
          console.log("[Seedance] Created task", {
            taskUUID: taskUUIDCreated,
            width: 864,
            height: 480,
            duration: 5,
          });

          const createResp = await axios.post(
            "https://api.runware.ai/v1",
            [task],
            { headers: runwareHeaders, timeout: 180000 }
          );
          const createData = createResp.data;
          const ackItem = Array.isArray(createData?.data)
            ? createData.data.find(
                (d: any) => d?.taskType === "videoInference"
              ) || createData.data[0]
            : createData?.data;
          let videoUrl =
            ackItem?.videoURL ||
            ackItem?.url ||
            ackItem?.video ||
            (Array.isArray(ackItem?.videos) ? ackItem.videos[0] : null);
          let pollTaskUUID: string = ackItem?.taskUUID || taskUUIDCreated;
          console.log("[Seedance] Ack response", {
            ackTaskUUID: ackItem?.taskUUID,
            createdTaskUUID: taskUUIDCreated,
            chosenPollTaskUUID: pollTaskUUID,
            immediateVideo: !!videoUrl,
            status: ackItem?.status || ackItem?.taskStatus,
          });

          // 3) Poll if no immediate URL
          if (!videoUrl && pollTaskUUID) {
            const maxAttempts = 100; // ~5 min
            const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
            let consecutive400 = 0;
            let switchedToCreated = false;
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              await delay(3000);
              const pollPayload = [
                { taskType: "getResponse", taskUUID: pollTaskUUID },
              ];
              console.log("[Seedance] Poll attempt", {
                attempt,
                pollPayload: pollPayload[0],
              });
              try {
                const poll = await axios.post(
                  "https://api.runware.ai/v1",
                  pollPayload,
                  { headers: runwareHeaders, timeout: 60000 }
                );
                const pd = poll.data;
                const item = Array.isArray(pd?.data)
                  ? pd.data.find(
                      (d: any) => d?.taskUUID === pollTaskUUID || d?.videoURL
                    ) || pd.data[0]
                  : pd?.data;
                const status = item?.status || item?.taskStatus;
                if (status)
                  console.log("[Seedance] Poll status", { attempt, status });
                if (status === "success" || item?.videoURL || item?.url) {
                  videoUrl =
                    item?.videoURL ||
                    item?.url ||
                    item?.video ||
                    (Array.isArray(item?.videos) ? item.videos[0] : null);
                  if (videoUrl) break;
                }
                if (status === "error" || status === "failed") {
                  res.status(502).json({
                    success: false,
                    error: "Runware Seedance generation failed during polling",
                    details: pd,
                  });
                  return;
                }
                consecutive400 = 0; // reset on successful poll
              } catch (e: any) {
                const statusCode = e?.response?.status;
                const body = e?.response?.data;
                console.log("[Seedance] Poll error", {
                  attempt,
                  statusCode,
                  body:
                    typeof body === "object"
                      ? JSON.stringify(body).slice(0, 500)
                      : body,
                });
                if (statusCode === 400) {
                  consecutive400++;
                  // If repeated 400 and ack UUID differs, try switching to created taskUUID once
                  if (
                    !switchedToCreated &&
                    pollTaskUUID !== taskUUIDCreated &&
                    consecutive400 >= 2
                  ) {
                    console.log(
                      "[Seedance] Switching to created taskUUID due to repeated 400",
                      { from: pollTaskUUID, to: taskUUIDCreated }
                    );
                    pollTaskUUID = taskUUIDCreated;
                    switchedToCreated = true;
                    consecutive400 = 0;
                  }
                  if (consecutive400 >= 5) {
                    res.status(502).json({
                      success: false,
                      error:
                        "Runware Seedance polling returned repeated 400 errors",
                      details: body || serializeError(e),
                    });
                    return;
                  }
                }
                continue;
              }
            }
          }

          if (!videoUrl) {
            console.log(
              "[Seedance] Timeout - no video URL returned after polling"
            );
            res.status(502).json({
              success: false,
              error:
                "Runware Seedance 1.0 Pro Fast did not return a video URL (timeout or missing)",
              details: createData,
            });
            return;
          }

          // 4) Download and upload to S3
          let rwStream;
          try {
            rwStream = await axios.get(videoUrl, {
              responseType: "stream",
              timeout: 600000,
            });
            console.log("[Seedance] Download started");
          } catch (e) {
            console.log("[Seedance] Download error", {
              error: serializeError(e),
            });
            res.status(500).json({
              success: false,
              error: "Failed to download Seedance video",
              details: serializeError(e),
            });
            return;
          }
          let uploaded;
          try {
            uploaded = await uploadGeneratedVideo(
              feature,
              "seedance-pro-fast",
              rwStream.data as Readable
            );
            console.log("[Seedance] S3 upload success", { key: uploaded.key });
          } catch (e) {
            console.log("[Seedance] S3 upload error", {
              error: serializeError(e),
            });
            res.status(500).json({
              success: false,
              error: "Failed to upload Seedance video to S3",
              details: serializeError(e),
            });
            return;
          }
          res.status(200).json({
            success: true,
            video: {
              url: uploaded.signedUrl,
              signedUrl: uploaded.signedUrl,
              key: uploaded.key,
            },
            s3Key: uploaded.key,
          });
          return;
        } catch (err: any) {
          console.error(
            "Runware Seedance 1.0 Pro Fast error:",
            err?.response?.data || err
          );
          res.status(500).json({
            success: false,
            error: "Seedance 1.0 Pro Fast generation failed",
            details: serializeError(err),
          });
          return;
        }
      }

      // Runware LTX-2 Pro (Lightricks) Image-to-Video
      if (isRunwareLTX2Pro) {
        try {
          console.log("[LTX2] Start generation", {
            feature,
            rawModel,
            imageCloudUrlInitial: imageCloudUrl?.slice(0, 120),
          });

          const runwareHeaders = {
            Authorization: `Bearer ${
              process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY
            }`,
            "Content-Type": "application/json",
          };

          // 1) Upload first frame to get imageUUID
          const uploadPayload = [
            {
              taskType: "imageUpload",
              taskUUID: randomUUID(),
              image: imageCloudUrl,
            },
          ];
          let firstUUID: string | undefined;
          try {
            const up = await axios.post(
              "https://api.runware.ai/v1",
              uploadPayload,
              {
                headers: runwareHeaders,
                timeout: 180000,
              }
            );
            const d = up.data;
            const obj = Array.isArray(d?.data) ? d.data[0] : d?.data;
            firstUUID = obj?.imageUUID || obj?.imageUuid;
            console.log("[LTX2] imageUpload success", { firstUUID });
          } catch (e: any) {
            console.error(
              "[LTX2] imageUpload failed:",
              e?.response?.data || e?.message || e
            );
            res.status(400).json({
              success: false,
              error: "Failed to upload image to Runware (LTX-2)",
              details: serializeError(e),
            });
            return;
          }
          if (!firstUUID) {
            res.status(400).json({
              success: false,
              error: "Runware imageUpload did not return imageUUID",
            });
            return;
          }

          // Defaults per docs: 1080p, 6/8/10 sec; enable audio
          const width = Number(process.env.LTX2_WIDTH || 1920);
          const height = Number(process.env.LTX2_HEIGHT || 1080);
          const duration = Number(process.env.LTX2_DURATION || 8);
          const generateAudio =
            String(process.env.LTX2_AUDIO || "true") === "true";

          // 2) Create videoInference task
          const createdTaskUUID = randomUUID();
          const task: any = {
            taskType: "videoInference",
            taskUUID: createdTaskUUID,
            model: "lightricks:2@0",
            positivePrompt: prompt || "",
            duration,
            width,
            height,
            frameImages: [{ inputImage: firstUUID, frame: "first" }],
            providerSettings: { lightricks: { generateAudio } },
          };
          console.log("[LTX2] Created task", {
            taskUUID: createdTaskUUID,
            width,
            height,
            duration,
            generateAudio,
          });

          const createResp = await axios.post(
            "https://api.runware.ai/v1",
            [task],
            {
              headers: runwareHeaders,
              timeout: 180000,
            }
          );
          const data = createResp.data;
          const ackItem = Array.isArray(data?.data)
            ? data.data.find((d: any) => d?.taskType === "videoInference") ||
              data.data[0]
            : data?.data;
          let videoUrl =
            ackItem?.videoURL ||
            ackItem?.url ||
            ackItem?.video ||
            (Array.isArray(ackItem?.videos) ? ackItem.videos[0] : null);
          let pollTaskUUID: string = ackItem?.taskUUID || createdTaskUUID;
          console.log("[LTX2] Ack response", {
            ackTaskUUID: ackItem?.taskUUID,
            createdTaskUUID,
            chosenPollTaskUUID: pollTaskUUID,
            immediateVideo: !!videoUrl,
            status: ackItem?.status || ackItem?.taskStatus,
          });

          // 3) Poll for completion if needed
          if (!videoUrl && pollTaskUUID) {
            const maxAttempts = 100;
            const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
            let consecutive400 = 0;
            let switched = false;
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              await delay(3000);
              const pollPayload = [
                { taskType: "getResponse", taskUUID: pollTaskUUID },
              ];
              console.log("[LTX2] Poll attempt", {
                attempt,
                pollPayload: pollPayload[0],
              });
              try {
                const poll = await axios.post(
                  "https://api.runware.ai/v1",
                  pollPayload,
                  {
                    headers: runwareHeaders,
                    timeout: 60000,
                  }
                );
                const pd = poll.data;
                const item = Array.isArray(pd?.data)
                  ? pd.data.find(
                      (d: any) => d?.taskUUID === pollTaskUUID || d?.videoURL
                    ) || pd.data[0]
                  : pd?.data;
                const status = item?.status || item?.taskStatus;
                if (status)
                  console.log("[LTX2] Poll status", { attempt, status });
                if (status === "success" || item?.videoURL || item?.url) {
                  videoUrl =
                    item?.videoURL ||
                    item?.url ||
                    item?.video ||
                    (Array.isArray(item?.videos) ? item.videos[0] : null);
                  if (videoUrl) break;
                }
                if (status === "error" || status === "failed") {
                  res.status(502).json({
                    success: false,
                    error: "LTX-2 generation failed during polling",
                    details: pd,
                  });
                  return;
                }
                consecutive400 = 0;
              } catch (e: any) {
                const statusCode = e?.response?.status;
                const body = e?.response?.data;
                console.log("[LTX2] Poll error", {
                  attempt,
                  statusCode,
                  body:
                    typeof body === "object"
                      ? JSON.stringify(body).slice(0, 500)
                      : body,
                });
                if (statusCode === 400) {
                  consecutive400++;
                  if (
                    !switched &&
                    pollTaskUUID !== createdTaskUUID &&
                    consecutive400 >= 2
                  ) {
                    console.log(
                      "[LTX2] Switching poll taskUUID to created one due to repeated 400",
                      { from: pollTaskUUID, to: createdTaskUUID }
                    );
                    pollTaskUUID = createdTaskUUID;
                    switched = true;
                    consecutive400 = 0;
                  }
                  if (consecutive400 >= 5) {
                    res.status(502).json({
                      success: false,
                      error: "LTX-2 polling returned repeated 400 errors",
                      details: body || serializeError(e),
                    });
                    return;
                  }
                }
                continue;
              }
            }
          }

          if (!videoUrl) {
            console.log("[LTX2] Timeout - no video URL returned after polling");
            res.status(502).json({
              success: false,
              error: "LTX-2 did not return a video URL (timeout or missing)",
              details: data,
            });
            return;
          }

          // 4) Download and upload to S3
          let ltxStream;
          try {
            ltxStream = await axios.get(videoUrl, {
              responseType: "stream",
              timeout: 600000,
            });
          } catch (e) {
            res.status(500).json({
              success: false,
              error: "Failed to download LTX-2 video",
              details: serializeError(e),
            });
            return;
          }
          let uploaded;
          try {
            uploaded = await uploadGeneratedVideo(
              feature,
              "ltx2-pro",
              ltxStream.data as Readable
            );
          } catch (e) {
            res.status(500).json({
              success: false,
              error: "Failed to upload LTX-2 video to S3",
              details: serializeError(e),
            });
            return;
          }
          res.status(200).json({
            success: true,
            video: {
              url: uploaded.signedUrl,
              signedUrl: uploaded.signedUrl,
              key: uploaded.key,
            },
            s3Key: uploaded.key,
          });
          return;
        } catch (err: any) {
          console.error("[LTX2] Fatal error:", err?.response?.data || err);
          res.status(500).json({
            success: false,
            error: "LTX-2 Pro generation failed",
            details: serializeError(err),
          });
          return;
        }
      }

      // Runware LTX-2 Fast (Lightricks) Image-to-Video
      if (isRunwareLTX2Fast) {
        try {
          console.log("[LTX2F] Start generation", {
            feature,
            rawModel,
            imageCloudUrlInitial: imageCloudUrl?.slice(0, 120),
          });

          const runwareHeaders = {
            Authorization: `Bearer ${
              process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY
            }`,
            "Content-Type": "application/json",
          };

          // 1) Upload first frame to get imageUUID
          const uploadPayload = [
            {
              taskType: "imageUpload",
              taskUUID: randomUUID(),
              image: imageCloudUrl,
            },
          ];
          let firstUUID: string | undefined;
          try {
            const up = await axios.post(
              "https://api.runware.ai/v1",
              uploadPayload,
              {
                headers: runwareHeaders,
                timeout: 180000,
              }
            );
            const d = up.data;
            const obj = Array.isArray(d?.data) ? d.data[0] : d?.data;
            firstUUID = obj?.imageUUID || obj?.imageUuid;
            console.log("[LTX2F] imageUpload success", { firstUUID });
          } catch (e: any) {
            console.error(
              "[LTX2F] imageUpload failed:",
              e?.response?.data || e?.message || e
            );
            res.status(400).json({
              success: false,
              error: "Failed to upload image to Runware (LTX-2 Fast)",
              details: serializeError(e),
            });
            return;
          }
          if (!firstUUID) {
            res.status(400).json({
              success: false,
              error: "Runware imageUpload did not return imageUUID",
            });
            return;
          }

          // Defaults: use env overrides if provided
          const width = Number(process.env.LTX2F_WIDTH || 1920);
          const height = Number(process.env.LTX2F_HEIGHT || 1080);
          const duration = Number(process.env.LTX2F_DURATION || 8);
          const generateAudio =
            String(process.env.LTX2F_AUDIO || "true") === "true";

          // 2) Create videoInference task (lightricks:2@1)
          const createdTaskUUID = randomUUID();
          const task: any = {
            taskType: "videoInference",
            taskUUID: createdTaskUUID,
            model: "lightricks:2@1",
            positivePrompt: prompt || "",
            duration,
            width,
            height,
            frameImages: [{ inputImage: firstUUID, frame: "first" }],
            providerSettings: { lightricks: { generateAudio } },
          };
          console.log("[LTX2F] Created task", {
            taskUUID: createdTaskUUID,
            width,
            height,
            duration,
            generateAudio,
          });

          const createResp = await axios.post(
            "https://api.runware.ai/v1",
            [task],
            {
              headers: runwareHeaders,
              timeout: 180000,
            }
          );
          const data = createResp.data;
          const ackItem = Array.isArray(data?.data)
            ? data.data.find((d: any) => d?.taskType === "videoInference") ||
              data.data[0]
            : data?.data;
          let videoUrl =
            ackItem?.videoURL ||
            ackItem?.url ||
            ackItem?.video ||
            (Array.isArray(ackItem?.videos) ? ackItem.videos[0] : null);
          let pollTaskUUID: string = ackItem?.taskUUID || createdTaskUUID;
          console.log("[LTX2F] Ack response", {
            ackTaskUUID: ackItem?.taskUUID,
            createdTaskUUID,
            chosenPollTaskUUID: pollTaskUUID,
            immediateVideo: !!videoUrl,
            status: ackItem?.status || ackItem?.taskStatus,
          });

          // 3) Poll for completion if needed
          if (!videoUrl && pollTaskUUID) {
            const maxAttempts = 100;
            const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
            let consecutive400 = 0;
            let switched = false;
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              await delay(3000);
              const pollPayload = [
                { taskType: "getResponse", taskUUID: pollTaskUUID },
              ];
              console.log("[LTX2F] Poll attempt", {
                attempt,
                pollPayload: pollPayload[0],
              });
              try {
                const poll = await axios.post(
                  "https://api.runware.ai/v1",
                  pollPayload,
                  {
                    headers: runwareHeaders,
                    timeout: 60000,
                  }
                );
                const pd = poll.data;
                const item = Array.isArray(pd?.data)
                  ? pd.data.find(
                      (d: any) => d?.taskUUID === pollTaskUUID || d?.videoURL
                    ) || pd.data[0]
                  : pd?.data;
                const status = item?.status || item?.taskStatus;
                if (status)
                  console.log("[LTX2F] Poll status", { attempt, status });
                if (status === "success" || item?.videoURL || item?.url) {
                  videoUrl =
                    item?.videoURL ||
                    item?.url ||
                    item?.video ||
                    (Array.isArray(item?.videos) ? item.videos[0] : null);
                  if (videoUrl) break;
                }
                if (status === "error" || status === "failed") {
                  res.status(502).json({
                    success: false,
                    error: "LTX-2 Fast generation failed during polling",
                    details: pd,
                  });
                  return;
                }
                consecutive400 = 0;
              } catch (e: any) {
                const statusCode = e?.response?.status;
                const body = e?.response?.data;
                console.log("[LTX2F] Poll error", {
                  attempt,
                  statusCode,
                  body:
                    typeof body === "object"
                      ? JSON.stringify(body).slice(0, 500)
                      : body,
                });
                if (statusCode === 400) {
                  consecutive400++;
                  if (
                    !switched &&
                    pollTaskUUID !== createdTaskUUID &&
                    consecutive400 >= 2
                  ) {
                    console.log(
                      "[LTX2F] Switching poll taskUUID to created one due to repeated 400",
                      { from: pollTaskUUID, to: createdTaskUUID }
                    );
                    pollTaskUUID = createdTaskUUID;
                    switched = true;
                    consecutive400 = 0;
                  }
                  if (consecutive400 >= 5) {
                    res.status(502).json({
                      success: false,
                      error: "LTX-2 Fast polling returned repeated 400 errors",
                      details: body || serializeError(e),
                    });
                    return;
                  }
                }
                continue;
              }
            }
          }

          if (!videoUrl) {
            console.log(
              "[LTX2F] Timeout - no video URL returned after polling"
            );
            res.status(502).json({
              success: false,
              error:
                "LTX-2 Fast did not return a video URL (timeout or missing)",
              details: data,
            });
            return;
          }

          // 4) Download and upload to S3
          let ltxStream;
          try {
            ltxStream = await axios.get(videoUrl, {
              responseType: "stream",
              timeout: 600000,
            });
          } catch (e) {
            res.status(500).json({
              success: false,
              error: "Failed to download LTX-2 Fast video",
              details: serializeError(e),
            });
            return;
          }
          let uploaded;
          try {
            uploaded = await uploadGeneratedVideo(
              feature,
              "ltx2-fast",
              ltxStream.data as Readable
            );
          } catch (e) {
            res.status(500).json({
              success: false,
              error: "Failed to upload LTX-2 Fast video to S3",
              details: serializeError(e),
            });
            return;
          }
          res.status(200).json({
            success: true,
            video: {
              url: uploaded.signedUrl,
              signedUrl: uploaded.signedUrl,
              key: uploaded.key,
            },
            s3Key: uploaded.key,
          });
          return;
        } catch (err: any) {
          console.error("[LTX2F] Fatal error:", err?.response?.data || err);
          res.status(500).json({
            success: false,
            error: "LTX-2 Fast generation failed",
            details: serializeError(err),
          });
          return;
        }
      }
      // Runware Vidu Q2 Turbo (Image-to-Video, first/optional last frame)
      if (isRunwareViduQ2Turbo) {
        try {
          console.log("[VIDUQ2] Start generation", {
            feature,
            rawModel,
            imageCloudUrlInitial: imageCloudUrl?.slice(0, 120),
            lastFrameProvided: !!lastFrameCloudUrl,
          });

          const runwareHeaders = {
            Authorization: `Bearer ${
              process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY
            }`,
            "Content-Type": "application/json",
          };

          // 1) Upload frame images to Runware to obtain imageUUIDs
          const uploadOne = async (imgUrl: string) => {
            const payload = [
              {
                taskType: "imageUpload",
                taskUUID: randomUUID(),
                image: imgUrl,
              },
            ];
            const r = await axios.post("https://api.runware.ai/v1", payload, {
              headers: runwareHeaders,
              timeout: 180000,
            });
            const d = r.data;
            const obj = Array.isArray(d?.data) ? d.data[0] : d?.data;
            return obj?.imageUUID || obj?.imageUuid;
          };

          let firstUUID: string | undefined;
          try {
            firstUUID = await uploadOne(imageCloudUrl);
            console.log("[VIDUQ2] imageUpload first success", { firstUUID });
          } catch (e: any) {
            console.error(
              "[VIDUQ2] imageUpload first failed:",
              e?.response?.data || e?.message || e
            );
            res.status(400).json({
              success: false,
              error: "Failed to upload first frame to Runware (Vidu Q2)",
              details: serializeError(e),
            });
            return;
          }
          if (!firstUUID) {
            res.status(400).json({
              success: false,
              error: "Runware imageUpload did not return imageUUID",
            });
            return;
          }
          let lastUUID: string | undefined;
          if (lastFrameCloudUrl) {
            try {
              lastUUID = await uploadOne(lastFrameCloudUrl);
              console.log("[VIDUQ2] imageUpload last success", { lastUUID });
            } catch (e: any) {
              console.warn(
                "[VIDUQ2] imageUpload last failed (continuing as single frame)",
                e?.response?.data || e?.message || e
              );
            }
          }

          // Model-specific params
          const duration = Number(process.env.VIDUQ2_DURATION || 5);
          const movementAmplitude =
            process.env.VIDUQ2_MOVEMENT_AMPLITUDE || "medium"; // low|medium|large
          const bgm = String(process.env.VIDUQ2_BGM || "false") === "true";

          // 2) Create videoInference task (omit width/height when using frameImages)
          const createdTaskUUID = randomUUID();
          const frameImages: any[] = [
            { inputImage: firstUUID, frame: "first" },
          ];
          if (lastUUID)
            frameImages.push({ inputImage: lastUUID, frame: "last" });

          const task: any = {
            taskType: "videoInference",
            taskUUID: createdTaskUUID,
            model: "vidu:3@2",
            positivePrompt: prompt || "",
            duration,
            frameImages,
            providerSettings: { vidu: { movementAmplitude, bgm } },
          };
          console.log("[VIDUQ2] Created task", {
            taskUUID: createdTaskUUID,
            duration,
            movementAmplitude,
            bgm,
            frames: frameImages.length,
          });

          const createResp = await axios.post(
            "https://api.runware.ai/v1",
            [task],
            { headers: runwareHeaders, timeout: 180000 }
          );
          const data = createResp.data;
          const ackItem = Array.isArray(data?.data)
            ? data.data.find((d: any) => d?.taskType === "videoInference") ||
              data.data[0]
            : data?.data;
          let videoUrl =
            ackItem?.videoURL ||
            ackItem?.url ||
            ackItem?.video ||
            (Array.isArray(ackItem?.videos) ? ackItem.videos[0] : null);
          let pollTaskUUID: string = ackItem?.taskUUID || createdTaskUUID;
          console.log("[VIDUQ2] Ack response", {
            ackTaskUUID: ackItem?.taskUUID,
            createdTaskUUID,
            chosenPollTaskUUID: pollTaskUUID,
            immediateVideo: !!videoUrl,
            status: ackItem?.status || ackItem?.taskStatus,
          });

          // 3) Poll for completion if needed
          if (!videoUrl && pollTaskUUID) {
            const maxAttempts = 100;
            const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
            let consecutive400 = 0;
            let switched = false;
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              await delay(3000);
              const pollPayload = [
                { taskType: "getResponse", taskUUID: pollTaskUUID },
              ];
              console.log("[VIDUQ2] Poll attempt", {
                attempt,
                pollPayload: pollPayload[0],
              });
              try {
                const poll = await axios.post(
                  "https://api.runware.ai/v1",
                  pollPayload,
                  { headers: runwareHeaders, timeout: 60000 }
                );
                const pd = poll.data;
                const item = Array.isArray(pd?.data)
                  ? pd.data.find(
                      (d: any) => d?.taskUUID === pollTaskUUID || d?.videoURL
                    ) || pd.data[0]
                  : pd?.data;
                const status = item?.status || item?.taskStatus;
                if (status)
                  console.log("[VIDUQ2] Poll status", { attempt, status });
                if (status === "success" || item?.videoURL || item?.url) {
                  videoUrl =
                    item?.videoURL ||
                    item?.url ||
                    item?.video ||
                    (Array.isArray(item?.videos) ? item.videos[0] : null);
                  if (videoUrl) break;
                }
                if (status === "error" || status === "failed") {
                  res.status(502).json({
                    success: false,
                    error: "Vidu Q2 Turbo generation failed during polling",
                    details: pd,
                  });
                  return;
                }
                consecutive400 = 0;
              } catch (e: any) {
                const statusCode = e?.response?.status;
                const body = e?.response?.data;
                console.log("[VIDUQ2] Poll error", {
                  attempt,
                  statusCode,
                  body:
                    typeof body === "object"
                      ? JSON.stringify(body).slice(0, 500)
                      : body,
                });
                if (statusCode === 400) {
                  consecutive400++;
                  if (
                    !switched &&
                    pollTaskUUID !== createdTaskUUID &&
                    consecutive400 >= 2
                  ) {
                    console.log(
                      "[VIDUQ2] Switching poll taskUUID to created one due to repeated 400",
                      { from: pollTaskUUID, to: createdTaskUUID }
                    );
                    pollTaskUUID = createdTaskUUID;
                    switched = true;
                    consecutive400 = 0;
                  }
                  if (consecutive400 >= 5) {
                    res.status(502).json({
                      success: false,
                      error:
                        "Vidu Q2 Turbo polling returned repeated 400 errors",
                      details: body || serializeError(e),
                    });
                    return;
                  }
                }
                continue;
              }
            }
          }

          if (!videoUrl) {
            console.log(
              "[VIDUQ2] Timeout - no video URL returned after polling"
            );
            res.status(502).json({
              success: false,
              error:
                "Vidu Q2 Turbo did not return a video URL (timeout or missing)",
              details: data,
            });
            return;
          }

          // 4) Download and upload to S3
          let vq2Stream;
          try {
            vq2Stream = await axios.get(videoUrl, {
              responseType: "stream",
              timeout: 600000,
            });
          } catch (e) {
            res.status(500).json({
              success: false,
              error: "Failed to download Vidu Q2 Turbo video",
              details: serializeError(e),
            });
            return;
          }
          let uploaded;
          try {
            uploaded = await uploadGeneratedVideo(
              feature,
              "viduq2-turbo",
              vq2Stream.data as Readable
            );
          } catch (e) {
            res.status(500).json({
              success: false,
              error: "Failed to upload Vidu Q2 Turbo video to S3",
              details: serializeError(e),
            });
            return;
          }
          res.status(200).json({
            success: true,
            video: {
              url: uploaded.signedUrl,
              signedUrl: uploaded.signedUrl,
              key: uploaded.key,
            },
            s3Key: uploaded.key,
          });
          return;
        } catch (err: any) {
          console.error("[VIDUQ2] Fatal error:", err?.response?.data || err);
          res.status(500).json({
            success: false,
            error: "Vidu Q2 Turbo generation failed",
            details: serializeError(err),
          });
          return;
        }
      }
      // Runware Google Veo 3.1 (with audio) Image-to-Video
      if (isRunwareVeo31) {
        try {
          const runwareHeaders = {
            Authorization: `Bearer ${
              process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY
            }`,
            "Content-Type": "application/json",
          };

          console.log(
            "Runware API KEY: ",
            process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY
          );

          // Helper to upload an image url and get imageUUID
          const uploadToRunware = async (
            img: string
          ): Promise<string | undefined> => {
            try {
              const uploadPayload = [
                { taskType: "imageUpload", taskUUID: randomUUID(), image: img },
              ];
              const r = await axios.post(
                "https://api.runware.ai/v1",
                uploadPayload,
                {
                  headers: runwareHeaders,
                  timeout: 180000,
                  maxBodyLength: Infinity,
                  maxContentLength: Infinity,
                }
              );
              const d = r.data;
              const obj = Array.isArray(d?.data) ? d.data[0] : d?.data;
              return obj?.imageUUID || obj?.imageUuid;
            } catch (e) {
              console.warn(
                "Runware imageUpload failed (Veo3.1):",
                (e as any)?.response?.data || (e as any)?.message || e
              );
              return undefined;
            }
          };

          // Build frameImages array
          const frameImages: any[] = [];
          if (imageCloudUrl) {
            const firstUUID = await uploadToRunware(imageCloudUrl);
            if (!firstUUID) {
              throw new Error(
                "Runware imageUpload did not return imageUUID for the first frame (Veo3.1)"
              );
            }
            frameImages.push({ inputImage: firstUUID, frame: "first" });
          }
          if (lastFrameCloudUrl) {
            const lastUUID = await uploadToRunware(lastFrameCloudUrl);
            if (!lastUUID) {
              throw new Error(
                "Runware imageUpload did not return imageUUID for the last frame (Veo3.1)"
              );
            }
            frameImages.push({ inputImage: lastUUID, frame: "last" });
          }

          const width = Number(process.env.VEO31_WIDTH || 1280);
          const height = Number(process.env.VEO31_HEIGHT || 720);
          const duration = Number(process.env.VEO31_DURATION || 8);

          const createdTaskUUID = randomUUID();
          const task = {
            taskType: "videoInference",
            taskUUID: createdTaskUUID,
            model: "google:3@2",
            positivePrompt: prompt || "",
            width,
            height,
            duration,
            deliveryMethod: "async",
            providerSettings: { google: { generateAudio: true } },
            frameImages,
          } as any;
          console.log("veo 3.1 task:", task);

          const runwareResp = await axios.post(
            "https://api.runware.ai/v1",
            [task],
            {
              headers: runwareHeaders,
              timeout: 180000,
            }
          );
          const data = runwareResp.data;
          console.log("veo 3.1 resp data: ", data);

          const ackItem = Array.isArray(data?.data)
            ? data.data.find((d: any) => d?.taskType === "videoInference") ||
              data.data[0]
            : data?.data;
          let videoUrl =
            ackItem?.videoURL ||
            ackItem?.url ||
            ackItem?.video ||
            (Array.isArray(ackItem?.videos) ? ackItem.videos[0] : null);
          let pollTaskUUID: string = ackItem?.taskUUID || createdTaskUUID;

          // Poll using getResponse with 400 fallback
          if (!videoUrl && pollTaskUUID) {
            const maxAttempts = 100;
            const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
            let consecutive400 = 0;
            let switched = false;
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              await delay(3000);
              const pollPayload = [
                {
                  taskType: "getResponse",
                  taskUUID: pollTaskUUID,
                },
              ];
              try {
                const poll = await axios.post(
                  "https://api.runware.ai/v1",
                  pollPayload,
                  { headers: runwareHeaders, timeout: 60000 }
                );
                console.log("poll payload:", pollPayload);

                const pd = poll.data;
                console.log("poll data: ", pd);

                const item = Array.isArray(pd?.data)
                  ? pd.data.find(
                      (d: any) => d?.taskUUID === pollTaskUUID || d?.videoURL
                    ) || pd.data[0]
                  : pd?.data;
                const status = item?.status || item?.taskStatus;
                if (status === "success" || item?.videoURL || item?.url) {
                  videoUrl =
                    item?.videoURL ||
                    item?.url ||
                    item?.video ||
                    (Array.isArray(item?.videos) ? item.videos[0] : null);
                  if (videoUrl) break;
                }
                if (status === "error" || status === "failed") {
                  const providerErr: any = extractRunwareError(pd) || {};
                  res.status(422).json({
                    success: false,
                    error:
                      providerErr.responseContent ||
                      providerErr.message ||
                      "Runware Veo 3.1 returned error during polling",
                    providerError: providerErr,
                    details: pd,
                  });
                  return;
                }
                consecutive400 = 0;
              } catch (e: any) {
                const statusCode = e?.response?.status;
                const body = e?.response?.data;
                console.log("Veo 3.1 poll error", {
                  attempt,
                  statusCode,
                  body:
                    typeof body === "object"
                      ? JSON.stringify(body).slice(0, 500)
                      : body,
                });
                if (statusCode === 400) {
                  consecutive400++;
                  if (
                    !switched &&
                    pollTaskUUID !== createdTaskUUID &&
                    consecutive400 >= 2
                  ) {
                    pollTaskUUID = createdTaskUUID;
                    switched = true;
                    consecutive400 = 0;
                  }
                  if (consecutive400 >= 5) {
                    const providerErr: any = extractRunwareError(body) || {};
                    res.status(422).json({
                      success: false,
                      error:
                        providerErr.responseContent ||
                        providerErr.message ||
                        "Runware Veo 3.1 polling returned repeated 400 errors",
                      providerError: providerErr,
                      details: body || e?.message,
                    });
                    return;
                  }
                }
                continue;
              }
            }
          }

          if (!videoUrl) {
            res.status(502).json({
              success: false,
              error:
                "Runware Veo 3.1 did not return video URL (timeout or missing)",
              details: data,
            });
            return;
          }

          // Download & upload to S3
          let rwStream;
          try {
            rwStream = await axios.get(videoUrl, {
              responseType: "stream",
              timeout: 600000,
            });
          } catch (e) {
            res.status(500).json({
              success: false,
              error: "Failed to download Runware Veo 3.1 video",
              details: serializeError(e),
            });
            return;
          }
          let uploaded;
          try {
            uploaded = await uploadGeneratedVideo(
              feature,
              "veo31",
              rwStream.data as Readable
            );
          } catch (e) {
            res.status(500).json({
              success: false,
              error: "Failed to upload Veo 3.1 video to S3",
              details: serializeError(e),
            });
            return;
          }
          res.status(200).json({
            success: true,
            video: {
              url: uploaded.signedUrl,
              signedUrl: uploaded.signedUrl,
              key: uploaded.key,
            },
            s3Key: uploaded.key,
          });
          return;
        } catch (err: any) {
          console.error("Runware Veo 3.1 error:", err?.response?.data || err);
          res.status(500).json({
            success: false,
            error: "Runware Veo 3.1 generation failed",
            details: serializeError(err),
          });
          return;
        }
      }

      // Runware Google Veo 3.1 Fast (with audio) Image-to-Video
      if (isRunwareVeo31Fast) {
        try {
          console.log("[VEO31F] Start generation", {
            feature,
            rawModel,
            imageCloudUrlInitial: imageCloudUrl?.slice(0, 120),
            lastFrameProvided: !!lastFrameCloudUrl,
          });
          const runwareHeaders = {
            Authorization: `Bearer ${
              process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY
            }`,
            "Content-Type": "application/json",
          };

          // Helper upload
          const uploadToRunware = async (
            img: string
          ): Promise<string | undefined> => {
            try {
              const uploadPayload = [
                { taskType: "imageUpload", taskUUID: randomUUID(), image: img },
              ];
              const r = await axios.post(
                "https://api.runware.ai/v1",
                uploadPayload,
                {
                  headers: runwareHeaders,
                  timeout: 180000,
                  maxBodyLength: Infinity,
                  maxContentLength: Infinity,
                }
              );
              const d = r.data;
              const obj = Array.isArray(d?.data) ? d.data[0] : d?.data;
              return obj?.imageUUID || obj?.imageUuid;
            } catch (e) {
              console.warn(
                "Runware imageUpload failed (Veo3.1 Fast):",
                (e as any)?.response?.data || (e as any)?.message || e
              );
              return undefined;
            }
          };

          const frameImages: any[] = [];
          if (imageCloudUrl) {
            const firstUUID = await uploadToRunware(imageCloudUrl);
            if (!firstUUID) {
              throw new Error(
                "Runware imageUpload did not return imageUUID for the first frame (Veo3.1 Fast)"
              );
            }
            frameImages.push({ inputImage: firstUUID, frame: "first" });
          }
          if (lastFrameCloudUrl) {
            const lastUUID = await uploadToRunware(lastFrameCloudUrl);
            if (!lastUUID) {
              throw new Error(
                "Runware imageUpload did not return imageUUID for the last frame (Veo3.1 Fast)"
              );
            }
            frameImages.push({ inputImage: lastUUID, frame: "last" });
          }

          const width = Number(process.env.VEO31F_WIDTH || 1280);
          const height = Number(process.env.VEO31F_HEIGHT || 720);
          const duration = Number(process.env.VEO31F_DURATION || 8);

          const createdTaskUUID = randomUUID();
          const task = {
            taskType: "videoInference",
            taskUUID: createdTaskUUID,
            model: "google:3@3",
            positivePrompt: prompt || "",
            width,
            height,
            duration,
            deliveryMethod: "async",
            providerSettings: { google: { generateAudio: true } },
            frameImages,
          } as any;
          console.log("[VEO31F] Created task", {
            taskUUID: createdTaskUUID,
            width,
            height,
            duration,
            frames: frameImages.length,
          });

          const runwareResp = await axios.post(
            "https://api.runware.ai/v1",
            [task],
            { headers: runwareHeaders, timeout: 180000 }
          );
          const data = runwareResp.data;
          const ackItem = Array.isArray(data?.data)
            ? data.data.find((d: any) => d?.taskType === "videoInference") ||
              data.data[0]
            : data?.data;
          let videoUrl =
            ackItem?.videoURL ||
            ackItem?.url ||
            ackItem?.video ||
            (Array.isArray(ackItem?.videos) ? ackItem.videos[0] : null);
          let pollTaskUUID: string = ackItem?.taskUUID || createdTaskUUID;
          console.log("[VEO31F] Ack response", {
            ackTaskUUID: ackItem?.taskUUID,
            createdTaskUUID,
            chosenPollTaskUUID: pollTaskUUID,
            immediateVideo: !!videoUrl,
            status: ackItem?.status || ackItem?.taskStatus,
          });

          if (!videoUrl && pollTaskUUID) {
            const maxAttempts = 100;
            const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
            let consecutive400 = 0;
            let switched = false;
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              await delay(3000);
              const pollPayload = [
                { taskType: "getResponse", taskUUID: pollTaskUUID },
              ];
              console.log("[VEO31F] Poll attempt", {
                attempt,
                pollTaskUUID,
              });
              try {
                const poll = await axios.post(
                  "https://api.runware.ai/v1",
                  pollPayload,
                  { headers: runwareHeaders, timeout: 60000 }
                );
                const pd = poll.data;
                const item = Array.isArray(pd?.data)
                  ? pd.data.find(
                      (d: any) => d?.taskUUID === pollTaskUUID || d?.videoURL
                    ) || pd.data[0]
                  : pd?.data;
                const status = item?.status || item?.taskStatus;
                if (status)
                  console.log("[VEO31F] Poll status", { attempt, status });
                if (status === "success" || item?.videoURL || item?.url) {
                  videoUrl =
                    item?.videoURL ||
                    item?.url ||
                    item?.video ||
                    (Array.isArray(item?.videos) ? item.videos[0] : null);
                  if (videoUrl) break;
                }
                if (status === "error" || status === "failed") {
                  const providerErr: any = extractRunwareError(pd) || {};
                  res.status(422).json({
                    success: false,
                    error:
                      providerErr.responseContent ||
                      providerErr.message ||
                      "Runware Veo 3.1 Fast returned error during polling",
                    providerError: providerErr,
                    details: pd,
                  });
                  return;
                }
                consecutive400 = 0;
              } catch (e: any) {
                const statusCode = e?.response?.status;
                const body = e?.response?.data;
                console.log("[VEO31F] Poll error", {
                  attempt,
                  statusCode,
                  body:
                    typeof body === "object"
                      ? JSON.stringify(body).slice(0, 500)
                      : body,
                });
                if (statusCode === 400) {
                  consecutive400++;
                  if (
                    !switched &&
                    pollTaskUUID !== createdTaskUUID &&
                    consecutive400 >= 2
                  ) {
                    console.log(
                      "[VEO31F] Switching poll taskUUID to created one due to repeated 400",
                      { from: pollTaskUUID, to: createdTaskUUID }
                    );
                    pollTaskUUID = createdTaskUUID;
                    switched = true;
                    consecutive400 = 0;
                  }
                  if (consecutive400 >= 5) {
                    console.log(
                      "[VEO31F] Aborting after repeated 400s during polling"
                    );
                    const providerErr: any = extractRunwareError(body) || {};
                    res.status(422).json({
                      success: false,
                      error:
                        providerErr.responseContent ||
                        providerErr.message ||
                        "Runware Veo 3.1 Fast polling returned repeated 400 errors",
                      providerError: providerErr,
                      details: body || e?.message,
                    });
                    return;
                  }
                }
                continue;
              }
            }
          }

          if (!videoUrl) {
            res.status(502).json({
              success: false,
              error:
                "Runware Veo 3.1 Fast did not return video URL (timeout or missing)",
              details: data,
            });
            return;
          }

          let rwStream;
          try {
            rwStream = await axios.get(videoUrl, {
              responseType: "stream",
              timeout: 600000,
            });
          } catch (e) {
            res.status(500).json({
              success: false,
              error: "Failed to download Runware Veo 3.1 Fast video",
              details: serializeError(e),
            });
            return;
          }
          let uploaded;
          try {
            uploaded = await uploadGeneratedVideo(
              feature,
              "veo31-fast",
              rwStream.data as Readable
            );
            console.log("[VEO31F] S3 upload success", { key: uploaded.key });
          } catch (e) {
            res.status(500).json({
              success: false,
              error: "Failed to upload Veo 3.1 Fast video to S3",
              details: serializeError(e),
            });
            return;
          }
          res.status(200).json({
            success: true,
            video: {
              url: uploaded.signedUrl,
              signedUrl: uploaded.signedUrl,
              key: uploaded.key,
            },
            s3Key: uploaded.key,
          });
          return;
        } catch (err: any) {
          console.error(
            "Runware Veo 3.1 Fast error:",
            err?.response?.data || err
          );
          res.status(500).json({
            success: false,
            error: "Runware Veo 3.1 Fast generation failed",
            details: serializeError(err),
          });
          return;
        }
      }

      if (isRunwareVeo3Fast) {
        // Expect a Runware-uploaded image URL (already cloudinary if earlier logic succeeded)
        try {
          console.log("[VEO3F] Start generation", {
            feature,
            rawModel,
            imageCloudUrlInitial: imageCloudUrl?.slice(0, 120),
            lastFrameProvided: !!lastFrameCloudUrl,
          });
          // Upload images to Runware to obtain imageUUIDs (more reliable than using plain URLs)
          const runwareHeaders = {
            Authorization: `Bearer ${
              process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY
            }`,
            "Content-Type": "application/json",
          };
          const uploadToRunware = async (
            img: string
          ): Promise<string | undefined> => {
            try {
              const uploadPayload = [
                { taskType: "imageUpload", taskUUID: randomUUID(), image: img },
              ];
              const r = await axios.post(
                "https://api.runware.ai/v1",
                uploadPayload,
                {
                  headers: runwareHeaders,
                  timeout: 180000,
                  maxBodyLength: Infinity,
                  maxContentLength: Infinity,
                }
              );
              const d = r.data;
              const obj = Array.isArray(d?.data) ? d.data[0] : d?.data;
              return obj?.imageUUID || obj?.imageUuid;
            } catch (e) {
              console.warn(
                "Runware imageUpload failed:",
                (e as any)?.response?.data || (e as any)?.message || e
              );
              return undefined;
            }
          };

          // Build frameImages array as objects with UUIDs per Runware spec
          const frameImages: any[] = [];
          if (imageCloudUrl) {
            const firstUUID = await uploadToRunware(imageCloudUrl);
            if (!firstUUID) {
              throw new Error(
                "Runware imageUpload did not return imageUUID for the first frame"
              );
            }
            frameImages.push({ inputImage: firstUUID, frame: "first" });
          }
          if (lastFrameCloudUrl) {
            const lastUUID = await uploadToRunware(lastFrameCloudUrl);
            if (!lastUUID) {
              throw new Error(
                "Runware imageUpload did not return imageUUID for the last frame"
              );
            }
            frameImages.push({ inputImage: lastUUID, frame: "last" });
          }

          const task = {
            taskType: "videoInference",
            taskUUID: randomUUID(),
            model: "google:3@1", // Runware model AIR ID for Veo 3 Fast (with audio)
            // Use user prompt override or feature prompt
            positivePrompt: prompt || "",
            width: 1280,
            height: 720,
            duration: 8,
            deliveryMethod: "async", // video generation requires async; we'll poll for completion
            providerSettings: {
              google: { generateAudio: true },
            },
            // Frame images: first and optional last as objects
            frameImages,
          } as any;
          console.log("[VEO3F] Created task", {
            width: 1280,
            height: 720,
            duration: 8,
            hasLastFrame: !!lastFrameCloudUrl,
          });

          const payload = [task];
          console.log("veo 3 task payload:", payload);

          const runwareResp = await axios.post(
            "https://api.runware.ai/v1",
            payload,
            {
              headers: runwareHeaders,
              timeout: 180000,
            }
          );
          const data = runwareResp.data;
          const ackItem = Array.isArray(data?.data)
            ? data.data.find((d: any) => d?.taskType === "videoInference") ||
              data.data[0]
            : data?.data;
          let videoUrl =
            ackItem?.videoURL ||
            ackItem?.url ||
            ackItem?.video ||
            (Array.isArray(ackItem?.videos) ? ackItem.videos[0] : null);

          // If URL not directly available (async mode), poll getResponse using taskUUID
          let taskUUID = ackItem?.taskUUID;
          console.log("[VEO3F] Ack response", {
            ackTaskUUID: taskUUID,
            immediateVideo: !!videoUrl,
            status: ackItem?.status || ackItem?.taskStatus,
          });
          if (!videoUrl && taskUUID) {
            const maxAttempts = 80; // ~4 minutes at 3s interval
            const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              await delay(3000);
              const pollPayload = [
                { taskType: "getResponse", taskUUID: taskUUID },
              ];
              console.log("veo 3 fast poll payload: ", pollPayload);

              let pollResp: any;
              try {
                pollResp = await axios.post(
                  "https://api.runware.ai/v1",
                  pollPayload,
                  { headers: runwareHeaders, timeout: 60000 }
                );
              } catch (e) {
                // transient errors: continue polling
                console.log(
                  "[VEO3F] Poll transient error (continuing)",
                  (e as any)?.response?.status || (e as any)?.message
                );
                continue;
              }
              const pd = pollResp.data;
              const item = Array.isArray(pd?.data)
                ? pd.data.find(
                    (d: any) => d?.taskUUID === taskUUID || d?.videoURL
                  ) || pd.data[0]
                : pd?.data;
              const status = item?.status || item?.taskStatus;
              if (status)
                console.log("[VEO3F] Poll status", { attempt, status });
              if (status === "success" || item?.videoURL || item?.url) {
                videoUrl =
                  item?.videoURL ||
                  item?.url ||
                  item?.video ||
                  (Array.isArray(item?.videos) ? item.videos[0] : null);
                if (videoUrl) break;
              }
              if (status === "error" || status === "failed") {
                // surface provider error with provider fields
                const providerErr: any = extractRunwareError(pd) || {};
                res.status(422).json({
                  success: false,
                  error:
                    providerErr.responseContent ||
                    providerErr.message ||
                    "Runware Veo3@fast returned error during polling",
                  providerError: providerErr,
                  details: pd,
                });
                return;
              }
            }
          }
          if (!videoUrl) {
            console.log(
              "[VEO3F] Timeout - no video URL returned after polling"
            );
            res.status(502).json({
              success: false,
              error:
                "Runware Veo3@fast did not return video URL (timeout or missing)",
              details: data,
            });
            return;
          }
          // Download & upload to S3 (normalize hosting)
          let rwStream;
          try {
            rwStream = await axios.get(videoUrl, {
              responseType: "stream",
              timeout: 600000,
            });
          } catch (e) {
            res.status(500).json({
              success: false,
              error: "Failed to download Runware Veo3@fast video",
              details: serializeError(e),
            });
            return;
          }
          let uploaded;
          try {
            uploaded = await uploadGeneratedVideo(
              feature,
              "veo3-fast",
              rwStream.data as Readable
            );
            console.log("[VEO3F] S3 upload success", { key: uploaded.key });
          } catch (e) {
            res.status(500).json({
              success: false,
              error: "Failed to upload Veo3@fast video to S3",
              details: serializeError(e),
            });
            return;
          }
          res.status(200).json({
            success: true,
            video: {
              url: uploaded.signedUrl,
              signedUrl: uploaded.signedUrl,
              key: uploaded.key,
            },
            s3Key: uploaded.key,
          });
          return;
        } catch (err: any) {
          console.error("Runware Veo3@fast error:", err?.response?.data || err);
          res.status(500).json({
            success: false,
            error: "Runware Veo3@fast generation failed",
            details: serializeError(err),
          });
          return;
        }
      }

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
            : /kling-v2\.1-pro-image-to-video/i.test(rawModel)
            ? "kling-v2-1-pro-image-to-video"
            : /kling-v2\.1-standard-image-to-video/i.test(rawModel)
            ? "kling-v2-1-standard-image-to-video"
            : /kling-v2-master-image-to-video/i.test(rawModel)
            ? "kling-v2-master-image-to-video"
            : /kling-v1\.6-pro-image-to-video/i.test(rawModel)
            ? "kling-v1-6-pro-image-to-video"
            : /kling-1\.6-standard-image-to-video/i.test(rawModel)
            ? "kling-1-6-standard-image-to-video"
            : /kling-1\.5-pro-image-to-video/i.test(rawModel)
            ? "kling-1-5-pro-image-to-video"
            : /kling-v1-pro-image-to-video/i.test(rawModel)
            ? "kling-v1-pro-image-to-video"
            : /kling-v1-standard-image-to-video/i.test(rawModel)
            ? "kling-v1-standard-image-to-video"
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
            const provider_message =
              (prediction as any)?.message ||
              (prediction as any)?.error ||
              (prediction as any)?.status ||
              "Unknown status";
            res.status(502).json({
              success: false,
              error: `Pixverse creation failed: ${provider_message}`,
              provider: "Pixverse",
              provider_status: (prediction as any)?.status,
              provider_message,
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
          const pixErr = err as any;
          console.error("Pixverse create error (single attempt):", {
            error: pixErr,
            payload: createPayload,
            serverResponse: pixErr?.response?.data,
          });
          const e = err as any;
          let provider_message =
            e?.response?.data?.message ||
            e?.response?.data?.error ||
            e?.message ||
            "Unknown error";
          res.status(502).json({
            success: false,
            error: provider_message,
            details: serializeError(e),
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
              const provider_message =
                (result as any)?.error ||
                (result as any)?.message ||
                (result as any)?.status;
              res.status(500).json({
                success: false,
                error: provider_message
                  ? `Pixverse prediction failed: ${provider_message}`
                  : "Pixverse prediction failed",
                provider: "Pixverse",
                provider_status: (result as any)?.status,
                provider_message,
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
          res.status(504).json({
            success: false,
            error: "Pixverse prediction timeout",
            provider: "Pixverse",
            provider_status: "timeout",
            provider_message: "Prediction did not complete in allotted time",
          });
          return;
        }
        // Download & upload to S3
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
        let uploadedPix;
        try {
          uploadedPix = await uploadGeneratedVideo(
            feature,
            "pixverse",
            pixStream.data as Readable
          );
        } catch (e) {
          res.status(500).json({
            success: false,
            error: "Failed to upload Pixverse video to S3",
            details: serializeError(e),
          });
          return;
        }
        res.status(200).json({
          success: true,
          video: {
            url: uploadedPix.signedUrl,
            signedUrl: uploadedPix.signedUrl,
            key: uploadedPix.key,
          },
          s3Key: uploadedPix.key,
        });
        return;
      }
      // Eachlabs Vidu Q1 Reference to Video (multi-reference) branch
      const isViduQ1 = /vidu-q1-reference-to-video/i.test(rawModel);
      if (isViduQ1) {
        const eachLabsKey =
          process.env.PIXVERSE_API_KEY || process.env.EACHLABS_API_KEY;
        if (!eachLabsKey) {
          res.status(500).json({
            success: false,
            error: "EACHLABS / PIXVERSE API key not set",
          });
          return;
        }

        // Collect up to three reference images. Primary is required (already uploaded to Cloudinary earlier if needed)
        // We allow client to pass optional image_url2 / image_url3 (already Cloudinary URLs OR public). If not cloudinary, attempt upload.
        let image2Raw: string | undefined = (req.body as any).image_url2;
        let image3Raw: string | undefined = (req.body as any).image_url3;
        const maybeUploadExtra = async (
          raw?: string
        ): Promise<string | undefined> => {
          if (!raw) return undefined;
          if (raw.includes("cloudinary.com")) return raw; // already hosted
          const isLikelyPublic =
            /^https?:\/\//i.test(raw) && !/localhost|127\.|^file:/i.test(raw);
          try {
            if (
              process.env.CLOUDINARY_UPLOAD_URL &&
              process.env.CLOUDINARY_UPLOAD_PRESET
            ) {
              const formD = new (require("form-data"))();
              formD.append("file", raw);
              formD.append(
                "upload_preset",
                process.env.CLOUDINARY_UPLOAD_PRESET
              );
              const upRes = await axios.post(
                process.env.CLOUDINARY_UPLOAD_URL,
                formD,
                { headers: formD.getHeaders(), timeout: 60000 }
              );
              return upRes.data?.secure_url || upRes.data?.url || raw;
            }
            if (isLikelyPublic) return raw; // allow public
          } catch (e) {
            console.warn(
              "Optional reference image upload failed (ignored)",
              serializeError(e)
            );
            if (isLikelyPublic) return raw;
          }
          return undefined;
        };
        const image2 = await maybeUploadExtra(image2Raw);
        const image3 = await maybeUploadExtra(image3Raw);

        const viduVersion = process.env.VIDU_Q1_VERSION || "0.0.1";
        const duration = Number(process.env.VIDU_Q1_DURATION || 5);
        const aspect = process.env.VIDU_Q1_ASPECT_RATIO || "16:9";
        const resolution = process.env.VIDU_Q1_RESOLUTION || "1080p"; // docs show "1080p"
        const movementAmplitude =
          process.env.VIDU_Q1_MOVEMENT_AMPLITUDE || "auto"; // auto / low / high
        const bgm = process.env.VIDU_Q1_BGM || "false"; // "true" / "false"

        const input: any = {
          resolution,
          prompt, // Use feature prompt or override
          duration,
          aspect_ratio: aspect,
          movement_amplitude: movementAmplitude,
          bgm,
        };
        // Add references in required naming order (image_url1..3)
        input.image_url = imageCloudUrl;
        if (lastFrameCloudUrl) input.image_url2 = lastFrameCloudUrl;
        if (image2) input.image_url2 = image2; // override if user explicitly provided second reference
        if (image3) input.image_url3 = image3;

        const createPayload = {
          model: "vidu-q-1-reference-to-video",
          version: viduVersion,
          input,
          webhook_url: process.env.VIDU_Q1_WEBHOOK_URL || "",
        };

        let predictionId: string | undefined;
        try {
          const createResp = await axios.post(
            "https://api.eachlabs.ai/v1/prediction/",
            createPayload,
            {
              headers: {
                "X-API-Key": eachLabsKey,
                "Content-Type": "application/json",
              },
              timeout: 45000,
            }
          );
          const prediction = createResp.data || {};
          console.log("Vidu Q1 create response:", prediction);
          const statusStr = String(prediction.status || "").toLowerCase();
          if (statusStr !== "success") {
            const provider_message =
              (prediction as any)?.message ||
              (prediction as any)?.error ||
              (prediction as any)?.status ||
              "Unknown status";
            res.status(502).json({
              success: false,
              error: `Vidu Q1 creation failed: ${provider_message}`,
              provider: "ViduQ1",
              provider_status: (prediction as any)?.status,
              provider_message,
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
              error: "Vidu Q1 response missing prediction id",
              details: safeJson(prediction),
            });
            return;
          }
        } catch (err) {
          const viduQ1Err = err as any;
          console.error("Vidu Q1 create error:", {
            error: viduQ1Err,
            payload: createPayload,
            serverResponse: viduQ1Err?.response?.data,
          });
          res.status(502).json({
            success: false,
            error: "Failed to create Vidu Q1 prediction",
            details: serializeError(err),
          });
          return;
        }

        // Poll
        let viduVideoUrl: string | undefined;
        for (let i = 0; i < 300; i++) {
          // up to ~5 min
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const pollResp = await axios.get(
              `https://api.eachlabs.ai/v1/prediction/${predictionId}`,
              { headers: { "X-API-Key": eachLabsKey }, timeout: 20000 }
            );
            const result = pollResp.data || {};
            const lower = String(result.status || "").toLowerCase();
            if (lower === "success" || lower === "completed") {
              const rawOut = result.output;
              if (typeof rawOut === "string") viduVideoUrl = rawOut;
              else if (rawOut) {
                const out: any = rawOut;
                viduVideoUrl =
                  out.video_url ||
                  out.video ||
                  (Array.isArray(out) ? out[0]?.video_url || out[0] : null) ||
                  result.video_url ||
                  result.video ||
                  out.url ||
                  result.url ||
                  null;
              } else {
                viduVideoUrl =
                  result.video_url || result.video || result.url || null;
              }
              break;
            } else if (
              ["error", "failed", "canceled", "cancelled"].includes(lower)
            ) {
              const provider_message =
                (result as any)?.error ||
                (result as any)?.message ||
                (result as any)?.status;
              res.status(500).json({
                success: false,
                error: provider_message
                  ? `Vidu Q1 prediction failed: ${provider_message}`
                  : "Vidu Q1 prediction failed",
                provider: "ViduQ1",
                provider_status: (result as any)?.status,
                provider_message,
                details: safeJson(result),
              });
              return;
            }
          } catch (e) {
            console.warn(
              "Vidu Q1 poll error (continuing)",
              (e as any)?.message || e
            );
            continue;
          }
        }
        if (!viduVideoUrl) {
          res.status(504).json({
            success: false,
            error: "Vidu Q1 prediction timeout",
            provider: "ViduQ1",
            provider_status: "timeout",
            provider_message: "Prediction did not complete in allotted time",
          });
          return;
        }
        // Download & upload to S3
        let viduStream;
        try {
          viduStream = await axios.get(viduVideoUrl, {
            responseType: "stream",
            timeout: 600000,
          });
        } catch (e) {
          res.status(500).json({
            success: false,
            error: "Failed to download Vidu Q1 video",
            details: serializeError(e),
          });
          return;
        }
        let uploadedViduQ1;
        try {
          uploadedViduQ1 = await uploadGeneratedVideo(
            feature,
            "viduq1-ref",
            viduStream.data as Readable
          );
        } catch (e) {
          res.status(500).json({
            success: false,
            error: "Failed to upload Vidu Q1 video to S3",
            details: serializeError(e),
          });
          return;
        }
        res.status(200).json({
          success: true,
          video: {
            url: uploadedViduQ1.signedUrl,
            signedUrl: uploadedViduQ1.signedUrl,
            key: uploadedViduQ1.key,
          },
          s3Key: uploadedViduQ1.key,
        });
        return;
      }

      // Eachlabs Vidu 1.5 Image to Video branch
      const isVidu15Image2Video = /vidu-1\.5-image-to-video/i.test(rawModel);
      if (isVidu15Image2Video) {
        const eachLabsKey = process.env.EACHLABS_API_KEY;
        if (!eachLabsKey) {
          res.status(500).json({
            success: false,
            error: "EACHLABS API key not set",
          });
          return;
        }

        const viduVersion = "0.0.1";
        const duration = 4;

        const resolution = "720p";

        const input = {
          image_url: imageCloudUrl,
          prompt: prompt,
          duration: duration,
          resolution: resolution,
        };

        const createPayload = {
          model: "vidu-1-5-image-to-video",
          version: viduVersion,
          input,
        };

        let createResp: any;
        let predictionId: string;
        try {
          createResp = await axios.post(
            "https://api.eachlabs.ai/v1/prediction/",
            createPayload,
            {
              headers: {
                "X-API-Key": eachLabsKey,
                "Content-Type": "application/json",
              },
              timeout: 30000,
            }
          );
          const prediction = createResp.data || {};
          console.log("Vidu 1.5 create response:", prediction);
          const statusStr = String(prediction.status || "").toLowerCase();
          if (statusStr !== "success") {
            const provider_message =
              (prediction as any)?.error ||
              (prediction as any)?.message ||
              "Unknown status";
            res.status(502).json({
              success: false,
              error: `Vidu 1.5 creation failed: ${provider_message}`,
              provider: "Vidu15",
              provider_status: (prediction as any)?.status,
              provider_message,
              details: safeJson(prediction),
            });
            return;
          }
          predictionId = (prediction as any)?.predictionID;
          if (!predictionId) {
            res.status(502).json({
              success: false,
              error: "Vidu 1.5 response missing prediction id",
              details: safeJson(prediction),
            });
            return;
          }
        } catch (err) {
          const vidu15Err = err as any;
          console.error("Vidu 1.5 create error:", {
            error: vidu15Err,
            payload: createPayload,
            serverResponse: vidu15Err?.response?.data,
          });
          res.status(502).json({
            success: false,
            error: vidu15Err?.response?.data.details,
            details: serializeError(err),
          });
          return;
        }

        // Poll
        let viduVideoUrl: string | undefined;
        for (let i = 0; i < 300; i++) {
          // up to ~5 min
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const pollResp = await axios.get(
              `https://api.eachlabs.ai/v1/prediction/${predictionId}`,
              { headers: { "X-API-Key": eachLabsKey }, timeout: 20000 }
            );
            const result = pollResp.data || {};
            const lower = String(result.status || "").toLowerCase();
            if (lower === "success" || lower === "completed") {
              const rawOut = result.output;
              if (typeof rawOut === "string") viduVideoUrl = rawOut;
              else if (rawOut) {
                const out: any = rawOut;
                viduVideoUrl =
                  out.video_url ||
                  out.video ||
                  (Array.isArray(out) ? out[0]?.video_url || out[0] : null) ||
                  result.video_url ||
                  result.video ||
                  out.url ||
                  result.url ||
                  null;
              } else {
                viduVideoUrl =
                  result.video_url || result.video || result.url || null;
              }
              break;
            } else if (
              ["error", "failed", "canceled", "cancelled"].includes(lower)
            ) {
              const provider_message =
                (result as any)?.error ||
                (result as any)?.message ||
                (result as any)?.status;
              res.status(500).json({
                success: false,
                error: provider_message
                  ? `Vidu Q1 prediction failed: ${provider_message}`
                  : "Vidu Q1 prediction failed",
                provider: "ViduQ1",
                provider_status: (result as any)?.status,
                provider_message,
                details: safeJson(result),
              });
              return;
            }
          } catch (e) {
            console.warn(
              "Vidu Q1 poll error (continuing)",
              (e as any)?.message || e
            );
            continue;
          }
        }
        if (!viduVideoUrl) {
          res.status(504).json({
            success: false,
            error: "Vidu Q1 prediction timeout",
            provider: "ViduQ1",
            provider_status: "timeout",
            provider_message: "Prediction did not complete in allotted time",
          });
          return;
        }
        // Download & upload to S3
        let viduStream;
        try {
          viduStream = await axios.get(viduVideoUrl, {
            responseType: "stream",
            timeout: 600000,
          });
        } catch (e) {
          res.status(500).json({
            success: false,
            error: "Failed to download Vidu 1.5 video",
            details: serializeError(e),
          });
          return;
        }
        let uploadedVidu15;
        try {
          uploadedVidu15 = await uploadGeneratedVideo(
            feature,
            "vidu15",
            viduStream.data as Readable
          );
        } catch (e) {
          res.status(500).json({
            success: false,
            error: "Failed to upload Vidu 1.5 video to S3",
            details: serializeError(e),
          });
          return;
        }
        res.status(200).json({
          success: true,
          video: {
            url: uploadedVidu15.signedUrl,
            signedUrl: uploadedVidu15.signedUrl,
            key: uploadedVidu15.key,
          },
          s3Key: uploadedVidu15.key,
        });
        return;
      }

      // Eachlabs Vidu Q1 Image to Video branch
      const isViduQ1Image2Video = /vidu-q1-image-to-video/i.test(rawModel);
      if (isViduQ1Image2Video) {
        const eachLabsKey =
          process.env.PIXVERSE_API_KEY || process.env.EACHLABS_API_KEY;
        if (!eachLabsKey) {
          res.status(500).json({
            success: false,
            error: "EACHLABS / PIXVERSE API key not set",
          });
          return;
        }

        const viduVersion = process.env.VIDU_Q1_I2V_VERSION || "0.0.1";
        const duration = Number(process.env.VIDU_Q1_I2V_DURATION || 5);
        const aspect = process.env.VIDU_Q1_I2V_ASPECT_RATIO || "16:9";
        const resolution = process.env.VIDU_Q1_I2V_RESOLUTION || "1080p";

        const input = {
          image_url: imageCloudUrl,
          prompt: prompt,
          duration: duration,
          aspect_ratio: aspect,
          resolution: resolution,
        };

        const createPayload = {
          model: "vidu-q-1-image-to-video",
          version: viduVersion,
          input,
          webhook_url: process.env.VIDU_Q1_I2V_WEBHOOK_URL || "",
        };

        let createResp: any;
        let predictionId: string;
        try {
          createResp = await axios.post(
            "https://api.eachlabs.ai/v1/prediction/",
            createPayload,
            {
              headers: {
                "x-api-key": eachLabsKey,
                "Content-Type": "application/json",
              },
              timeout: 30000,
            }
          );
          const prediction = createResp.data || {};
          console.log("Vidu Q1 I2V create response:", prediction);
          const statusStr = String(prediction.status || "").toLowerCase();
          if (statusStr !== "success") {
            const provider_message =
              (prediction as any)?.error ||
              (prediction as any)?.message ||
              "Unknown status";
            res.status(502).json({
              success: false,
              error: `Vidu Q1 I2V creation failed: ${provider_message}`,
              provider: "ViduQ1I2V",
              provider_status: (prediction as any)?.status,
              provider_message,
              details: safeJson(prediction),
            });
            return;
          }
          predictionId = (prediction as any)?.predictionID;
          if (!predictionId) {
            res.status(502).json({
              success: false,
              error: "Vidu Q1 I2V response missing prediction id",
              details: safeJson(prediction),
            });
            return;
          }
        } catch (err) {
          const viduQ1I2VErr = err as any;
          console.error("Vidu Q1 I2V create error:", {
            error: viduQ1I2VErr,
            payload: createPayload,
            serverResponse: viduQ1I2VErr?.response?.data,
          });
          res.status(502).json({
            success: false,
            error: "Failed to create Vidu Q1 I2V prediction",
            details: serializeError(err),
          });
          return;
        }

        // Poll
        let viduVideoUrl: string | undefined;
        for (let i = 0; i < 300; i++) {
          // up to ~5 min
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const result = await axios.get(
              `https://api.eachlabs.ai/v1/prediction/${predictionId}`,
              {
                headers: { "x-api-key": eachLabsKey },
                timeout: 10000,
              }
            );
            const lower = String(result.data.status || "").toLowerCase();
            if (lower === "success" || lower === "completed") {
              const rawOut = result.data.output;
              if (typeof rawOut === "string") viduVideoUrl = rawOut;
              else if (rawOut) {
                const out: any = rawOut;
                viduVideoUrl =
                  out.video_url ||
                  out.video ||
                  (Array.isArray(out) ? out[0]?.video_url || out[0] : null) ||
                  out.url ||
                  result.data.url ||
                  null;
              } else {
                viduVideoUrl =
                  result.data.video_url ||
                  result.data.video ||
                  result.data.url ||
                  null;
              }
              break;
            } else if (lower === "failed" || lower === "error") {
              const provider_message =
                result.data.error || result.data.message || "Unknown error";
              res.status(500).json({
                success: false,
                error: provider_message
                  ? `Vidu Q1 I2V prediction failed: ${provider_message}`
                  : "Vidu Q1 I2V prediction failed",
                provider: "ViduQ1I2V",
                provider_status: (result.data as any)?.status,
                provider_message,
                details: safeJson(result.data),
              });
              return;
            }
          } catch (e) {
            console.warn(
              "Vidu Q1 I2V poll error (continuing)",
              (e as any)?.message || e
            );
            continue;
          }
        }
        if (!viduVideoUrl) {
          res.status(504).json({
            success: false,
            error: "Vidu Q1 I2V prediction timeout",
            provider: "ViduQ1I2V",
            provider_status: "timeout",
            provider_message: "Prediction did not complete in allotted time",
          });
          return;
        }
        // Download & upload to S3
        let viduStream;
        try {
          viduStream = await axios.get(viduVideoUrl, {
            responseType: "stream",
            timeout: 600000,
          });
        } catch (e) {
          res.status(500).json({
            success: false,
            error: "Failed to download Vidu Q1 I2V video",
            details: serializeError(e),
          });
          return;
        }
        let uploadedViduQ1I2V;
        try {
          uploadedViduQ1I2V = await uploadGeneratedVideo(
            feature,
            "viduq1-i2v",
            viduStream.data as Readable
          );
        } catch (e) {
          res.status(500).json({
            success: false,
            error: "Failed to upload Vidu Q1 I2V video to S3",
            details: serializeError(e),
          });
          return;
        }
        res.status(200).json({
          success: true,
          video: {
            url: uploadedViduQ1I2V.signedUrl,
            signedUrl: uploadedViduQ1I2V.signedUrl,
            key: uploadedViduQ1I2V.key,
          },
          s3Key: uploadedViduQ1I2V.key,
        });
        return;
      }

      // Eachlabs Vidu 2.0 Image to Video branch
      const isVidu20Image2Video = /vidu-2\.0-image-to-video/i.test(rawModel);
      if (isVidu20Image2Video) {
        const eachLabsKey =
          process.env.PIXVERSE_API_KEY || process.env.EACHLABS_API_KEY;
        if (!eachLabsKey) {
          res.status(500).json({
            success: false,
            error: "EACHLABS / PIXVERSE API key not set",
          });
          return;
        }

        const viduVersion = process.env.VIDU_20_VERSION || "0.0.1";
        const duration = Number(process.env.VIDU_20_DURATION || 4);
        const resolution = "720p";

        const input = {
          image_url: imageCloudUrl,
          prompt: prompt,
          duration: duration,
          resolution: resolution,
        };

        const createPayload = {
          model: "vidu-2-0-image-to-video",
          version: viduVersion,
          input,
          webhook_url: process.env.VIDU_20_WEBHOOK_URL || "",
        };

        let createResp: any;
        let predictionId: string;
        try {
          createResp = await axios.post(
            "https://api.eachlabs.ai/v1/prediction/",
            createPayload,
            {
              headers: {
                "x-api-key": eachLabsKey,
                "Content-Type": "application/json",
              },
              timeout: 30000,
            }
          );
          const prediction = createResp.data || {};
          console.log("Vidu 2.0 create response:", prediction);
          const statusStr = String(prediction.status || "").toLowerCase();
          if (statusStr !== "success") {
            const provider_message =
              (prediction as any)?.message ||
              (prediction as any)?.error ||
              (prediction as any)?.status ||
              "Unknown status";
            res.status(502).json({
              success: false,
              error: `Vidu 2.0 creation failed: ${provider_message}`,
              provider: "Vidu20",
              provider_status: (prediction as any)?.status,
              provider_message,
              details: safeJson(prediction),
            });
            return;
          }
          predictionId = (prediction as any)?.predictionID;
          if (!predictionId) {
            res.status(502).json({
              success: false,
              error: "Vidu 2.0 response missing prediction id",
              details: safeJson(prediction),
            });
            return;
          }
        } catch (err) {
          const vidu20Err = err as any;
          console.error("Vidu 2.0 create error:", {
            error: vidu20Err,
            payload: createPayload,
            serverResponse: vidu20Err?.response?.data,
          });
          res.status(502).json({
            success: false,
            error: "Failed to create Vidu 2.0 prediction",
            details: serializeError(err),
          });
          return;
        }

        // Poll
        let viduVideoUrl: string | undefined;
        for (let i = 0; i < 300; i++) {
          // up to ~5 min
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const pollResp = await axios.get(
              `https://api.eachlabs.ai/v1/prediction/${predictionId}`,
              {
                headers: { "x-api-key": eachLabsKey },
                timeout: 20000,
              }
            );
            const result = pollResp.data || {};
            const lower = String(result.status || "").toLowerCase();
            if (lower === "success" || lower === "completed") {
              const rawOut = result.output;
              if (typeof rawOut === "string") {
                viduVideoUrl = rawOut;
              } else if (rawOut) {
                const out: any = rawOut;
                viduVideoUrl =
                  out.video_url ||
                  out.video ||
                  (Array.isArray(out) ? out[0]?.video_url || out[0] : null) ||
                  result.video_url ||
                  result.video ||
                  out.url ||
                  result.url ||
                  null;
              } else {
                viduVideoUrl =
                  result.video_url || result.video || result.url || null;
              }
              break;
            } else if (
              ["error", "failed", "canceled", "cancelled"].includes(lower)
            ) {
              const provider_message =
                (result as any)?.error ||
                (result as any)?.message ||
                (result as any)?.status;
              res.status(500).json({
                success: false,
                error: provider_message
                  ? `Vidu 2.0 prediction failed: ${provider_message}`
                  : "Vidu 2.0 prediction failed",
                provider: "Vidu20",
                provider_status: (result as any)?.status,
                provider_message,
                details: safeJson(result),
              });
              return;
            }
          } catch (e) {
            console.warn(
              "Vidu 2.0 poll error (continuing)",
              (e as any)?.message || e
            );
            continue;
          }
        }
        if (!viduVideoUrl) {
          res.status(504).json({
            success: false,
            error: "Vidu 2.0 prediction timeout",
            provider: "Vidu20",
            provider_status: "timeout",
            provider_message: "Prediction did not complete in allotted time",
          });
          return;
        }
        // Download & upload to S3
        let viduStream;
        try {
          viduStream = await axios.get(viduVideoUrl, {
            responseType: "stream",
            timeout: 600000,
          });
        } catch (e) {
          res.status(500).json({
            success: false,
            error: "Failed to download Vidu 2.0 video",
            details: serializeError(e),
          });
          return;
        }
        let uploadedVidu20;
        try {
          uploadedVidu20 = await uploadGeneratedVideo(
            feature,
            "vidu20",
            viduStream.data as Readable
          );
        } catch (e) {
          res.status(500).json({
            success: false,
            error: "Failed to upload Vidu 2.0 video to S3",
            details: serializeError(e),
          });
          return;
        }
        res.status(200).json({
          success: true,
          video: {
            url: uploadedVidu20.signedUrl,
            signedUrl: uploadedVidu20.signedUrl,
            key: uploadedVidu20.key,
          },
          s3Key: uploadedVidu20.key,
        });
        return;
      }

      // Eachlabs Veo 2 Image to Video branch
      const isVeo2Image2Video = /veo-2-image-to-video/i.test(rawModel);
      if (isVeo2Image2Video) {
        const eachLabsKey = process.env.EACHLABS_API_KEY;
        if (!eachLabsKey) {
          res.status(500).json({
            success: false,
            error: "EACHLABS API key not set",
          });
          return;
        }

        const veoVersion = process.env.VEO_2_VERSION || "0.0.1";
        const duration = Number(process.env.VEO_2_DURATION || 5);
        const aspect = process.env.VEO_2_ASPECT_RATIO || "auto";
        const resolution = process.env.VEO_2_RESOLUTION || "720p";

        const input = {
          image_url: imageCloudUrl,
          prompt: prompt,
          duration: duration,
          aspect_ratio: aspect,
          resolution: resolution,
        };

        const createPayload = {
          model: "veo-2-image-to-video",
          version: veoVersion,
          input,
          webhook_url: process.env.VEO_2_WEBHOOK_URL || "",
        };

        let createResp: any;
        let predictionId: string;
        try {
          createResp = await axios.post(
            "https://api.eachlabs.ai/v1/prediction/",
            createPayload,
            {
              headers: {
                "X-API-Key": eachLabsKey,
                "Content-Type": "application/json",
              },
              timeout: 30000,
            }
          );
          const prediction = createResp.data || {};
          console.log("Veo 2 Image to Video create response:", prediction);
          const statusStr = String(prediction.status || "").toLowerCase();
          if (statusStr !== "success") {
            const provider_message =
              (prediction as any)?.message ||
              (prediction as any)?.error ||
              (prediction as any)?.status ||
              "Unknown status";
            res.status(502).json({
              success: false,
              error: `Veo 2 Image to Video creation failed: ${provider_message}`,
              provider: "Veo2Image2Video",
              provider_status: (prediction as any)?.status,
              provider_message,
              details: safeJson(prediction),
            });
            return;
          }
          predictionId = (prediction as any)?.predictionID;
          if (!predictionId) {
            res.status(502).json({
              success: false,
              error: "Veo 2 Image to Video response missing prediction id",
              details: safeJson(prediction),
            });
            return;
          }
        } catch (err) {
          const veo2Err = err as any;
          console.error("Veo 2 Image to Video create error:", {
            error: veo2Err,
            payload: createPayload,
            serverResponse: veo2Err?.response?.data,
          });
          res.status(502).json({
            success: false,
            error: "Failed to create Veo 2 Image to Video prediction",
            details: serializeError(err),
          });
          return;
        }

        // Poll
        let veoVideoUrl: string | undefined;
        for (let i = 0; i < 300; i++) {
          // up to ~5 min
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const pollResp = await axios.get(
              `https://api.eachlabs.ai/v1/prediction/${predictionId}`,
              {
                headers: { "x-api-key": eachLabsKey },
                timeout: 20000,
              }
            );
            const result = pollResp.data || {};
            const lower = String(result.status || "").toLowerCase();
            if (lower === "success" || lower === "completed") {
              const rawOut = result.output;
              if (typeof rawOut === "string") {
                veoVideoUrl = rawOut;
              } else if (rawOut) {
                const out: any = rawOut;
                veoVideoUrl =
                  out.video_url ||
                  out.video ||
                  (Array.isArray(out) ? out[0]?.video_url || out[0] : null) ||
                  result.video_url ||
                  result.video ||
                  out.url ||
                  result.url ||
                  null;
              } else {
                veoVideoUrl =
                  result.video_url || result.video || result.url || null;
              }
              break;
            } else if (
              ["error", "failed", "canceled", "cancelled"].includes(lower)
            ) {
              const provider_message =
                (result as any)?.error ||
                (result as any)?.message ||
                (result as any)?.status;
              res.status(500).json({
                success: false,
                error: provider_message
                  ? `Veo 2 Image to Video prediction failed: ${provider_message}`
                  : "Veo 2 Image to Video prediction failed",
                provider: "Veo2Image2Video",
                provider_status: (result as any)?.status,
                provider_message,
                details: safeJson(result),
              });
              return;
            }
          } catch (e) {
            console.warn(
              "Veo 2 Image to Video poll error (continuing)",
              (e as any)?.message || e
            );
            continue;
          }
        }
        if (!veoVideoUrl) {
          res.status(504).json({
            success: false,
            error: "Veo 2 Image to Video prediction timeout",
            provider: "Veo2Image2Video",
            provider_status: "timeout",
            provider_message: "Prediction did not complete in allotted time",
          });
          return;
        }
        // Download & upload to S3
        let veoStream;
        try {
          veoStream = await axios.get(veoVideoUrl, {
            responseType: "stream",
            timeout: 600000,
          });
        } catch (e) {
          res.status(500).json({
            success: false,
            error: "Failed to download Veo 2 Image to Video video",
            details: serializeError(e),
          });
          return;
        }
        let uploadedVeo2I2V;
        try {
          uploadedVeo2I2V = await uploadGeneratedVideo(
            feature,
            "veo2-i2v",
            veoStream.data as Readable
          );
        } catch (e) {
          res.status(500).json({
            success: false,
            error: "Failed to upload Veo 2 Image to Video video to S3",
            details: serializeError(e),
          });
          return;
        }
        res.status(200).json({
          success: true,
          video: {
            url: uploadedVeo2I2V.signedUrl,
            signedUrl: uploadedVeo2I2V.signedUrl,
            key: uploadedVeo2I2V.key,
          },
          s3Key: uploadedVeo2I2V.key,
        });
        return;
      }

      // Eachlabs Veo 3 Image to Video branch
      const isVeo3Image2Video = /veo-3-image-to-video/i.test(rawModel);
      if (isVeo3Image2Video) {
        const eachLabsKey = process.env.EACHLABS_API_KEY;
        if (!eachLabsKey) {
          res.status(500).json({
            success: false,
            error: "EACHLABS API key not set",
          });
          return;
        }

        const veoVersion = process.env.VEO_3_VERSION || "0.0.1";
        const duration = Number(process.env.VEO_3_DURATION || 8);
        const resolution = process.env.VEO_3_RESOLUTION || "720p";

        const input = {
          image_url: imageCloudUrl,
          prompt: prompt,
          duration: duration,
          resolution: resolution,
        };

        const createPayload = {
          model: "veo-3-image-to-video",
          version: veoVersion,
          input,
          webhook_url: process.env.VEO_3_WEBHOOK_URL || "",
        };

        let createResp: any;
        let predictionId: string;
        try {
          createResp = await axios.post(
            "https://api.eachlabs.ai/v1/prediction/",
            createPayload,
            {
              headers: {
                "x-api-key": eachLabsKey,
                "Content-Type": "application/json",
              },
              timeout: 30000,
            }
          );
          const prediction = createResp.data || {};
          console.log("Veo 3 Image to Video create response:", prediction);
          const statusStr = String(prediction.status || "").toLowerCase();
          if (statusStr !== "success") {
            const provider_message =
              (prediction as any)?.message ||
              (prediction as any)?.error ||
              (prediction as any)?.status ||
              "Unknown status";
            res.status(502).json({
              success: false,
              error: `Veo 3 Image to Video creation failed: ${provider_message}`,
              provider: "Veo3Image2Video",
              provider_status: (prediction as any)?.status,
              provider_message,
              details: safeJson(prediction),
            });
            return;
          }
          predictionId = (prediction as any)?.predictionID;
          if (!predictionId) {
            res.status(502).json({
              success: false,
              error: "Veo 3 Image to Video response missing prediction id",
              details: safeJson(prediction),
            });
            return;
          }
        } catch (err) {
          const veo3Err = err as any;
          console.error("Veo 3 Image to Video create error:", {
            error: veo3Err,
            payload: createPayload,
            serverResponse: veo3Err?.response?.data,
          });
          res.status(502).json({
            success: false,
            error: "Failed to create Veo 3 Image to Video prediction",
            details: serializeError(err),
          });
          return;
        }

        // Poll
        let veoVideoUrl: string | undefined;
        for (let i = 0; i < 300; i++) {
          // up to ~5 min
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const pollResp = await axios.get(
              `https://api.eachlabs.ai/v1/prediction/${predictionId}`,
              {
                headers: { "x-api-key": eachLabsKey },
                timeout: 20000,
              }
            );
            const result = pollResp.data || {};
            const lower = String(result.status || "").toLowerCase();
            if (lower === "success" || lower === "completed") {
              const rawOut = result.output;
              if (typeof rawOut === "string") {
                veoVideoUrl = rawOut;
              } else if (rawOut) {
                const out: any = rawOut;
                veoVideoUrl =
                  out.video_url ||
                  out.video ||
                  (Array.isArray(out) ? out[0]?.video_url || out[0] : null) ||
                  result.video_url ||
                  result.video ||
                  out.url ||
                  result.url ||
                  null;
              } else {
                veoVideoUrl =
                  result.video_url || result.video || result.url || null;
              }
              break;
            } else if (
              ["error", "failed", "canceled", "cancelled"].includes(lower)
            ) {
              const provider_message =
                (result as any)?.error ||
                (result as any)?.message ||
                (result as any)?.status;
              res.status(500).json({
                success: false,
                error: provider_message
                  ? `Veo 3 Image to Video prediction failed: ${provider_message}`
                  : "Veo 3 Image to Video prediction failed",
                provider: "Veo3Image2Video",
                provider_status: (result as any)?.status,
                provider_message,
                details: safeJson(result),
              });
              return;
            }
          } catch (e) {
            console.warn(
              "Veo 3 Image to Video poll error (continuing)",
              (e as any)?.message || e
            );
            continue;
          }
        }
        if (!veoVideoUrl) {
          res.status(504).json({
            success: false,
            error: "Veo 3 Image to Video prediction timeout",
            provider: "Veo3Image2Video",
            provider_status: "timeout",
            provider_message: "Prediction did not complete in allotted time",
          });
          return;
        }
        // Download & upload to S3
        let veoStream;
        try {
          veoStream = await axios.get(veoVideoUrl, {
            responseType: "stream",
            timeout: 600000,
          });
        } catch (e) {
          res.status(500).json({
            success: false,
            error: "Failed to download Veo 3 Image to Video video",
            details: serializeError(e),
          });
          return;
        }
        let uploadedVeo3I2V;
        try {
          uploadedVeo3I2V = await uploadGeneratedVideo(
            feature,
            "veo3-i2v",
            veoStream.data as Readable
          );
        } catch (e) {
          res.status(500).json({
            success: false,
            error: "Failed to upload Veo 3 Image to Video video to S3",
            details: serializeError(e),
          });
          return;
        }
        res.status(200).json({
          success: true,
          video: {
            url: uploadedVeo3I2V.signedUrl,
            signedUrl: uploadedVeo3I2V.signedUrl,
            key: uploadedVeo3I2V.key,
          },
          s3Key: uploadedVeo3I2V.key,
        });
        return;
      }

      // Check for Bytedance | Omnihuman or Seeddance V1 Pro model
      const isBytedanceOmnihuman = /bytedance-omnihuman/i.test(rawModel);
      const isBytedanceSeeddance =
        /bytedance-seeddance-v1-pro-image-to-video/i.test(rawModel);

      if (isBytedanceOmnihuman || isBytedanceSeeddance) {
        console.log(
          "[Bytedance] Starting video generation for model:",
          isBytedanceOmnihuman
            ? "bytedance-omnihuman"
            : "seedance-v1-pro-image-to-video"
        );
        console.log("[Bytedance] Feature endpoint:", feature);
        console.log("[Bytedance] Image URL:", imageCloudUrl);
        const bytedanceKey = process.env.EACHLABS_API_KEY;
        if (!bytedanceKey) {
          res
            .status(500)
            .json({ success: false, error: "EACHLABS_API_KEY not set" });
          return;
        }

        // If audio file is present, upload to S3 and get signed URL
        let audioUrl: string | null = null;
        if (req.file) {
          console.log("[Bytedance] Audio file detected, uploading to S3...");
          // Only accept files up to ~1MB (30s mp3/wav)
          if (req.file.size > 2 * 1024 * 1024) {
            res.status(400).json({
              success: false,
              error: "Audio file too large (max 2MB)",
            });
            return;
          }
          try {
            const audioExt =
              (req.file.originalname || "mp3").split(".").pop() || "mp3";
            const audioKey = makeKey({
              type: "audio",
              feature,
              ext: audioExt,
            });
            await uploadBuffer(
              audioKey,
              req.file.buffer,
              req.file.mimetype || "audio/mpeg"
            );
            try {
              audioUrl = await signKey(audioKey);
            } catch {
              audioUrl = publicUrlFor(audioKey); // fallback (may be private)
            }
          } catch (e) {
            console.error("[Bytedance] Audio S3 upload failed", e);
            res.status(500).json({
              success: false,
              error: "Failed to upload audio file",
              details: serializeError(e),
            });
            return;
          }
        }

        // Build payload for Omnihuman or Seeddance
        const bytedanceInput: any = {
          image_url: imageCloudUrl,
        };
        if (audioUrl) {
          bytedanceInput.audio_url = audioUrl;
        }
        let bytedancePayload;
        if (isBytedanceOmnihuman) {
          bytedancePayload = {
            model: "bytedance-omnihuman",
            version: "0.0.1",
            input: bytedanceInput,
            webhook_url: "",
          };
        } else {
          // Seeddance V1 Pro
          bytedancePayload = {
            model: "seedance-v1-pro-image-to-video",
            version: "0.0.1",
            input: {
              ...bytedanceInput,
              camera_fixed: false,
              duration: "5",
              resolution: "720p",
              ...(prompt ? { prompt } : {}),
            },
            webhook_url: "",
          };
        }
        console.log(
          "[Bytedance] Payload:",
          JSON.stringify(bytedancePayload, null, 2)
        );

        let taskId: string | undefined;
        try {
          const createResp = await axios.post(
            "https://api.eachlabs.ai/v1/prediction/",
            bytedancePayload,
            {
              headers: {
                "X-API-Key": bytedanceKey,
                "Content-Type": "application/json",
              },
              timeout: 45000,
            }
          );
          const data = createResp.data || {};
          console.log(
            "[Bytedance] Creation response:",
            JSON.stringify(data, null, 2)
          );

          if (data.status !== "success") {
            const provider_message =
              data.message || data.error || data.status || "Unknown error";
            console.error(
              "[Bytedance] Creation failed:",
              provider_message,
              data
            );
            res.status(502).json({
              success: false,
              error: `Bytedance creation failed: ${provider_message}`,
              provider: "Bytedance",
              provider_status: data.status,
              provider_message,
              details: safeJson(data),
            });
            return;
          }

          taskId =
            data.predictionID || data.predictionId || data.id || data.task_id;
          if (!taskId) {
            console.error("[Bytedance] No prediction id in response:", data);
            res.status(502).json({
              success: false,
              error: "Bytedance response missing prediction id",
              provider: "Bytedance",
              details: safeJson(data),
            });
            return;
          }
        } catch (e: any) {
          console.error("[Bytedance] Creation error:", serializeError(e));
          const provider_message =
            e?.response?.data?.message ||
            e?.response?.data?.error ||
            e?.message ||
            "Unknown error";
          res.status(502).json({
            success: false,
            error: `Bytedance creation failed: ${provider_message}`,
            provider: "Bytedance",
            details: serializeError(e),
          });
          return;
        }

        // Poll for completion
        let bytedanceVideoUrl: string | null = null;
        for (let i = 0; i < 120; i++) {
          // up to ~8 minutes (120 * 4s)
          await new Promise((r) => setTimeout(r, 4000));
          try {
            const pollResp = await axios.get(
              `https://api.eachlabs.ai/v1/prediction/${taskId}`,
              {
                headers: {
                  "X-API-Key": bytedanceKey,
                  "Content-Type": "application/json",
                },
                timeout: 20000,
              }
            );
            const pollData = pollResp.data || {};
            console.log(
              `[Bytedance] Poll #${i + 1}:`,
              JSON.stringify(pollData, null, 2)
            );

            if (
              pollData.status === "succeeded" ||
              pollData.status === "success"
            ) {
              bytedanceVideoUrl = pollData.output;
              if (bytedanceVideoUrl) {
                console.log(
                  "[Bytedance] Generation completed. Video URL:",
                  bytedanceVideoUrl
                );
                break;
              }
            }

            if (pollData.status === "failed" || pollData.status === "error") {
              const provider_message =
                pollData.output || pollData.error || pollData.status;
              console.error(
                `[Bytedance] Generation failed:`,
                provider_message,
                pollData
              );
              res.status(500).json({
                success: false,
                error: `${provider_message}`,
                provider: "Bytedance",
                provider_status: pollData.status,
                provider_message,
                details: safeJson(pollData),
              });
              return;
            }
          } catch (e: any) {
            console.warn(
              `[Bytedance] Poll error (continuing):`,
              e?.message || e
            );
            continue;
          }
        }

        if (!bytedanceVideoUrl) {
          console.error(
            "[Bytedance] Generation timeout: No video URL after polling"
          );
          res.status(504).json({
            success: false,
            error: "Bytedance Omnihuman generation timeout",
            provider: "Bytedance",
            provider_status: "timeout",
            provider_message: "Generation did not complete in allotted time",
          });
          return;
        }

        // Download video from Bytedance URL
        let bytedanceStream;
        try {
          bytedanceStream = await axios.get(bytedanceVideoUrl, {
            responseType: "stream",
            timeout: 600000,
          });
        } catch (e: any) {
          console.error("[Bytedance] Download error:", serializeError(e));
          res.status(500).json({
            success: false,
            error: "Failed to download Bytedance Omnihuman video",
            provider: "Bytedance",
            details: serializeError(e),
          });
          return;
        }

        // Upload to S3
        let uploadedBytedance;
        try {
          uploadedBytedance = await uploadGeneratedVideo(
            feature,
            isBytedanceOmnihuman ? "bytedance-omnihuman" : "seedance-v1-pro",
            bytedanceStream.data as Readable
          );
        } catch (e) {
          console.error("[Bytedance] S3 upload error", serializeError(e));
          res.status(500).json({
            success: false,
            error: "Failed to upload Bytedance video to S3",
            provider: "Bytedance",
            details: serializeError(e),
          });
          return;
        }
        res.json({
          success: true,
          video: {
            url: uploadedBytedance.signedUrl,
            signedUrl: uploadedBytedance.signedUrl,
            key: uploadedBytedance.key,
          },
          s3Key: uploadedBytedance.key,
          provider: "Bytedance",
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

        // Map frontend model names to correct MiniMax API model names
        let minimaxModel = rawModel;
        if (/MiniMax-Hailuo-02/i.test(rawModel)) {
          minimaxModel = "MiniMax-Hailuo-02";
        } else if (/I2V-01-Director/i.test(rawModel)) {
          minimaxModel = "I2V-01-Director";
        } else if (/I2V-01-live/i.test(rawModel)) {
          minimaxModel = "I2V-01-live";
        } else if (/I2V-01/i.test(rawModel)) {
          minimaxModel = "I2V-01";
        }

        const resolution =
          process.env.MINIMAX_RESOLUTION ||
          (minimaxModel === "MiniMax-Hailuo-02" ? "768P" : "720P");
        const mmPayload: any = {
          model: minimaxModel,
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
          const data = createResp.data || {};
          console.log("Minimax response: ", data);
          const base = data.base_resp || {};
          const provider_code = base.status_code;
          const provider_message = base.status_msg;
          taskId = data?.task_id;
          // If provider returns an error code (non-zero) or no task id, treat as failure and expose provider message
          if ((provider_code !== undefined && provider_code !== 0) || !taskId) {
            res.status(400).json({
              success: false,
              error: provider_message || "MiniMax creation failed",
              provider: "MiniMax",
              provider_code,
              provider_message:
                provider_message ||
                (taskId ? undefined : "Missing task_id in response"),
              details: safeJson(data),
            });
            return;
          }
        } catch (e: any) {
          // already using e as any here, so no change needed
          const respData = e?.response?.data;
          const base = respData?.base_resp || {};
          const provider_code = base?.status_code;
          const provider_message =
            base?.status_msg || respData?.message || e?.message;
          res.status(502).json({
            success: false,
            error: provider_message
              ? `MiniMax creation failed: ${provider_message}`
              : "Failed to create MiniMax generation",
            provider: "MiniMax",
            provider_code,
            provider_message,
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
              const base = pollResp.data?.base_resp || {};
              const provider_code = base?.status_code;
              const provider_message =
                base?.status_msg ||
                pollResp.data?.status_reason ||
                pollResp.data?.message ||
                pollResp.data?.status;
              res.status(500).json({
                success: false,
                error: provider_message
                  ? `MiniMax generation failed: ${provider_message}`
                  : "MiniMax generation failed",
                provider: "MiniMax",
                provider_code,
                provider_message,
                provider_status: pollResp.data?.status,
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
          res.status(504).json({
            success: false,
            error: "MiniMax generation timeout",
            provider: "MiniMax",
            provider_status: "timeout",
            provider_message: "Generation did not complete in allotted time",
          });
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
                provider: "MiniMax",
                provider_message: "retrieve missing download_url",
                details: safeJson(retrieveResp.data),
              });
              return;
            }
          } catch (e: any) {
            console.error("MiniMax retrieve error:", serializeError(e));
            const respData = e?.response?.data;
            const base = respData?.base_resp || {};
            const provider_code = base?.status_code;
            const provider_message =
              base?.status_msg || respData?.message || e?.message;
            res.status(502).json({
              success: false,
              error: provider_message
                ? `MiniMax retrieve failed: ${provider_message}`
                : "Failed to retrieve MiniMax video file",
              provider: "MiniMax",
              provider_code,
              provider_message,
              details: serializeError(e),
            });
            return;
          }
        }

        if (!mmVideoUrl) {
          res.status(500).json({
            success: false,
            error: "MiniMax video URL unresolved",
            provider: "MiniMax",
            provider_message: "Video URL not provided by API",
          });
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
          const respData = e?.response?.data;
          const base = respData?.base_resp || {};
          const provider_code = base?.status_code;
          const provider_message =
            base?.status_msg || respData?.message || e?.message;
          res.status(500).json({
            success: false,
            error: provider_message
              ? `MiniMax download failed: ${provider_message}`
              : "Failed to download MiniMax video",
            provider: "MiniMax",
            provider_code,
            provider_message,
            details: serializeError(e),
          });
          return;
        }
        // Upload to S3
        let uploadedMiniMax;
        try {
          uploadedMiniMax = await uploadGeneratedVideo(
            feature,
            "minimax",
            mmStream.data as Readable
          );
        } catch (e) {
          res.status(500).json({
            success: false,
            error: "Failed to upload MiniMax video to S3",
            provider: "MiniMax",
            details: serializeError(e),
          });
          return;
        }
        res.status(200).json({
          success: true,
          video: {
            url: uploadedMiniMax.signedUrl,
            signedUrl: uploadedMiniMax.signedUrl,
            key: uploadedMiniMax.key,
          },
          s3Key: uploadedMiniMax.key,
          provider: "MiniMax",
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
          console.error("Luma create generation error:", {
            error: serializeError(e),
            payload: lumaPayload,
            serverResponse: e?.response?.data,
          });
          const respData = (e as any)?.response?.data;
          // Prefer detail/message/error from server response for user-facing error
          const userMessage =
            respData?.detail ||
            respData?.message ||
            respData?.error ||
            (e as any)?.message;
          res.status(503).json({
            success: false,
            error: userMessage
              ? `${userMessage}`
              : "Luma API unreachable or timed out",
            provider: "Luma",
            provider_message: userMessage,
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
            provider: "Luma",
            provider_message: e?.message,
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
          const provider_message =
            pollRes.data?.failure_reason ||
            pollRes.data?.error ||
            pollRes.data?.message ||
            pollRes.data?.state;
          res.status(500).json({
            success: false,
            error: provider_message
              ? `Luma generation failed: ${provider_message}`
              : "Luma generation failed",
            provider: "Luma",
            provider_status: pollRes.data?.state,
            provider_message,
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
          provider: "Luma",
          provider_status: state || "timeout",
          provider_message: "Generation timed out",
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
          provider: "Luma",
          provider_message: e?.message,
          details: serializeError(e),
        });
        return;
      }

      // Upload the video stream to S3
      let uploadedLuma;
      try {
        const variant = selectedModel.replace(/[^a-z0-9-]/gi, "-");
        uploadedLuma = await uploadGeneratedVideo(
          feature,
          variant,
          videoResponse.data as Readable
        );
      } catch (e) {
        res.status(500).json({
          success: false,
          error: "Failed to upload Luma video to S3",
          provider: "Luma",
          details: serializeError(e),
        });
        return;
      }
      res.status(200).json({
        success: true,
        video: {
          url: uploadedLuma.signedUrl,
          signedUrl: uploadedLuma.signedUrl,
          key: uploadedLuma.key,
        },
        s3Key: uploadedLuma.key,
        provider: "Luma",
      });
    } catch (error) {
      console.error("Error generating video:", serializeError(error));
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error:
          errorMessage && !/Failed to generate video/.test(errorMessage)
            ? errorMessage
            : "Failed to generate video",
        details: errorMessage,
      });
    }
  }
);

export default router;
