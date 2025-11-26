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

// Riverflow 1.1 supports a fixed catalog of aspect ratios; enforce to avoid 4xx responses
const RIVERFLOW_MODEL_ID = "sourceful:1@1";
const RIVERFLOW_SIZES: Array<{ width: number; height: number }> = [
  { width: 1024, height: 1024 },
  { width: 1152, height: 864 },
  { width: 864, height: 1152 },
  { width: 1280, height: 720 },
  { width: 720, height: 1280 },
  { width: 1248, height: 832 },
  { width: 832, height: 1248 },
  { width: 1512, height: 648 },
  { width: 648, height: 1512 },
  { width: 1152, height: 896 },
  { width: 896, height: 1152 },
];

const SEEDDREAM_MODEL_ID = "bytedance:5@0";
const SEEDDREAM_DIMENSIONS: Array<{ width: number; height: number }> = [
  { width: 1024, height: 1024 },
  { width: 2048, height: 2048 },
  { width: 2304, height: 1728 },
  { width: 1728, height: 2304 },
  { width: 2560, height: 1440 },
  { width: 1440, height: 2560 },
  { width: 2496, height: 1664 },
  { width: 1664, height: 2496 },
  { width: 3024, height: 1296 },
  { width: 4096, height: 4096 },
  { width: 4608, height: 3456 },
  { width: 3456, height: 4608 },
  { width: 5120, height: 2880 },
  { width: 2880, height: 5120 },
  { width: 4992, height: 3328 },
  { width: 3328, height: 4992 },
  { width: 6048, height: 2592 },
];

const IDEOGRAM_MODEL_ID = "ideogram:4@1";
const IDEOGRAM_REMIX_MODEL_ID = "ideogram:4@2";
const IDEOGRAM_BASE_DIMENSIONS: Array<{ width: number; height: number }> = [
  { width: 1536, height: 512 },
  { width: 1536, height: 576 },
  { width: 1472, height: 576 },
  { width: 1408, height: 576 },
  { width: 1536, height: 640 },
  { width: 1472, height: 640 },
  { width: 1408, height: 640 },
  { width: 1344, height: 640 },
  { width: 1472, height: 704 },
  { width: 1408, height: 704 },
  { width: 1344, height: 704 },
  { width: 1280, height: 704 },
  { width: 1312, height: 736 },
  { width: 1344, height: 768 },
  { width: 1216, height: 704 },
  { width: 1280, height: 768 },
  { width: 1152, height: 704 },
  { width: 1280, height: 800 },
  { width: 1216, height: 768 },
  { width: 1248, height: 832 },
  { width: 1216, height: 832 },
  { width: 1088, height: 768 },
  { width: 1152, height: 832 },
  { width: 1152, height: 864 },
  { width: 1088, height: 832 },
  { width: 1152, height: 896 },
  { width: 1120, height: 896 },
  { width: 1024, height: 832 },
  { width: 1088, height: 896 },
  { width: 960, height: 832 },
  { width: 1024, height: 896 },
  { width: 1088, height: 960 },
  { width: 960, height: 896 },
  { width: 1024, height: 960 },
  { width: 1024, height: 1024 },
];
const IDEOGRAM_REMIX_BASE_DIMENSIONS: Array<{ width: number; height: number }> =
  [
    { width: 1536, height: 512 },
    { width: 1536, height: 576 },
    { width: 1472, height: 576 },
    { width: 1408, height: 576 },
    { width: 1536, height: 640 },
    { width: 1472, height: 640 },
    { width: 1408, height: 640 },
    { width: 1344, height: 640 },
    { width: 1472, height: 704 },
    { width: 1408, height: 704 },
    { width: 1344, height: 704 },
    { width: 1312, height: 736 },
    { width: 1344, height: 768 },
    { width: 1280, height: 704 },
    { width: 1216, height: 704 },
    { width: 1280, height: 768 },
    { width: 1152, height: 704 },
    { width: 1280, height: 800 },
    { width: 1216, height: 768 },
    { width: 1248, height: 832 },
    { width: 1216, height: 832 },
    { width: 1088, height: 768 },
    { width: 1152, height: 832 },
    { width: 1152, height: 864 },
    { width: 1088, height: 832 },
    { width: 1152, height: 896 },
    { width: 1120, height: 896 },
    { width: 1024, height: 832 },
    { width: 1088, height: 896 },
    { width: 960, height: 832 },
    { width: 1024, height: 896 },
    { width: 1088, height: 960 },
    { width: 960, height: 896 },
    { width: 1024, height: 960 },
    { width: 1024, height: 1024 },
    { width: 960, height: 1024 },
    { width: 896, height: 960 },
    { width: 960, height: 1088 },
    { width: 896, height: 1024 },
    { width: 832, height: 960 },
    { width: 896, height: 1088 },
    { width: 832, height: 1088 },
    { width: 864, height: 1152 },
    { width: 832, height: 1152 },
    { width: 768, height: 1088 },
    { width: 832, height: 1216 },
    { width: 832, height: 1248 },
    { width: 768, height: 1216 },
    { width: 800, height: 1280 },
    { width: 704, height: 1152 },
    { width: 768, height: 1280 },
    { width: 704, height: 1216 },
    { width: 768, height: 1344 },
    { width: 736, height: 1328 },
    { width: 704, height: 1280 },
    { width: 704, height: 1344 },
    { width: 704, height: 1408 },
    { width: 704, height: 1472 },
    { width: 640, height: 1334 },
    { width: 640, height: 1408 },
    { width: 640, height: 1472 },
    { width: 640, height: 1536 },
    { width: 576, height: 1408 },
    { width: 576, height: 1472 },
    { width: 576, height: 1536 },
    { width: 512, height: 1536 },
  ];

