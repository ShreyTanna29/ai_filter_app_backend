import { Router, Request, Response } from "express";
import multer from "multer";
import axios from "axios";
import https from "https";
// Optional but highly recommended: compress large seed images before upload
// This reduces payload size and avoids gateway timeouts.
let sharp: any = null; // use 'any' to avoid type resolution when package isn't installed
try {
  // Lazy-load to avoid hard crash if dependency missing at runtime
  sharp = require("sharp");
} catch (e) {
  sharp = null;
}
import dotenv from "dotenv";
import prisma from "../lib/prisma";
import { randomUUID } from "crypto";

dotenv.config();

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const RUNWARE_API_URL = "https://api.runware.ai/v1";

// Reuse a keep-alive agent to improve large POST stability
const httpsAgent = new https.Agent({ keepAlive: true });

async function postRunware(payload: any, timeoutMs = 180_000) {
  return axios.post(RUNWARE_API_URL, payload, {
    headers: getRunwareHeaders(),
    timeout: timeoutMs,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    httpsAgent,
    // Follow-redirects is already used by axios in Node; agent helps keep the socket alive
  });
}

async function postRunwareWithRetry(
  payload: any,
  timeoutMs = 180_000,
  retries = 1
) {
  let lastErr: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await postRunware(payload, timeoutMs);
    } catch (err: any) {
      lastErr = err;
      const code = err?.code || err?.response?.status;
      const isTimeout =
        code === "ECONNABORTED" ||
        code === "ETIMEDOUT" ||
        code === 408 ||
        code === 504 ||
        code === 524;
      if (attempt < retries && isTimeout) {
        // brief backoff then retry
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function getRunwareHeaders() {
  const key = process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY;
  if (!key) {
    throw new Error(
      "RUNWARE_API_KEY not set. Please configure your Runware API key in environment variables."
    );
  }
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

// POST /api/runware/upload-image
// Accepts multipart/form-data (field: image) OR JSON body { imageUrl }
router.post(
  "/runware/upload-image",
  upload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      let imageParam: string | undefined;
      const urlFromBody: string | undefined = (req.body as any)?.imageUrl;

      if (req.file && req.file.buffer) {
        // If sharp is available, resize/compress overly large images to avoid 60s gateway timeouts
        let buf = req.file.buffer;
        const isLarge = buf.length > 3 * 1024 * 1024; // >3MB
        let outMime = req.file.mimetype || "image/png";
        if (sharp && isLarge) {
          try {
            // Convert to JPEG with max dimension 1536px to shrink payload substantially
            const pipeline = sharp(buf).rotate();
            const meta = await pipeline.metadata();
            const maxDim = 1536;
            const needsResize =
              (meta.width || 0) > maxDim || (meta.height || 0) > maxDim;
            let s = pipeline;
            if (needsResize) {
              s = s.resize({
                width:
                  meta.width && meta.width > (meta.height || 0)
                    ? maxDim
                    : undefined,
                height:
                  meta.height && (meta.height || 0) >= (meta.width || 0)
                    ? maxDim
                    : undefined,
                fit: "inside",
              });
            }
            buf = await s.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
            outMime = "image/jpeg";
          } catch (e) {
            // fall back to original buffer
          }
        }
        const base64 = buf.toString("base64");
        imageParam = `data:${outMime};base64,${base64}`;
      } else if (urlFromBody && typeof urlFromBody === "string") {
        imageParam = urlFromBody;
      } else {
        res.status(400).json({
          success: false,
          error:
            "No image provided. Send multipart 'image' or JSON { imageUrl }.",
        });
        return;
      }

      const payload = [
        {
          taskType: "imageUpload",
          taskUUID: randomUUID(),
          image: imageParam,
        },
      ];

      // Longer timeout and retry to be resilient to network slowness on large payloads
      const response = await postRunwareWithRetry(payload, 180_000, 1);

      const data = response.data;
      const obj = Array.isArray(data?.data) ? data.data[0] : data?.data;
      const imageUUID = obj?.imageUUID;
      if (!imageUUID) {
        res.status(502).json({
          success: false,
          error: "Runware image upload did not return imageUUID",
          details: data,
        });
        return;
      }
      res.json({ success: true, imageUUID });
      return;
    } catch (err: any) {
      // Avoid logging full axios config (may include secrets); surface concise message
      const msg =
        err?.response?.data?.errors?.[0]?.message ||
        err?.message ||
        "Unknown error";
      console.error("Runware upload-image error:", msg);
      res.status(500).json({
        success: false,
        error: msg || "Upload failed",
      });
      return;
    }
  }
);

// POST /api/runware/generate-photo
// JSON body: { feature?: string, prompt: string, model?: string, width?: number, height?: number, seedImage?: string }
router.post(
  "/runware/generate-photo",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        feature,
        prompt,
        model,
        width,
        height,
        seedImage,
        negativePrompt,
        steps,
        cfgScale,
        numberResults,
      } = req.body || {};

      // Basic validation
      if (!prompt || typeof prompt !== "string") {
        res.status(400).json({ success: false, error: "'prompt' is required" });
        return;
      }

      // Model normalization: map friendly aliases to known model IDs when possible
      const clientModel = (model && String(model)) || "";
      let chosenModel = clientModel || "bfl:2@1"; // default to a stable FLUX variant
      if (/^flux[-_\s]*schnell$/i.test(clientModel)) {
        // Use a fast FLUX variant if user asked for schnell; keep an internal default if exact ID unknown
        // If you know the precise Runware model ID for FLUX Schnell, place it here instead of bfl:2@1
        chosenModel = "bfl:2@1";
      }

      // Conservative defaults to avoid upstream timeouts
      const defaultSize =
        /^bfl:/.test(chosenModel) && /schnell/i.test(clientModel) ? 768 : 768; // use 768 for now across the board for reliability

      const task: any = {
        taskType: "imageInference",
        taskUUID: randomUUID(),
        outputType: "URL",
        positivePrompt: prompt,
        model: chosenModel,
        numberResults: Math.min(Math.max(parseInt(numberResults) || 1, 1), 4),
        // Reasonable defaults
        width: parseInt(width) || defaultSize,
        height: parseInt(height) || defaultSize,
      };
      if (negativePrompt && typeof negativePrompt === "string") {
        task.negativePrompt = negativePrompt;
      }
      if (seedImage && typeof seedImage === "string") {
        task.seedImage = seedImage; // UUID, URL, base64, or data URI supported by Runware
      }
      if (steps) task.steps = Math.min(Math.max(parseInt(steps) || 15, 1), 100);
      else task.steps = 15;
      if (cfgScale)
        task.CFGScale = Math.min(Math.max(parseFloat(cfgScale) || 7, 0), 50);

      const payload = [task];
      let response;
      try {
        response = await postRunwareWithRetry(payload, 150_000, 1);
      } catch (primaryErr: any) {
        // Adaptive fallback on upstream timeout (e.g., 524 from Cloudflare)
        const code = primaryErr?.code || primaryErr?.response?.status;
        const isTimeoutLike =
          code === 524 ||
          code === 504 ||
          code === 408 ||
          code === "ECONNABORTED" ||
          code === "ETIMEDOUT";
        if (isTimeoutLike) {
          try {
            const smaller = { ...task };
            // Reduce size and steps for fallback attempt
            smaller.width = Math.min(640, task.width || defaultSize);
            smaller.height = Math.min(640, task.height || defaultSize);
            smaller.steps = Math.min(12, task.steps || 12);
            const fallbackPayload = [smaller];
            response = await postRunwareWithRetry(fallbackPayload, 150_000, 0);
          } catch (fallbackErr) {
            throw primaryErr; // surface original error context
          }
        } else {
          throw primaryErr;
        }
      }

      const data = response.data;
      const resultItem = Array.isArray(data?.data)
        ? data.data.find((d: any) => d?.taskType === "imageInference") ||
          data.data[0]
        : data?.data;
      const imageURL =
        resultItem?.imageURL || resultItem?.url || resultItem?.imageDataURI;
      const imageUUID = resultItem?.imageUUID;
      if (!imageURL) {
        res.status(502).json({
          success: false,
          error: "Runware did not return an image URL",
          details: data,
        });
        return;
      }

      // Persist generated image URL (Runware URL) for history
      try {
        await prisma.generated_Photo.create({
          data: {
            feature: String(feature || chosenModel || "photo"),
            url: imageURL,
          },
        });
      } catch (e) {
        // Non-fatal
        console.warn(
          "Failed to persist Generated_Photo:",
          (e as any)?.message || e
        );
      }

      res.json({ success: true, image: { url: imageURL, imageUUID } });
      return;
    } catch (err: any) {
      const msg =
        err?.response?.data?.errors?.[0]?.message ||
        err?.message ||
        "Unknown error";
      console.error("Runware generate-photo error:", msg);
      res.status(500).json({
        success: false,
        error: msg || "Generation failed",
      });
      return;
    }
  }
);

export default router;