function buildDimensionCatalog(
  base: Array<{ width: number; height: number }>
): Array<{ width: number; height: number }> {
  const values: Array<{ width: number; height: number }> = [];
  const seen = new Set<string>();
  for (const dim of base) {
    const variants = [dim];
    if (dim.width !== dim.height) {
      variants.push({ width: dim.height, height: dim.width });
    }
    for (const variant of variants) {
      const key = `${variant.width}x${variant.height}`;
      if (!seen.has(key)) {
        seen.add(key);
        values.push(variant);
      }
    }
  }
  return values;
}

const IDEOGRAM_DIMENSIONS = buildDimensionCatalog(IDEOGRAM_BASE_DIMENSIONS);
const IDEOGRAM_REMIX_DIMENSIONS = buildDimensionCatalog(
  IDEOGRAM_REMIX_BASE_DIMENSIONS
);
const IDEOGRAM_DEFAULT_DIMENSION = IDEOGRAM_DIMENSIONS.find(
  (d) => d.width === 1024 && d.height === 1024
) || { width: 1024, height: 1024 };
const IDEOGRAM_REMIX_DEFAULT_DIMENSION = IDEOGRAM_REMIX_DIMENSIONS.find(
  (d) => d.width === 1024 && d.height === 1024
) || { width: 1024, height: 1024 };

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

function resolveRiverflowSize(
  width?: number | string,
  height?: number | string
): { width: number; height: number } {
  const parsedWidth = parseInt(String(width || ""), 10);
  const parsedHeight = parseInt(String(height || ""), 10);
  if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
    const match = RIVERFLOW_SIZES.find(
      (dim) => dim.width === parsedWidth && dim.height === parsedHeight
    );
    if (match) {
      return match;
    }
  }
  return RIVERFLOW_SIZES[0];
}

function resolveSeeddreamSize(
  width?: number | string,
  height?: number | string
): { width: number; height: number } {
  const parsedWidth = parseInt(String(width || ""), 10);
  const parsedHeight = parseInt(String(height || ""), 10);
  if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
    const match = SEEDDREAM_DIMENSIONS.find(
      (dim) => dim.width === parsedWidth && dim.height === parsedHeight
    );
    if (match) return match;
  }
  return SEEDDREAM_DIMENSIONS[0];
}

function resolveIdeogramSize(
  width?: number | string,
  height?: number | string
): { width: number; height: number } {
  const parsedWidth = parseInt(String(width || ""), 10);
  const parsedHeight = parseInt(String(height || ""), 10);
  if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
    const match = IDEOGRAM_DIMENSIONS.find(
      (dim) => dim.width === parsedWidth && dim.height === parsedHeight
    );
    if (match) return match;
  }
  return IDEOGRAM_DEFAULT_DIMENSION;
}

function resolveIdeogramRemixSize(
  width?: number | string,
  height?: number | string
): { width: number; height: number } {
  const parsedWidth = parseInt(String(width || ""), 10);
  const parsedHeight = parseInt(String(height || ""), 10);
  if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
    const match = IDEOGRAM_REMIX_DIMENSIONS.find(
      (dim) => dim.width === parsedWidth && dim.height === parsedHeight
    );
    if (match) return match;
  }
  return IDEOGRAM_REMIX_DEFAULT_DIMENSION;
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
        ideogramSettings,
        referenceImages,
        referenceImage,
        referenceImageUUID,
      } = req.body || {};

      // Basic validation
      const rawPrompt = typeof prompt === "string" ? prompt : "";
      const promptText = rawPrompt.trim();
      if (!promptText) {
        res.status(400).json({ success: false, error: "'prompt' is required" });
        return;
      }

      // Model normalization: map friendly aliases to known model IDs when possible
      const clientModel = (model && String(model)) || "";
      const normalizedModel = clientModel.trim().toLowerCase();
      let chosenModel = clientModel || "bfl:2@1"; // default to a stable FLUX variant
      if (/^flux[-_\s]*schnell$/i.test(clientModel)) {
        chosenModel = "bfl:2@1";
      } else if (
        normalizedModel === "seeddream" ||
        normalizedModel === "seeddream4" ||
        normalizedModel === "seeddream 4" ||
        normalizedModel === "seeddream 4.0"
      ) {
        chosenModel = SEEDDREAM_MODEL_ID;
      } else if (
        normalizedModel === "ideogram" ||
        normalizedModel === "ideogram 3" ||
        normalizedModel === "ideogram 3.0"
      ) {
        chosenModel = IDEOGRAM_MODEL_ID;
      } else if (
        normalizedModel === "ideogram remix" ||
        normalizedModel === "ideogram 3 remix" ||
        normalizedModel === "ideogram 3.0 remix" ||
        normalizedModel === "ideogram remix 3.0"
      ) {
        chosenModel = IDEOGRAM_REMIX_MODEL_ID;
      }
      if (clientModel === SEEDDREAM_MODEL_ID) {
        chosenModel = SEEDDREAM_MODEL_ID;
      }
      if (clientModel === IDEOGRAM_MODEL_ID) {
        chosenModel = IDEOGRAM_MODEL_ID;
      }
      if (clientModel === IDEOGRAM_REMIX_MODEL_ID) {
        chosenModel = IDEOGRAM_REMIX_MODEL_ID;
      }

      const isSeeddream = chosenModel === SEEDDREAM_MODEL_ID;
      const isIdeogram = chosenModel === IDEOGRAM_MODEL_ID;
      const isIdeogramRemix = chosenModel === IDEOGRAM_REMIX_MODEL_ID;
      const isIdeogramFamily = isIdeogram || isIdeogramRemix;
      const referenceImageInputs: string[] = [];
      if (Array.isArray(referenceImages))
        referenceImageInputs.push(...referenceImages);
      if (typeof referenceImage === "string")
        referenceImageInputs.push(referenceImage);
      if (typeof referenceImageUUID === "string")
        referenceImageInputs.push(referenceImageUUID);
      const ideogramReferenceImages = referenceImageInputs
        .map((val) => (typeof val === "string" ? val.trim() : ""))
        .filter(Boolean);
      const trimmedReferenceImages = ideogramReferenceImages.slice(0, 4);

      if (isIdeogramFamily && promptText.length > 2000) {
        res.status(400).json({
          success: false,
          error: "Ideogram prompt must be between 1 and 2000 characters.",
        });
        return;
      }

      if (isIdeogramRemix && trimmedReferenceImages.length === 0) {
        res.status(400).json({
          success: false,
          error:
            "Ideogram Remix requires a Runware reference image. Upload a reference image first.",
        });
        return;
      }

      const defaultDimension = isIdeogramRemix
        ? IDEOGRAM_REMIX_DEFAULT_DIMENSION
        : isIdeogram
        ? IDEOGRAM_DEFAULT_DIMENSION
        : { width: 768, height: 768 };
      const defaultSize = defaultDimension.width;
      const defaultHeight = defaultDimension.height;
      const parseDimension = (value: any) =>
        Number.parseInt(String(value ?? ""), 10);
      let resolvedWidth = parseDimension(width);
      let resolvedHeight = parseDimension(height);
      if (Number.isNaN(resolvedWidth)) resolvedWidth = defaultSize;
      if (Number.isNaN(resolvedHeight)) resolvedHeight = defaultHeight;
      if (isSeeddream) {
        const dims = resolveSeeddreamSize(width, height);
        resolvedWidth = dims.width;
        resolvedHeight = dims.height;
      } else if (isIdeogram) {
        const dims = resolveIdeogramSize(width, height);
        resolvedWidth = dims.width;
        resolvedHeight = dims.height;
      } else if (isIdeogramRemix) {
        const dims = resolveIdeogramRemixSize(width, height);
        resolvedWidth = dims.width;
        resolvedHeight = dims.height;
      }

      const maxResultsPerRequest = isSeeddream ? 15 : isIdeogramFamily ? 2 : 4;
      const requestedResults = Math.min(
        Math.max(parseInt(numberResults) || 1, 1),
        maxResultsPerRequest
      );
      const seeddreamSequentialResults = isSeeddream
        ? requestedResults
        : undefined;
      const providerSettings: Record<string, any> = {};
      const allowsSeedImage = !isIdeogramFamily;

      if (isSeeddream && seeddreamSequentialResults) {
        providerSettings.bytedance = {
          maxSequentialImages: seeddreamSequentialResults,
        };
      }

      if (isIdeogramFamily) {
        const ideogramConfig =
          ideogramSettings && typeof ideogramSettings === "object"
            ? ideogramSettings
            : {};
        const renderingSpeed = String(
          ideogramConfig.renderingSpeed || "QUALITY"
        )
          .toUpperCase()
          .includes("SPEED")
          ? "SPEED"
          : "QUALITY";
        const magicPromptRaw =
          typeof ideogramConfig.magicPrompt === "string"
            ? ideogramConfig.magicPrompt.trim().toUpperCase()
            : "ON";
        const magicPrompt =
          magicPromptRaw === "OFF"
            ? "OFF"
            : magicPromptRaw === "AUTO"
            ? "AUTO"
            : "ON";
        const styleType =
          typeof ideogramConfig.styleType === "string"
            ? ideogramConfig.styleType.trim()
            : undefined;
        const stylePreset =
          typeof ideogramConfig.stylePreset === "string"
            ? ideogramConfig.stylePreset.trim()
            : undefined;
        const styleCode =
          typeof ideogramConfig.styleCode === "string"
            ? ideogramConfig.styleCode.trim()
            : undefined;
        const providerPayload: Record<string, any> = {
          renderingSpeed,
          magicPrompt,
        };
        if (styleType) providerPayload.styleType = styleType;
        if (stylePreset) providerPayload.stylePreset = stylePreset;
        if (styleCode) providerPayload.styleCode = styleCode;
        if (isIdeogramRemix) {
          const remixStrengthRaw = Number.parseInt(
            String(ideogramConfig.remixStrength ?? ""),
            10
          );
          if (!Number.isNaN(remixStrengthRaw)) {
            providerPayload.remixStrength = Math.min(
              Math.max(remixStrengthRaw, 0),
              100
            );
          }
        }
        if (
          Array.isArray(ideogramConfig.styleReferenceImages) &&
          ideogramConfig.styleReferenceImages.length
        ) {
          providerPayload.styleReferenceImages =
            ideogramConfig.styleReferenceImages
              .filter((val: any) => typeof val === "string" && val.trim())
              .slice(0, 4)
              .map((val: string) => val.trim());
        }
        providerSettings.ideogram = providerPayload;
      }

      const task: any = {
        taskType: "imageInference",
        taskUUID: randomUUID(),
        outputType: "URL",
        positivePrompt: promptText,
        model: chosenModel,
        numberResults: isSeeddream ? 1 : requestedResults,
        width: resolvedWidth,
        height: resolvedHeight,
      };
      if (isIdeogramRemix && trimmedReferenceImages.length) {
        task.referenceImages = trimmedReferenceImages;
      }
      if (Object.keys(providerSettings).length > 0) {
        task.providerSettings = providerSettings;
      }
      if (negativePrompt && typeof negativePrompt === "string") {
        task.negativePrompt = negativePrompt;
      }
      if (allowsSeedImage && seedImage && typeof seedImage === "string") {
        task.seedImage = seedImage; // UUID, URL, base64, or data URI supported by Runware
      }
      if (steps) task.steps = Math.min(Math.max(parseInt(steps) || 15, 1), 100);
      else task.steps = 15;
      if (cfgScale)
        task.CFGScale = Math.min(Math.max(parseFloat(cfgScale) || 7, 0), 50);

      const payload = [task];
      let response;
      try {
        response = await postRunwareWithRetry(payload, 180_000, 1);
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
            if (isSeeddream) {
              const fallbackDims = SEEDDREAM_DIMENSIONS[0];
              smaller.width = fallbackDims.width;
              smaller.height = fallbackDims.height;
            } else if (isIdeogram) {
              smaller.width = IDEOGRAM_DEFAULT_DIMENSION.width;
              smaller.height = IDEOGRAM_DEFAULT_DIMENSION.height;
            } else if (isIdeogramRemix) {
              smaller.width = IDEOGRAM_REMIX_DEFAULT_DIMENSION.width;
              smaller.height = IDEOGRAM_REMIX_DEFAULT_DIMENSION.height;
            } else {
              smaller.width = Math.min(640, task.width || defaultSize);
              smaller.height = Math.min(640, task.height || defaultSize);
            }
            smaller.steps = Math.min(12, task.steps || 12);
            const fallbackPayload = [smaller];
            response = await postRunwareWithRetry(fallbackPayload, 180_000, 0);
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

// POST /api/runware/riverflow/edit
// JSON body: { prompt: string, references: string[], width?: number, height?: number, negativePrompt?: string, numberResults?: number, feature?: string }
router.post(
  "/runware/riverflow/edit",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        prompt,
        references,
        width,
        height,
        negativePrompt,
        numberResults,
        feature,
      } = req.body || {};

      if (!prompt || typeof prompt !== "string") {
        res.status(400).json({ success: false, error: "'prompt' is required" });
        return;
      }

      const refs = Array.isArray(references)
        ? references
            .map((ref) => (typeof ref === "string" ? ref.trim() : ""))
            .filter(Boolean)
        : [];
      if (!refs.length) {
        res.status(400).json({
          success: false,
          error: "'references' must be an array with at least one image UUID",
        });
        return;
      }
      const limitedRefs = refs.slice(0, 10);

      const { width: resolvedWidth, height: resolvedHeight } =
        resolveRiverflowSize(width, height);

      const task: any = {
        taskType: "imageInference",
        taskUUID: randomUUID(),
        model: RIVERFLOW_MODEL_ID,
        outputType: "URL",
        positivePrompt: prompt,
        width: resolvedWidth,
        height: resolvedHeight,
        numberResults: Math.min(Math.max(parseInt(numberResults) || 1, 1), 4),
        inputs: { references: limitedRefs },
      };
      if (negativePrompt && typeof negativePrompt === "string") {
        task.negativePrompt = negativePrompt;
      }

      const payload = [task];
      const response = await postRunwareWithRetry(payload, 180_000, 1);

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

      try {
        await prisma.generated_Photo.create({
          data: {
            feature: String(feature || "riverflow-edit"),
            url: imageURL,
          },
        });
      } catch (e) {
        console.warn(
          "Failed to persist Riverflow Generated_Photo:",
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
      console.error("Runware riverflow-edit error:", msg);
      res.status(500).json({
        success: false,
        error: msg || "Riverflow edit failed",
      });
      return;
    }
  }
);

export default router;
