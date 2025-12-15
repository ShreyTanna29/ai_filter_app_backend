"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const apiKey_1 = require("../middleware/apiKey");
const s3_1 = require("../lib/s3");
const signedUrl_1 = require("../middleware/signedUrl");
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const crypto_1 = require("crypto");
dotenv_1.default.config();
// Legacy Cloudinary configuration removed. All generated videos now stored in S3.
const router = (0, express_1.Router)();
// --- Helper serialization utilities to avoid circular JSON issues in error responses ---
const safeJson = (value, depth = 3) => {
    var _a, _b, _c, _d, _e;
    if (value === null || value === undefined)
        return value;
    if (depth <= 0)
        return typeof value;
    if (Array.isArray(value))
        return value.slice(0, 10).map((v) => safeJson(v, depth - 1));
    if (typeof value === "object") {
        // Axios error formatting
        if (value.isAxiosError) {
            const ax = value;
            return {
                isAxiosError: true,
                message: ax.message,
                code: ax.code,
                status: (_a = ax.response) === null || _a === void 0 ? void 0 : _a.status,
                statusText: (_b = ax.response) === null || _b === void 0 ? void 0 : _b.statusText,
                data: safeJson((_c = ax.response) === null || _c === void 0 ? void 0 : _c.data, depth - 1),
                url: (_d = ax.config) === null || _d === void 0 ? void 0 : _d.url,
                method: (_e = ax.config) === null || _e === void 0 ? void 0 : _e.method,
            };
        }
        const out = {};
        let count = 0;
        for (const k of Object.keys(value)) {
            if (count++ > 20) {
                out.__truncated = true;
                break;
            }
            try {
                const v = value[k];
                if (v === value)
                    continue; // circular self
                if (typeof v === "function")
                    continue;
                if (k.startsWith("_"))
                    continue; // skip internal/private heavy props
                out[k] = safeJson(v, depth - 1);
            }
            catch (_f) {
                out[k] = "[unserializable]";
            }
        }
        return out;
    }
    return value;
};
const serializeError = (err) => {
    if (!err)
        return undefined;
    if (typeof err === "string")
        return err;
    if (err instanceof Error) {
        return {
            message: err.message,
            name: err.name,
            code: err.code,
        };
    }
    return safeJson(err);
};
// Extract structured Runware error details for UI surfacing
function extractRunwareError(raw) {
    try {
        const body = typeof raw === "string" ? JSON.parse(raw) : raw;
        const firstErr = Array.isArray(body === null || body === void 0 ? void 0 : body.errors) ? body.errors[0] : undefined;
        if (!firstErr)
            return undefined;
        return {
            code: firstErr.code,
            message: firstErr.message,
            responseContent: firstErr.responseContent,
            documentation: firstErr.documentation,
            taskUUID: firstErr.taskUUID,
            taskType: firstErr.taskType,
        };
    }
    catch (_a) {
        return undefined;
    }
}
// Extract Eachlabs/Pixverse error message from axios error response
// Handles nested JSON in details field like: 'API request failed with status 422: {"message":"Fix these fields..."}'
function extractEachlabsErrorMessage(err) {
    var _a;
    try {
        const responseData = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data;
        if (!responseData) {
            return (err === null || err === void 0 ? void 0 : err.message) || "Unknown error";
        }
        // Try to extract from details field which may contain embedded JSON
        const details = responseData.details;
        if (typeof details === "string") {
            // Try to parse embedded JSON from the details string
            const jsonMatch = details.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    // Return the most user-friendly message
                    if (parsed.message)
                        return parsed.message;
                    if (parsed.detail)
                        return parsed.detail;
                    if (parsed.title)
                        return parsed.title;
                }
                catch (_b) {
                    // If JSON parsing fails, return the raw details
                    return details;
                }
            }
            return details;
        }
        // Fallback to other common error fields
        return (responseData.message ||
            responseData.error ||
            (err === null || err === void 0 ? void 0 : err.message) ||
            "Unknown error");
    }
    catch (_c) {
        return (err === null || err === void 0 ? void 0 : err.message) || "Unknown error";
    }
}
const pickPositiveNumber = (...values) => {
    for (const value of values) {
        const num = Number(value);
        if (Number.isFinite(num) && num > 0)
            return num;
    }
    return undefined;
};
const extractRunwareImageMeta = (obj) => {
    var _a, _b, _c, _d, _e, _f;
    if (!obj)
        return {};
    return {
        uuid: obj.imageUUID || obj.imageUuid || obj.uuid,
        width: pickPositiveNumber(obj.width, obj.imageWidth, (_a = obj.meta) === null || _a === void 0 ? void 0 : _a.width, (_b = obj.metadata) === null || _b === void 0 ? void 0 : _b.width, (_c = obj.dimensions) === null || _c === void 0 ? void 0 : _c.width),
        height: pickPositiveNumber(obj.height, obj.imageHeight, (_d = obj.meta) === null || _d === void 0 ? void 0 : _d.height, (_e = obj.metadata) === null || _e === void 0 ? void 0 : _e.height, (_f = obj.dimensions) === null || _f === void 0 ? void 0 : _f.height),
    };
};
const buildRunwareErrorPayload = (fallback, raw) => {
    const providerError = extractRunwareError(raw);
    const message = (providerError === null || providerError === void 0 ? void 0 : providerError.responseContent) || (providerError === null || providerError === void 0 ? void 0 : providerError.message) || fallback;
    const detailsSource = (providerError === null || providerError === void 0 ? void 0 : providerError.responseContent) ||
        (providerError === null || providerError === void 0 ? void 0 : providerError.message) ||
        (raw ? safeJson(raw) : fallback);
    return {
        message,
        providerError,
        details: detailsSource,
    };
};
const respondRunwareError = (res, status, fallback, rawDetails, extra) => {
    const { message, providerError, details } = buildRunwareErrorPayload(fallback, rawDetails);
    const body = Object.assign({ success: false, error: message, details }, extra);
    if (providerError)
        body.providerError = providerError;
    res.status(status).json(body);
};
// Helper: upload generated video stream to S3 and return signed + canonical URLs
function uploadGeneratedVideo(feature_1, variant_1, readable_1) {
    return __awaiter(this, arguments, void 0, function* (feature, variant, readable, videoType = "video") {
        const key = (0, s3_1.makeKey)({ type: "video", feature, ext: "mp4" });
        yield (0, s3_1.uploadStream)(key, readable, "video/mp4");
        const url = (0, s3_1.publicUrlFor)(key);
        let signedUrl = url;
        try {
            signedUrl = yield (0, signedUrl_1.signKey)(key);
        }
        catch (e) {
            // If signing fails, fall back to canonical (may be inaccessible if bucket is private)
            console.warn("[uploadGeneratedVideo] Failed to sign key", key, e);
        }
        // Save to appropriate table based on video type
        if (videoType === "cartoon") {
            yield prisma_1.default.generated_Cartoon_Video.create({ data: { feature, url } });
        }
        else {
            yield prisma_1.default.generatedVideo.create({ data: { feature, url } });
        }
        return { key, url, signedUrl };
    });
}
// Helper: ensure image is accessible via URL for provider (uploads to S3 if not clearly public)
function prepareImageForProvider(rawUrl, feature) {
    return __awaiter(this, void 0, void 0, function* () {
        const isLikelyPublic = /^https?:\/\//i.test(rawUrl) &&
            !/localhost|127\.0\.0\.1|^file:/i.test(rawUrl);
        // If already a public http(s) URL we can use directly (providers will fetch it)
        if (isLikelyPublic) {
            return { providerUrl: rawUrl, storedUrl: rawUrl };
        }
        // Otherwise fetch + resize + upload to S3 then return signed URL for provider
        try {
            const { buffer, contentType } = yield (0, s3_1.ensure512SquareImageFromUrl)(rawUrl);
            const key = (0, s3_1.makeKey)({ type: "image", feature, ext: "png" });
            yield (0, s3_1.uploadBuffer)(key, buffer, contentType);
            const storedUrl = (0, s3_1.publicUrlFor)(key);
            let providerUrl = storedUrl;
            try {
                providerUrl = yield (0, signedUrl_1.signKey)(key);
            }
            catch (e) {
                console.warn("[prepareImageForProvider] sign failed", e);
            }
            return { providerUrl, storedUrl };
        }
        catch (e) {
            console.error("[prepareImageForProvider] failed", e);
            // Fallback to raw URL (will likely fail at provider if not reachable)
            return { providerUrl: rawUrl, storedUrl: rawUrl };
        }
    });
}
function ensureImageDimensionsForProvider(sourceUrl, feature, width, height) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { buffer, contentType } = yield (0, s3_1.ensureImageSizeFromUrl)(sourceUrl, width, height);
            const key = (0, s3_1.makeKey)({ type: "image", feature, ext: "png" });
            yield (0, s3_1.uploadBuffer)(key, buffer, contentType);
            const storedUrl = (0, s3_1.publicUrlFor)(key);
            let providerUrl = storedUrl;
            try {
                providerUrl = yield (0, signedUrl_1.signKey)(key);
            }
            catch (e) {
                console.warn("[ensureImageDimensions] sign failed", e);
            }
            return { providerUrl, storedUrl };
        }
        catch (err) {
            console.error("[ensureImageDimensions] failed", err);
            return { providerUrl: sourceUrl, storedUrl: sourceUrl };
        }
    });
}
// Multer setup for audio upload (memory storage)
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Helper: Log API call for an app
function logAppApiCall(appId, endpoint, featureType, model, status, errorMessage, responseTime) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!appId)
            return; // Only log for app API calls, not admin
        try {
            yield prisma_1.default.appApiLog.create({
                data: {
                    appId,
                    endpoint,
                    featureType,
                    model: model || null,
                    status,
                    errorMessage: errorMessage || null,
                    responseTime: responseTime || null,
                },
            });
        }
        catch (e) {
            console.warn("[logAppApiCall] Failed to log API call:", e);
        }
    });
}
// Text-to-Video endpoint handler (no image required) - Supports Veo 3 and PixVerse v5
// MUST be registered BEFORE /:feature route to prevent route matching conflicts
const textToVideoHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const startTime = Date.now();
    const apiKeyOwner = req.apiKeyOwner;
    const appId = (apiKeyOwner === null || apiKeyOwner === void 0 ? void 0 : apiKeyOwner.type) === "app" ? (_a = apiKeyOwner.app) === null || _a === void 0 ? void 0 : _a.id : undefined;
    let userModel;
    try {
        const { prompt, model, negativePrompt } = req.body;
        // Validate prompt
        if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
            yield logAppApiCall(appId, "text-to-video", "video", undefined, "error", "Prompt is required for text-to-video", Date.now() - startTime);
            res.status(400).json({
                success: false,
                error: "Prompt is required for text-to-video generation",
            });
            return;
        }
        // Determine model - use from request body or default
        const userModelFromRequest = typeof model === "string" ? model.trim() : "";
        const finalModel = userModelFromRequest || "pixverse-v5-image-to-video";
        userModel = finalModel;
        console.log(`[Text-to-Video Model] Using model: ${finalModel}`);
        const rawModel = finalModel;
        const isVeo3 = /veo[\s-]*3(?!\s*fast)|google:3@0/i.test(rawModel);
        const isPixverseV5 = /pixverse[\s-]*v5/i.test(rawModel);
        const isKling25TurboPro = /kling-v?2\.5-turbo-pro(?!.*image)|klingai:6@1/i.test(rawModel);
        if (!isVeo3 && !isPixverseV5 && !isKling25TurboPro) {
            yield logAppApiCall(appId, "text-to-video", "video", userModel, "error", "Unsupported model for text-to-video", Date.now() - startTime);
            res.status(400).json({
                success: false,
                error: 'Only "veo 3" (google:3@0) and "pixverse v5" models are supported for text-to-video',
            });
            return;
        }
        // Google Veo 3 - Text-to-Video via Runware
        if (isVeo3) {
            try {
                console.log("[Veo3 T2V] Start generation", {
                    promptLength: prompt.length,
                });
                const runwareHeaders = {
                    Authorization: `Bearer ${process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY}`,
                    "Content-Type": "application/json",
                };
                const createdTaskUUID = (0, crypto_1.randomUUID)();
                // Duration: optional from request, default to 8
                const duration = req.body.duration !== undefined ? Number(req.body.duration) : 8;
                // Generate audio: optional from request, default to true
                const generateAudio = req.body.generateAudio !== undefined ? req.body.generateAudio : true;
                const task = {
                    taskType: "videoInference",
                    taskUUID: createdTaskUUID,
                    model: "google:3@0",
                    positivePrompt: prompt,
                    width: 1280,
                    height: 720,
                    duration: duration,
                    providerSettings: {
                        google: {
                            generateAudio: generateAudio,
                        },
                    },
                };
                if (negativePrompt && typeof negativePrompt === "string") {
                    task.negativePrompt = negativePrompt;
                }
                console.log("[Veo3 T2V] Created task", {
                    taskUUID: createdTaskUUID,
                });
                const createResp = yield axios_1.default.post("https://api.runware.ai/v1", [task], {
                    headers: runwareHeaders,
                    timeout: 180000,
                });
                const data = createResp.data;
                const ackItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
                    ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "videoInference") ||
                        data.data[0]
                    : data === null || data === void 0 ? void 0 : data.data;
                let videoUrl = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.videoURL) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.url) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.video) ||
                    (Array.isArray(ackItem === null || ackItem === void 0 ? void 0 : ackItem.videos) ? ackItem.videos[0] : null);
                let pollTaskUUID = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID) || createdTaskUUID;
                console.log("[Veo3 T2V] Ack response", {
                    ackTaskUUID: ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID,
                    createdTaskUUID,
                    chosenPollTaskUUID: pollTaskUUID,
                    immediateVideo: !!videoUrl,
                    status: (ackItem === null || ackItem === void 0 ? void 0 : ackItem.status) || (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskStatus),
                });
                if (!videoUrl && pollTaskUUID) {
                    const maxAttempts = 150;
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    let consecutive400 = 0;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        yield delay(3000);
                        const pollPayload = [
                            { taskType: "getResponse", taskUUID: pollTaskUUID },
                        ];
                        try {
                            const poll = yield axios_1.default.post("https://api.runware.ai/v1", pollPayload, { headers: runwareHeaders, timeout: 60000 });
                            const pd = poll.data;
                            const item = Array.isArray(pd === null || pd === void 0 ? void 0 : pd.data)
                                ? pd.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskUUID) === pollTaskUUID || (d === null || d === void 0 ? void 0 : d.videoURL)) || pd.data[0]
                                : pd === null || pd === void 0 ? void 0 : pd.data;
                            const status = (item === null || item === void 0 ? void 0 : item.status) || (item === null || item === void 0 ? void 0 : item.taskStatus);
                            if (status)
                                console.log("[Veo3 T2V] Poll status", {
                                    attempt,
                                    status,
                                });
                            if (status === "success" || (item === null || item === void 0 ? void 0 : item.videoURL) || (item === null || item === void 0 ? void 0 : item.url)) {
                                videoUrl =
                                    (item === null || item === void 0 ? void 0 : item.videoURL) ||
                                        (item === null || item === void 0 ? void 0 : item.url) ||
                                        (item === null || item === void 0 ? void 0 : item.video) ||
                                        (Array.isArray(item === null || item === void 0 ? void 0 : item.videos) ? item.videos[0] : null);
                                if (videoUrl)
                                    break;
                            }
                            if (status === "error" || status === "failed") {
                                respondRunwareError(res, 502, "Veo 3 text-to-video generation failed during polling", pd);
                                return;
                            }
                            consecutive400 = 0;
                        }
                        catch (e) {
                            const statusCode = (_b = e === null || e === void 0 ? void 0 : e.response) === null || _b === void 0 ? void 0 : _b.status;
                            if (statusCode === 400) {
                                consecutive400++;
                                if (consecutive400 >= 3) {
                                    respondRunwareError(res, 502, "Veo 3 polling failed with repeated 400 errors", ((_c = e === null || e === void 0 ? void 0 : e.response) === null || _c === void 0 ? void 0 : _c.data) || e);
                                    return;
                                }
                            }
                            else {
                                consecutive400 = 0;
                            }
                            console.log("[Veo3 T2V] Poll error (retrying)", {
                                attempt,
                                statusCode,
                            });
                        }
                    }
                }
                if (!videoUrl) {
                    res.status(502).json({
                        success: false,
                        error: "Veo 3 text-to-video timed out after polling",
                    });
                    return;
                }
                console.log("[Veo3 T2V] Video ready", { videoUrl });
                let veoStream;
                try {
                    veoStream = yield axios_1.default.get(videoUrl, {
                        responseType: "stream",
                        timeout: 180000,
                    });
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to download Veo 3 video",
                        details: serializeError(e),
                    });
                    return;
                }
                let uploaded;
                try {
                    uploaded = yield uploadGeneratedVideo("text-to-video", "veo3-t2v", veoStream.data);
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to upload Veo 3 video to S3",
                        details: serializeError(e),
                    });
                    return;
                }
                yield logAppApiCall(appId, "text-to-video", "video", userModel, "success", undefined, Date.now() - startTime);
                res.status(200).json({
                    success: true,
                    video: {
                        url: uploaded.signedUrl,
                        signedUrl: uploaded.signedUrl,
                        key: uploaded.key,
                    },
                    s3Key: uploaded.key,
                    provider: "Runware (Veo 3)",
                });
                return;
            }
            catch (err) {
                console.error("[Veo3 T2V] Fatal error:", ((_d = err === null || err === void 0 ? void 0 : err.response) === null || _d === void 0 ? void 0 : _d.data) || err);
                yield logAppApiCall(appId, "text-to-video", "video", userModel, "error", (err === null || err === void 0 ? void 0 : err.message) || "Veo 3 generation failed", Date.now() - startTime);
                res.status(500).json({
                    success: false,
                    error: "Veo 3 text-to-video generation failed",
                    details: serializeError(err),
                });
                return;
            }
        }
        // KlingAI 2.5 Turbo Pro - Text-to-Video via Runware
        if (isKling25TurboPro) {
            try {
                console.log("[Kling 2.5 Turbo Pro Text-to-Video] Start generation", {
                    prompt: prompt.slice(0, 100),
                });
                const runwareHeaders = {
                    Authorization: `Bearer ${process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY}`,
                    "Content-Type": "application/json",
                };
                const createdTaskUUID = (0, crypto_1.randomUUID)();
                // Duration: optional from request, default to 10
                const duration = req.body.duration !== undefined ? Number(req.body.duration) : 10;
                const task = {
                    taskType: "videoInference",
                    taskUUID: createdTaskUUID,
                    model: "klingai:6@1",
                    positivePrompt: prompt,
                    width: 1280,
                    height: 720,
                    duration: duration,
                };
                if (negativePrompt && typeof negativePrompt === "string") {
                    task.negativePrompt = negativePrompt;
                }
                console.log("[Kling 2.5 Turbo Pro Text-to-Video] Created task", {
                    taskUUID: createdTaskUUID,
                });
                console.log("[Kling 2.5 Turbo Pro Text-to-Video] Request payload:", JSON.stringify([task], null, 2));
                const createResp = yield axios_1.default.post("https://api.runware.ai/v1", [task], {
                    headers: runwareHeaders,
                });
                const data = createResp.data;
                const ackItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
                    ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "videoInference") ||
                        data.data[0]
                    : data === null || data === void 0 ? void 0 : data.data;
                let videoUrl = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.videoURL) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.url) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.video) ||
                    (Array.isArray(ackItem === null || ackItem === void 0 ? void 0 : ackItem.videos) ? ackItem.videos[0] : null);
                let pollTaskUUID = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID) || createdTaskUUID;
                console.log("[Kling 2.5 Turbo Pro Text-to-Video] Ack response", {
                    ackTaskUUID: ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID,
                    createdTaskUUID,
                    chosenPollTaskUUID: pollTaskUUID,
                    immediateVideo: !!videoUrl,
                    status: (ackItem === null || ackItem === void 0 ? void 0 : ackItem.status) || (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskStatus),
                });
                if (!videoUrl && pollTaskUUID) {
                    const maxAttempts = 150;
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    let consecutive400 = 0;
                    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                        yield delay(4000);
                        const pollPayload = [
                            { taskType: "getResponse", taskUUID: pollTaskUUID },
                        ];
                        console.log(`[Kling 2.5 Turbo Pro Text-to-Video] Poll attempt ${attempt} payload:`, JSON.stringify(pollPayload, null, 2));
                        try {
                            const statusResp = yield axios_1.default.post("https://api.runware.ai/v1", pollPayload, { headers: runwareHeaders, timeout: 60000 });
                            const pollData = statusResp.data;
                            const pollItem = Array.isArray(pollData === null || pollData === void 0 ? void 0 : pollData.data)
                                ? pollData.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskUUID) === pollTaskUUID)
                                : pollData === null || pollData === void 0 ? void 0 : pollData.data;
                            console.log(`[Kling 2.5 Turbo Pro Text-to-Video] Poll attempt ${attempt}:`, {
                                taskUUID: pollTaskUUID,
                                status: (pollItem === null || pollItem === void 0 ? void 0 : pollItem.status) || (pollItem === null || pollItem === void 0 ? void 0 : pollItem.taskStatus),
                                hasVideo: !!(pollItem === null || pollItem === void 0 ? void 0 : pollItem.videoURL),
                            });
                            videoUrl =
                                (pollItem === null || pollItem === void 0 ? void 0 : pollItem.videoURL) ||
                                    (pollItem === null || pollItem === void 0 ? void 0 : pollItem.url) ||
                                    (pollItem === null || pollItem === void 0 ? void 0 : pollItem.video) ||
                                    (Array.isArray(pollItem === null || pollItem === void 0 ? void 0 : pollItem.videos) ? pollItem.videos[0] : null);
                            if (videoUrl) {
                                console.log(`[Kling 2.5 Turbo Pro Text-to-Video] Video ready after ${attempt} polls`);
                                break;
                            }
                            const pollStatus = (pollItem === null || pollItem === void 0 ? void 0 : pollItem.status) || (pollItem === null || pollItem === void 0 ? void 0 : pollItem.taskStatus);
                            if (pollStatus &&
                                /failed|error/i.test(String(pollStatus).toLowerCase())) {
                                console.error("[Kling 2.5 Turbo Pro Text-to-Video] Task failed:", pollItem);
                                yield logAppApiCall(appId, "text-to-video", "video", userModel, "error", "Video generation failed", Date.now() - startTime);
                                return respondRunwareError(res, 500, "Video generation failed", pollItem);
                            }
                            consecutive400 = 0;
                        }
                        catch (pollErr) {
                            if (((_e = pollErr === null || pollErr === void 0 ? void 0 : pollErr.response) === null || _e === void 0 ? void 0 : _e.status) === 400) {
                                consecutive400++;
                                console.warn(`[Kling 2.5 Turbo Pro Text-to-Video] Poll 400 error (${consecutive400}/3):`, {
                                    error: serializeError(pollErr),
                                    responseData: (_f = pollErr === null || pollErr === void 0 ? void 0 : pollErr.response) === null || _f === void 0 ? void 0 : _f.data,
                                });
                                if (consecutive400 >= 3) {
                                    console.error("[Kling 2.5 Turbo Pro Text-to-Video] Too many 400s during polling");
                                    yield logAppApiCall(appId, "text-to-video", "video", userModel, "error", "Polling failed with repeated 400 errors", Date.now() - startTime);
                                    return respondRunwareError(res, 500, "Polling failed with repeated 400 errors", (_g = pollErr === null || pollErr === void 0 ? void 0 : pollErr.response) === null || _g === void 0 ? void 0 : _g.data);
                                }
                            }
                            else {
                                console.error("[Kling 2.5 Turbo Pro Text-to-Video] Poll error:", serializeError(pollErr));
                            }
                        }
                    }
                }
                if (!videoUrl) {
                    console.error("[Kling 2.5 Turbo Pro Text-to-Video] Missing videoURL after polling");
                    yield logAppApiCall(appId, "text-to-video", "video", userModel, "error", "Missing videoURL in response", Date.now() - startTime);
                    return respondRunwareError(res, 500, "Missing videoURL in Runware response");
                }
                console.log(`[Kling 2.5 Turbo Pro Text-to-Video] Video URL received: ${videoUrl.slice(0, 100)}`);
                const videoResponse = yield axios_1.default.get(videoUrl, {
                    responseType: "stream",
                    timeout: 180000,
                });
                const { key, url: s3Url, signedUrl, } = yield uploadGeneratedVideo("text-to-video-kling25turbo", "text-to-video", videoResponse.data);
                console.log(`[Kling 2.5 Turbo Pro Text-to-Video] Video uploaded to S3: ${key}`);
                yield logAppApiCall(appId, "text-to-video", "video", userModel, "success", undefined, Date.now() - startTime);
                res.json({
                    success: true,
                    videoUrl: signedUrl,
                    key,
                    taskUUID: createdTaskUUID,
                    model: "klingai:6@1",
                });
                return;
            }
            catch (error) {
                console.error("[Kling 2.5 Turbo Pro Text-to-Video] Error:", serializeError(error));
                const errorMessage = ((_j = (_h = error === null || error === void 0 ? void 0 : error.response) === null || _h === void 0 ? void 0 : _h.data) === null || _j === void 0 ? void 0 : _j.message) || (error === null || error === void 0 ? void 0 : error.message) || "Unknown error";
                yield logAppApiCall(appId, "text-to-video", "video", userModel, "error", errorMessage, Date.now() - startTime);
                if ((_k = error === null || error === void 0 ? void 0 : error.response) === null || _k === void 0 ? void 0 : _k.data) {
                    return respondRunwareError(res, error.response.status || 500, "Kling 2.5 Turbo Pro text-to-video generation failed", error.response.data);
                }
                res.status(500).json({
                    success: false,
                    error: "Kling 2.5 Turbo Pro text-to-video generation failed",
                    details: errorMessage,
                });
                return;
            }
        }
        // PixVerse v5 - Text-to-Video via Runware
        if (isPixverseV5) {
            try {
                console.log("[PixVerse v5 T2V] Start generation", {
                    promptLength: prompt.length,
                });
                const runwareHeaders = {
                    Authorization: `Bearer ${process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY}`,
                    "Content-Type": "application/json",
                };
                const createdTaskUUID = (0, crypto_1.randomUUID)();
                // Duration: optional from request, fallback to env, then default
                const duration = req.body.duration !== undefined
                    ? Number(req.body.duration)
                    : process.env.PIXVERSE_V5_DURATION
                        ? Number(process.env.PIXVERSE_V5_DURATION)
                        : 5;
                const resolutionMap = {
                    "360p": { width: 640, height: 360 },
                    "540p": { width: 960, height: 540 },
                    "720p": { width: 1280, height: 720 },
                    "1080p": { width: 1920, height: 1080 },
                };
                // Resolution: optional from request, fallback to env, then default
                const resolution = req.body.resolution || process.env.PIXVERSE_V5_RESOLUTION || "720p";
                const dimensions = resolutionMap[resolution] || resolutionMap["720p"];
                const task = {
                    taskType: "videoInference",
                    taskUUID: createdTaskUUID,
                    model: "pixverse:1@5",
                    positivePrompt: prompt,
                    width: dimensions.width,
                    height: dimensions.height,
                    duration: [5, 8].includes(duration) ? duration : 5,
                };
                const pixverseSettings = {};
                if (req.body.cameraMovement ||
                    process.env.PIXVERSE_V5_CAMERA_MOVEMENT) {
                    pixverseSettings.cameraMovement =
                        req.body.cameraMovement || process.env.PIXVERSE_V5_CAMERA_MOVEMENT;
                }
                if (req.body.style || process.env.PIXVERSE_V5_STYLE) {
                    pixverseSettings.style =
                        req.body.style || process.env.PIXVERSE_V5_STYLE;
                }
                if (req.body.motionMode || process.env.PIXVERSE_V5_MOTION_MODE) {
                    pixverseSettings.motionMode =
                        req.body.motionMode || process.env.PIXVERSE_V5_MOTION_MODE;
                }
                if (Object.keys(pixverseSettings).length > 0) {
                    task.providerSettings = { pixverse: pixverseSettings };
                }
                if (negativePrompt && typeof negativePrompt === "string") {
                    task.negativePrompt = negativePrompt;
                }
                console.log("[PixVerse v5 T2V] Created task", {
                    taskUUID: createdTaskUUID,
                    duration: task.duration,
                    resolution: `${dimensions.width}x${dimensions.height}`,
                    providerSettings: task.providerSettings,
                });
                const createResp = yield axios_1.default.post("https://api.runware.ai/v1", [task], {
                    headers: runwareHeaders,
                    timeout: 180000,
                });
                const data = createResp.data;
                const ackItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
                    ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "videoInference") ||
                        data.data[0]
                    : data === null || data === void 0 ? void 0 : data.data;
                let videoUrl = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.videoURL) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.url) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.video) ||
                    (Array.isArray(ackItem === null || ackItem === void 0 ? void 0 : ackItem.videos) ? ackItem.videos[0] : null);
                let pollTaskUUID = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID) || createdTaskUUID;
                console.log("[PixVerse v5 T2V] Ack response", {
                    ackTaskUUID: ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID,
                    createdTaskUUID,
                    chosenPollTaskUUID: pollTaskUUID,
                    immediateVideo: !!videoUrl,
                    status: (ackItem === null || ackItem === void 0 ? void 0 : ackItem.status) || (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskStatus),
                });
                if (!videoUrl && pollTaskUUID) {
                    const maxAttempts = 100;
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    let consecutive400 = 0;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        yield delay(5000);
                        const pollPayload = [
                            { taskType: "getResponse", taskUUID: pollTaskUUID },
                        ];
                        try {
                            const poll = yield axios_1.default.post("https://api.runware.ai/v1", pollPayload, { headers: runwareHeaders, timeout: 60000 });
                            const pd = poll.data;
                            const item = Array.isArray(pd === null || pd === void 0 ? void 0 : pd.data)
                                ? pd.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskUUID) === pollTaskUUID || (d === null || d === void 0 ? void 0 : d.videoURL)) || pd.data[0]
                                : pd === null || pd === void 0 ? void 0 : pd.data;
                            const status = (item === null || item === void 0 ? void 0 : item.status) || (item === null || item === void 0 ? void 0 : item.taskStatus);
                            if (status)
                                console.log("[PixVerse v5 T2V] Poll status", {
                                    attempt,
                                    status,
                                });
                            if (status === "success" || (item === null || item === void 0 ? void 0 : item.videoURL) || (item === null || item === void 0 ? void 0 : item.url)) {
                                videoUrl =
                                    (item === null || item === void 0 ? void 0 : item.videoURL) ||
                                        (item === null || item === void 0 ? void 0 : item.url) ||
                                        (item === null || item === void 0 ? void 0 : item.video) ||
                                        (Array.isArray(item === null || item === void 0 ? void 0 : item.videos) ? item.videos[0] : null);
                                if (videoUrl)
                                    break;
                            }
                            if (status === "error" || status === "failed") {
                                respondRunwareError(res, 502, "PixVerse v5 text-to-video generation failed during polling", pd);
                                return;
                            }
                            consecutive400 = 0;
                        }
                        catch (e) {
                            const statusCode = (_l = e === null || e === void 0 ? void 0 : e.response) === null || _l === void 0 ? void 0 : _l.status;
                            if (statusCode === 400) {
                                consecutive400++;
                                if (consecutive400 >= 3) {
                                    respondRunwareError(res, 502, "PixVerse v5 polling failed with repeated 400 errors", ((_m = e === null || e === void 0 ? void 0 : e.response) === null || _m === void 0 ? void 0 : _m.data) || e);
                                    return;
                                }
                            }
                            else {
                                consecutive400 = 0;
                            }
                            console.log("[PixVerse v5 T2V] Poll error (retrying)", {
                                attempt,
                                statusCode,
                            });
                        }
                    }
                }
                if (!videoUrl) {
                    res.status(502).json({
                        success: false,
                        error: "PixVerse v5 text-to-video timed out after polling",
                    });
                    return;
                }
                console.log("[PixVerse v5 T2V] Video ready", { videoUrl });
                let pixStream;
                try {
                    console.log("[PixVerse v5 T2V] Downloading video from:", videoUrl);
                    pixStream = yield axios_1.default.get(videoUrl, {
                        responseType: "stream",
                        timeout: 180000,
                    });
                    console.log("[PixVerse v5 T2V] Download successful, starting S3 upload");
                }
                catch (e) {
                    console.error("[PixVerse v5 T2V] Download error:", serializeError(e));
                    res.status(500).json({
                        success: false,
                        error: "Failed to download PixVerse v5 video",
                        details: serializeError(e),
                    });
                    return;
                }
                let uploaded;
                try {
                    uploaded = yield uploadGeneratedVideo("text-to-video", "pixverse-v5-t2v", pixStream.data);
                    console.log("[PixVerse v5 T2V] S3 upload successful:", uploaded.key);
                }
                catch (e) {
                    console.error("[PixVerse v5 T2V] S3 upload error:", serializeError(e));
                    res.status(500).json({
                        success: false,
                        error: "Failed to upload PixVerse v5 video to S3",
                        details: serializeError(e),
                    });
                    return;
                }
                yield logAppApiCall(appId, "text-to-video", "video", userModel, "success", undefined, Date.now() - startTime);
                res.status(200).json({
                    success: true,
                    video: {
                        url: uploaded.signedUrl,
                        signedUrl: uploaded.signedUrl,
                        key: uploaded.key,
                    },
                    s3Key: uploaded.key,
                    provider: "Runware (PixVerse v5)",
                });
                return;
            }
            catch (err) {
                console.error("[PixVerse v5 T2V] Fatal error:", ((_o = err === null || err === void 0 ? void 0 : err.response) === null || _o === void 0 ? void 0 : _o.data) || err);
                yield logAppApiCall(appId, "text-to-video", "video", userModel, "error", (err === null || err === void 0 ? void 0 : err.message) || "PixVerse v5 generation failed", Date.now() - startTime);
                res.status(500).json({
                    success: false,
                    error: "PixVerse v5 text-to-video generation failed",
                    details: serializeError(err),
                });
                return;
            }
        }
    }
    catch (error) {
        console.error("Error in text-to-video:", serializeError(error));
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        yield logAppApiCall(appId, "text-to-video", "video", userModel, "error", errorMessage, Date.now() - startTime);
        res.status(500).json({
            success: false,
            error: "Failed to generate text-to-video",
            details: errorMessage,
        });
    }
});
// Register text-to-video route BEFORE /:feature to prevent matching conflicts
router.post("/text-to-video", apiKey_1.requireApiKey, textToVideoHandler);
// Generate video from feature endpoint
router.post("/:feature", apiKey_1.requireApiKey, upload.single("audio_file"), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42, _43, _44, _45, _46, _47, _48, _49, _50, _51, _52, _53, _54, _55, _56, _57, _58, _59, _60, _61, _62, _63, _64, _65, _66, _67, _68, _69, _70, _71, _72, _73, _74, _75, _76, _77, _78, _79, _80, _81, _82, _83, _84, _85, _86, _87, _88, _89, _90, _91, _92, _93, _94, _95, _96, _97, _98, _99, _100, _101, _102, _103, _104, _105, _106, _107, _108, _109, _110, _111, _112, _113, _114, _115;
    const startTime = Date.now();
    const { feature } = req.params;
    const apiKeyOwner = req.apiKeyOwner;
    const appId = (apiKeyOwner === null || apiKeyOwner === void 0 ? void 0 : apiKeyOwner.type) === "app" ? (_a = apiKeyOwner.app) === null || _a === void 0 ? void 0 : _a.id : undefined;
    // Check if this is a cartoon character video generation
    const videoType = req.query.type === "cartoon" ? "cartoon" : "video";
    let userModel;
    try {
        const promptOverride = req.body.prompt;
        const imageUrl = req.body.imageUrl || req.body.image_url;
        if (!imageUrl) {
            yield logAppApiCall(appId, feature, videoType, undefined, "error", "Image URL is required", Date.now() - startTime);
            res.status(400).json({
                success: false,
                error: "Image URL is required",
            });
            return;
        }
        // Step 1: Get the feature from DB (for prompt and model fallback)
        // Check both Features and Cartoon_Characters tables based on videoType
        let featureObj = null;
        if (videoType === "cartoon") {
            featureObj = yield prisma_1.default.cartoon_Characters.findUnique({
                where: { endpoint: feature },
            });
        }
        else {
            featureObj = yield prisma_1.default.features.findUnique({
                where: { endpoint: feature },
            });
        }
        // Check if app has permission to use this feature endpoint
        if ((apiKeyOwner === null || apiKeyOwner === void 0 ? void 0 : apiKeyOwner.type) === "app" && apiKeyOwner.app) {
            const permAppId = apiKeyOwner.app.id;
            let hasPermission = false;
            if (videoType === "cartoon") {
                // Check if the cartoon character is allowed for this app
                if (featureObj) {
                    const allowed = yield prisma_1.default.appCartoonCharacter.findFirst({
                        where: { appId: permAppId, cartoonCharacterId: featureObj.id },
                    });
                    hasPermission = !!allowed;
                }
            }
            else {
                // Check if the feature is allowed for this app
                if (featureObj) {
                    const allowed = yield prisma_1.default.appFeature.findFirst({
                        where: { appId: permAppId, featureId: featureObj.id },
                    });
                    hasPermission = !!allowed;
                }
            }
            if (!hasPermission) {
                const errorMsg = `This app does not have permission to use the "${feature}" ${videoType === "cartoon" ? "cartoon character" : "feature"}`;
                yield logAppApiCall(appId, feature, videoType, undefined, "error", errorMsg, Date.now() - startTime);
                res.status(403).json({
                    success: false,
                    error: errorMsg,
                });
                return;
            }
        }
        // Determine the model: use request body if provided, otherwise fall back to DB, then to default
        const userModelFromRequest = typeof req.body.model === "string" ? req.body.model.trim() : "";
        const modelFromDb = (featureObj === null || featureObj === void 0 ? void 0 : featureObj.model) || "";
        const finalModel = userModelFromRequest || modelFromDb || "pixverse-v5-image-to-video";
        userModel = finalModel; // Now guaranteed to be a string
        // Model will always have a value now (either from request, DB, or default)
        console.log(`[Model Selection] Using model: ${finalModel} for feature: ${feature}`);
        // If model provided in request, update it in the Features table
        if (userModelFromRequest && featureObj && videoType === "video") {
            try {
                yield prisma_1.default.features.update({
                    where: { id: featureObj.id },
                    data: { model: userModelFromRequest },
                });
                console.log(`[Model Update] Updated feature "${feature}" model to: ${userModelFromRequest}`);
            }
            catch (e) {
                console.warn(`[Model Update] Failed to update model for feature "${feature}":`, e);
            }
        }
        // Step 2: Prepare image for provider (S3 private bucket migration)
        const { providerUrl: imageCloudUrl } = yield prepareImageForProvider(imageUrl, feature);
        // Optional: second image for transition models (Pixverse) - treat similarly
        const lastFrameRaw = req.body.lastFrameUrl || req.body.last_frame_url;
        let lastFrameCloudUrl = undefined;
        if (lastFrameRaw) {
            try {
                const prep = yield prepareImageForProvider(lastFrameRaw, feature);
                lastFrameCloudUrl = prep.providerUrl;
            }
            catch (e) {
                console.warn("[lastFrame] prepare failed; ignoring", e);
            }
        }
        // Step 3: Determine the prompt (allow client override, else use DB)
        const prompt = typeof promptOverride === "string" && promptOverride.trim().length > 0
            ? promptOverride
            : featureObj
                ? featureObj.prompt
                : "";
        // Step 4: Provider branching (Pixverse transition, then MiniMax, else Luma)
        const rawModel = finalModel; // Use the guaranteed string value
        const isPixverseTransition = /pixverse-v4-transition/i.test(rawModel);
        // Support v4, v4.5 and v5 image to video variants
        const isPixverseImage2Video = /pixverse-v4(?:\.5)?-image-to-video|pixverse-v5-image-to-video|kling-v1-pro-image-to-video|kling-v1-standard-image-to-video|kling-1\.5-pro-image-to-video|kling-v1\.6-pro-image-to-video|kling-1\.6-standard-image-to-video|kling-v2-master-image-to-video|kling-v2\.1-standard-image-to-video|kling-v2\.1-pro-image-to-video|kling-v?2\.5-turbo-pro-image-to-video|kling-2\.5-turbo-pro|klingai:6@1/i.test(rawModel);
        // Runware Veo 3 Fast (native audio) direct support
        const isRunwareVeo3Fast = /veo3@fast/i.test(rawModel);
        const isRunwareVeo31Fast = /veo\s*3\.1.*fast|google:3@3/i.test(rawModel);
        const isRunwareVeo31 = /veo\s*3\.1(?!.*fast)|google:3@2/i.test(rawModel);
        const isRunwareSeedanceProFast = /seedance[\s-]*1\.0[\s-]*pro[\s-]*fast|seedance[\s-]*pro[\s-]*fast|bytedance:2@2/i.test(rawModel);
        const isRunwareLTX2Pro = /ltx[\s-]*2.*pro|lightricks:2@0/i.test(rawModel);
        const isRunwareLTX2Fast = /ltx[\s-]*2.*fast|lightricks:2@1/i.test(rawModel);
        const isRunwareViduQ2Turbo = /vidu[\s-]*q?2.*turbo|vidu:3@2/i.test(rawModel);
        const isRunwareViduQ2Pro = /vidu[\s-]*q?2.*pro|vidu:3@1/i.test(rawModel);
        const isRunwayGen4Turbo = /runway.*gen[\s-]*4.*turbo|runway:1@1/i.test(rawModel);
        const isRunwareSora2 = /sora[\s-]*2|openai:3@1/i.test(rawModel);
        const isRunwareSora2Pro = /sora[\s-]*2.*pro|openai:3@2/i.test(rawModel);
        const isRunwareHailuo23Fast = /hailuo[\s-]*2\.?3.*fast|minimax:4@2/i.test(rawModel);
        const isRunwareHailuo23 = /hailuo[\s-]*2\.?3(?!.*fast)|minimax:4@1/i.test(rawModel);
        const isRunwareControlNetXL = /controlnet[\s-]*xl[\s-]*video|civitai:136070@267493/i.test(rawModel);
        const isRunwareClaymotionF1 = /claymotion[\s-]*f1|civitai:855822@957548/i.test(rawModel);
        const isLumaModel = /(^|\s)(ray|luma)(?=\b)/i.test(rawModel) ||
            /dream\s*machine/i.test(rawModel) ||
            /ray[\s-]*1\.6/i.test(rawModel) ||
            /ray[\s-]*2/i.test(rawModel) ||
            /ray.*flash/i.test(rawModel);
        if (isRunwareSeedanceProFast) {
            try {
                console.log("[Seedance] Start generation", {
                    feature,
                    rawModel,
                    imageCloudUrlInitial: imageCloudUrl === null || imageCloudUrl === void 0 ? void 0 : imageCloudUrl.slice(0, 120),
                });
                const runwareHeaders = {
                    Authorization: `Bearer ${process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY}`,
                    "Content-Type": "application/json",
                };
                // 1) Upload first frame image to get imageUUID
                const uploadPayload = [
                    {
                        taskType: "imageUpload",
                        taskUUID: (0, crypto_1.randomUUID)(),
                        image: imageCloudUrl,
                    },
                ];
                let firstUUID;
                try {
                    const up = yield axios_1.default.post("https://api.runware.ai/v1", uploadPayload, { headers: runwareHeaders, timeout: 180000 });
                    const d = up.data;
                    const obj = Array.isArray(d === null || d === void 0 ? void 0 : d.data) ? d.data[0] : d === null || d === void 0 ? void 0 : d.data;
                    firstUUID = (obj === null || obj === void 0 ? void 0 : obj.imageUUID) || (obj === null || obj === void 0 ? void 0 : obj.imageUuid);
                    console.log("[Seedance] imageUpload success", { firstUUID });
                }
                catch (e) {
                    console.error("Runware Seedance imageUpload failed:", ((_b = e === null || e === void 0 ? void 0 : e.response) === null || _b === void 0 ? void 0 : _b.data) || (e === null || e === void 0 ? void 0 : e.message) || e);
                    respondRunwareError(res, 400, "Failed to upload image to Runware (Seedance)", ((_c = e === null || e === void 0 ? void 0 : e.response) === null || _c === void 0 ? void 0 : _c.data) || e);
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
                // Optional parameters from request, fallback to defaults
                const duration = req.body.duration !== undefined ? Number(req.body.duration) : 5;
                const cameraFixed = req.body.cameraFixed !== undefined
                    ? Boolean(req.body.cameraFixed)
                    : false;
                const taskUUIDCreated = (0, crypto_1.randomUUID)();
                const task = {
                    taskType: "videoInference",
                    taskUUID: taskUUIDCreated,
                    model: "bytedance:2@2",
                    positivePrompt: prompt || "",
                    width: 864,
                    height: 480,
                    duration,
                    deliveryMethod: "async",
                    frameImages: [{ inputImage: firstUUID, frame: "first" }],
                    providerSettings: { bytedance: { cameraFixed } },
                };
                console.log("[Seedance] Created task", {
                    taskUUID: taskUUIDCreated,
                    width: 864,
                    height: 480,
                    duration,
                    cameraFixed,
                });
                const createResp = yield axios_1.default.post("https://api.runware.ai/v1", [task], { headers: runwareHeaders, timeout: 180000 });
                const createData = createResp.data;
                const ackItem = Array.isArray(createData === null || createData === void 0 ? void 0 : createData.data)
                    ? createData.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "videoInference") || createData.data[0]
                    : createData === null || createData === void 0 ? void 0 : createData.data;
                let videoUrl = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.videoURL) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.url) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.video) ||
                    (Array.isArray(ackItem === null || ackItem === void 0 ? void 0 : ackItem.videos) ? ackItem.videos[0] : null);
                let pollTaskUUID = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID) || taskUUIDCreated;
                console.log("[Seedance] Ack response", {
                    ackTaskUUID: ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID,
                    createdTaskUUID: taskUUIDCreated,
                    chosenPollTaskUUID: pollTaskUUID,
                    immediateVideo: !!videoUrl,
                    status: (ackItem === null || ackItem === void 0 ? void 0 : ackItem.status) || (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskStatus),
                });
                // 3) Poll if no immediate URL
                if (!videoUrl && pollTaskUUID) {
                    const maxAttempts = 100; // ~5 min
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    let consecutive400 = 0;
                    let switchedToCreated = false;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        yield delay(3000);
                        const pollPayload = [
                            { taskType: "getResponse", taskUUID: pollTaskUUID },
                        ];
                        console.log("[Seedance] Poll attempt", {
                            attempt,
                            pollPayload: pollPayload[0],
                        });
                        try {
                            const poll = yield axios_1.default.post("https://api.runware.ai/v1", pollPayload, { headers: runwareHeaders, timeout: 60000 });
                            const pd = poll.data;
                            const item = Array.isArray(pd === null || pd === void 0 ? void 0 : pd.data)
                                ? pd.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskUUID) === pollTaskUUID || (d === null || d === void 0 ? void 0 : d.videoURL)) || pd.data[0]
                                : pd === null || pd === void 0 ? void 0 : pd.data;
                            const status = (item === null || item === void 0 ? void 0 : item.status) || (item === null || item === void 0 ? void 0 : item.taskStatus);
                            if (status)
                                console.log("[Seedance] Poll status", { attempt, status });
                            if (status === "success" || (item === null || item === void 0 ? void 0 : item.videoURL) || (item === null || item === void 0 ? void 0 : item.url)) {
                                videoUrl =
                                    (item === null || item === void 0 ? void 0 : item.videoURL) ||
                                        (item === null || item === void 0 ? void 0 : item.url) ||
                                        (item === null || item === void 0 ? void 0 : item.video) ||
                                        (Array.isArray(item === null || item === void 0 ? void 0 : item.videos) ? item.videos[0] : null);
                                if (videoUrl)
                                    break;
                            }
                            if (status === "error" || status === "failed") {
                                respondRunwareError(res, 502, "Runware Seedance generation failed during polling", pd);
                                return;
                            }
                            consecutive400 = 0; // reset on successful poll
                        }
                        catch (e) {
                            const statusCode = (_d = e === null || e === void 0 ? void 0 : e.response) === null || _d === void 0 ? void 0 : _d.status;
                            const body = (_e = e === null || e === void 0 ? void 0 : e.response) === null || _e === void 0 ? void 0 : _e.data;
                            console.log("[Seedance] Poll error", {
                                attempt,
                                statusCode,
                                body: typeof body === "object"
                                    ? JSON.stringify(body).slice(0, 500)
                                    : body,
                            });
                            if (statusCode === 400) {
                                consecutive400++;
                                // If repeated 400 and ack UUID differs, try switching to created taskUUID once
                                if (!switchedToCreated &&
                                    pollTaskUUID !== taskUUIDCreated &&
                                    consecutive400 >= 2) {
                                    console.log("[Seedance] Switching to created taskUUID due to repeated 400", { from: pollTaskUUID, to: taskUUIDCreated });
                                    pollTaskUUID = taskUUIDCreated;
                                    switchedToCreated = true;
                                    consecutive400 = 0;
                                }
                                if (consecutive400 >= 5) {
                                    respondRunwareError(res, 502, "Runware Seedance polling returned repeated 400 errors", body || ((_f = e === null || e === void 0 ? void 0 : e.response) === null || _f === void 0 ? void 0 : _f.data) || e);
                                    return;
                                }
                            }
                            continue;
                        }
                    }
                }
                if (!videoUrl) {
                    console.log("[Seedance] Timeout - no video URL returned after polling");
                    respondRunwareError(res, 502, "Runware Seedance 1.0 Pro Fast did not return a video URL (timeout or missing)", createData);
                    return;
                }
                // 4) Download and upload to S3
                let rwStream;
                try {
                    rwStream = yield axios_1.default.get(videoUrl, {
                        responseType: "stream",
                        timeout: 600000,
                    });
                    console.log("[Seedance] Download started");
                }
                catch (e) {
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
                    uploaded = yield uploadGeneratedVideo(feature, "seedance-pro-fast", rwStream.data);
                    console.log("[Seedance] S3 upload success", { key: uploaded.key });
                }
                catch (e) {
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
            }
            catch (err) {
                console.error("Runware Seedance 1.0 Pro Fast error:", ((_g = err === null || err === void 0 ? void 0 : err.response) === null || _g === void 0 ? void 0 : _g.data) || err);
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
                    imageCloudUrlInitial: imageCloudUrl === null || imageCloudUrl === void 0 ? void 0 : imageCloudUrl.slice(0, 120),
                });
                const runwareHeaders = {
                    Authorization: `Bearer ${process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY}`,
                    "Content-Type": "application/json",
                };
                // 1) Upload first frame to get imageUUID
                const uploadPayload = [
                    {
                        taskType: "imageUpload",
                        taskUUID: (0, crypto_1.randomUUID)(),
                        image: imageCloudUrl,
                    },
                ];
                let firstUUID;
                try {
                    const up = yield axios_1.default.post("https://api.runware.ai/v1", uploadPayload, {
                        headers: runwareHeaders,
                        timeout: 180000,
                    });
                    const d = up.data;
                    const obj = Array.isArray(d === null || d === void 0 ? void 0 : d.data) ? d.data[0] : d === null || d === void 0 ? void 0 : d.data;
                    firstUUID = (obj === null || obj === void 0 ? void 0 : obj.imageUUID) || (obj === null || obj === void 0 ? void 0 : obj.imageUuid);
                    console.log("[LTX2] imageUpload success", { firstUUID });
                }
                catch (e) {
                    console.error("[LTX2] imageUpload failed:", ((_h = e === null || e === void 0 ? void 0 : e.response) === null || _h === void 0 ? void 0 : _h.data) || (e === null || e === void 0 ? void 0 : e.message) || e);
                    respondRunwareError(res, 400, "Failed to upload image to Runware (LTX-2)", ((_j = e === null || e === void 0 ? void 0 : e.response) === null || _j === void 0 ? void 0 : _j.data) || e);
                    return;
                }
                if (!firstUUID) {
                    res.status(400).json({
                        success: false,
                        error: "Runware imageUpload did not return imageUUID",
                    });
                    return;
                }
                // Optional parameters from request, fallback to env vars and defaults
                const width = req.body.width !== undefined
                    ? Number(req.body.width)
                    : Number(process.env.LTX2_WIDTH || 1920);
                const height = req.body.height !== undefined
                    ? Number(req.body.height)
                    : Number(process.env.LTX2_HEIGHT || 1080);
                const duration = req.body.duration !== undefined
                    ? Number(req.body.duration)
                    : Number(process.env.LTX2_DURATION || 8);
                const generateAudio = req.body.generateAudio !== undefined
                    ? Boolean(req.body.generateAudio)
                    : String(process.env.LTX2_AUDIO || "true") === "true";
                const cfgScale = req.body.cfgScale !== undefined
                    ? Number(req.body.cfgScale)
                    : undefined;
                const steps = req.body.steps !== undefined ? Number(req.body.steps) : undefined;
                const seed = req.body.seed !== undefined ? Number(req.body.seed) : undefined;
                // 2) Create videoInference task
                const createdTaskUUID = (0, crypto_1.randomUUID)();
                const task = {
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
                // Add optional parameters if provided
                if (cfgScale !== undefined)
                    task.cfgScale = cfgScale;
                if (steps !== undefined)
                    task.steps = steps;
                if (seed !== undefined)
                    task.seed = seed;
                console.log("[LTX2] Created task", {
                    taskUUID: createdTaskUUID,
                    width,
                    height,
                    duration,
                    generateAudio,
                    cfgScale,
                    steps,
                    seed,
                });
                const createResp = yield axios_1.default.post("https://api.runware.ai/v1", [task], {
                    headers: runwareHeaders,
                    timeout: 180000,
                });
                const data = createResp.data;
                const ackItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
                    ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "videoInference") ||
                        data.data[0]
                    : data === null || data === void 0 ? void 0 : data.data;
                let videoUrl = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.videoURL) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.url) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.video) ||
                    (Array.isArray(ackItem === null || ackItem === void 0 ? void 0 : ackItem.videos) ? ackItem.videos[0] : null);
                let pollTaskUUID = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID) || createdTaskUUID;
                console.log("[LTX2] Ack response", {
                    ackTaskUUID: ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID,
                    createdTaskUUID,
                    chosenPollTaskUUID: pollTaskUUID,
                    immediateVideo: !!videoUrl,
                    status: (ackItem === null || ackItem === void 0 ? void 0 : ackItem.status) || (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskStatus),
                });
                // 3) Poll for completion if needed
                if (!videoUrl && pollTaskUUID) {
                    const maxAttempts = 100;
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    let consecutive400 = 0;
                    let switched = false;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        yield delay(3000);
                        const pollPayload = [
                            { taskType: "getResponse", taskUUID: pollTaskUUID },
                        ];
                        console.log("[LTX2] Poll attempt", {
                            attempt,
                            pollPayload: pollPayload[0],
                        });
                        try {
                            const poll = yield axios_1.default.post("https://api.runware.ai/v1", pollPayload, {
                                headers: runwareHeaders,
                                timeout: 60000,
                            });
                            const pd = poll.data;
                            const item = Array.isArray(pd === null || pd === void 0 ? void 0 : pd.data)
                                ? pd.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskUUID) === pollTaskUUID || (d === null || d === void 0 ? void 0 : d.videoURL)) || pd.data[0]
                                : pd === null || pd === void 0 ? void 0 : pd.data;
                            const status = (item === null || item === void 0 ? void 0 : item.status) || (item === null || item === void 0 ? void 0 : item.taskStatus);
                            if (status)
                                console.log("[LTX2] Poll status", { attempt, status });
                            if (status === "success" || (item === null || item === void 0 ? void 0 : item.videoURL) || (item === null || item === void 0 ? void 0 : item.url)) {
                                videoUrl =
                                    (item === null || item === void 0 ? void 0 : item.videoURL) ||
                                        (item === null || item === void 0 ? void 0 : item.url) ||
                                        (item === null || item === void 0 ? void 0 : item.video) ||
                                        (Array.isArray(item === null || item === void 0 ? void 0 : item.videos) ? item.videos[0] : null);
                                if (videoUrl)
                                    break;
                            }
                            if (status === "error" || status === "failed") {
                                respondRunwareError(res, 502, "LTX-2 generation failed during polling", pd);
                                return;
                            }
                            consecutive400 = 0;
                        }
                        catch (e) {
                            const statusCode = (_k = e === null || e === void 0 ? void 0 : e.response) === null || _k === void 0 ? void 0 : _k.status;
                            const body = (_l = e === null || e === void 0 ? void 0 : e.response) === null || _l === void 0 ? void 0 : _l.data;
                            console.log("[LTX2] Poll error", {
                                attempt,
                                statusCode,
                                body: typeof body === "object"
                                    ? JSON.stringify(body).slice(0, 500)
                                    : body,
                            });
                            if (statusCode === 400) {
                                consecutive400++;
                                if (!switched &&
                                    pollTaskUUID !== createdTaskUUID &&
                                    consecutive400 >= 2) {
                                    console.log("[LTX2] Switching poll taskUUID to created one due to repeated 400", { from: pollTaskUUID, to: createdTaskUUID });
                                    pollTaskUUID = createdTaskUUID;
                                    switched = true;
                                    consecutive400 = 0;
                                }
                                if (consecutive400 >= 5) {
                                    respondRunwareError(res, 502, "LTX-2 polling returned repeated 400 errors", body || ((_m = e === null || e === void 0 ? void 0 : e.response) === null || _m === void 0 ? void 0 : _m.data) || e);
                                    return;
                                }
                            }
                            continue;
                        }
                    }
                }
                if (!videoUrl) {
                    console.log("[LTX2] Timeout - no video URL returned after polling");
                    respondRunwareError(res, 502, "LTX-2 did not return a video URL (timeout or missing)", data);
                    return;
                }
                // 4) Download and upload to S3
                let ltxStream;
                try {
                    ltxStream = yield axios_1.default.get(videoUrl, {
                        responseType: "stream",
                        timeout: 600000,
                    });
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to download LTX-2 video",
                        details: serializeError(e),
                    });
                    return;
                }
                let uploaded;
                try {
                    uploaded = yield uploadGeneratedVideo(feature, "ltx2-pro", ltxStream.data);
                }
                catch (e) {
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
            }
            catch (err) {
                console.error("[LTX2] Fatal error:", ((_o = err === null || err === void 0 ? void 0 : err.response) === null || _o === void 0 ? void 0 : _o.data) || err);
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
                    imageCloudUrlInitial: imageCloudUrl === null || imageCloudUrl === void 0 ? void 0 : imageCloudUrl.slice(0, 120),
                });
                const runwareHeaders = {
                    Authorization: `Bearer ${process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY}`,
                    "Content-Type": "application/json",
                };
                // 1) Upload first frame to get imageUUID
                const uploadPayload = [
                    {
                        taskType: "imageUpload",
                        taskUUID: (0, crypto_1.randomUUID)(),
                        image: imageCloudUrl,
                    },
                ];
                let firstUUID;
                try {
                    const up = yield axios_1.default.post("https://api.runware.ai/v1", uploadPayload, {
                        headers: runwareHeaders,
                        timeout: 180000,
                    });
                    const d = up.data;
                    const obj = Array.isArray(d === null || d === void 0 ? void 0 : d.data) ? d.data[0] : d === null || d === void 0 ? void 0 : d.data;
                    firstUUID = (obj === null || obj === void 0 ? void 0 : obj.imageUUID) || (obj === null || obj === void 0 ? void 0 : obj.imageUuid);
                    console.log("[LTX2F] imageUpload success", { firstUUID });
                }
                catch (e) {
                    console.error("[LTX2F] imageUpload failed:", ((_p = e === null || e === void 0 ? void 0 : e.response) === null || _p === void 0 ? void 0 : _p.data) || (e === null || e === void 0 ? void 0 : e.message) || e);
                    respondRunwareError(res, 400, "Failed to upload image to Runware (LTX-2 Fast)", ((_q = e === null || e === void 0 ? void 0 : e.response) === null || _q === void 0 ? void 0 : _q.data) || e);
                    return;
                }
                if (!firstUUID) {
                    res.status(400).json({
                        success: false,
                        error: "Runware imageUpload did not return imageUUID",
                    });
                    return;
                }
                // Optional parameters from request, fallback to env vars and defaults
                const width = req.body.width !== undefined
                    ? Number(req.body.width)
                    : Number(process.env.LTX2F_WIDTH || 1920);
                const height = req.body.height !== undefined
                    ? Number(req.body.height)
                    : Number(process.env.LTX2F_HEIGHT || 1080);
                const duration = req.body.duration !== undefined
                    ? Number(req.body.duration)
                    : Number(process.env.LTX2F_DURATION || 8);
                const generateAudio = req.body.generateAudio !== undefined
                    ? Boolean(req.body.generateAudio)
                    : String(process.env.LTX2F_AUDIO || "true") === "true";
                const cfgScale = req.body.cfgScale !== undefined
                    ? Number(req.body.cfgScale)
                    : undefined;
                const steps = req.body.steps !== undefined ? Number(req.body.steps) : undefined;
                // 2) Create videoInference task (lightricks:2@1)
                const createdTaskUUID = (0, crypto_1.randomUUID)();
                const task = {
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
                // Add optional parameters if provided
                if (cfgScale !== undefined)
                    task.cfgScale = cfgScale;
                if (steps !== undefined)
                    task.steps = steps;
                console.log("[LTX2F] Created task", {
                    taskUUID: createdTaskUUID,
                    width,
                    height,
                    duration,
                    generateAudio,
                    cfgScale,
                    steps,
                });
                const createResp = yield axios_1.default.post("https://api.runware.ai/v1", [task], {
                    headers: runwareHeaders,
                    timeout: 180000,
                });
                const data = createResp.data;
                const ackItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
                    ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "videoInference") ||
                        data.data[0]
                    : data === null || data === void 0 ? void 0 : data.data;
                let videoUrl = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.videoURL) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.url) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.video) ||
                    (Array.isArray(ackItem === null || ackItem === void 0 ? void 0 : ackItem.videos) ? ackItem.videos[0] : null);
                let pollTaskUUID = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID) || createdTaskUUID;
                console.log("[LTX2F] Ack response", {
                    ackTaskUUID: ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID,
                    createdTaskUUID,
                    chosenPollTaskUUID: pollTaskUUID,
                    immediateVideo: !!videoUrl,
                    status: (ackItem === null || ackItem === void 0 ? void 0 : ackItem.status) || (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskStatus),
                });
                // 3) Poll for completion if needed
                if (!videoUrl && pollTaskUUID) {
                    const maxAttempts = 100;
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    let consecutive400 = 0;
                    let switched = false;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        yield delay(3000);
                        const pollPayload = [
                            { taskType: "getResponse", taskUUID: pollTaskUUID },
                        ];
                        console.log("[LTX2F] Poll attempt", {
                            attempt,
                            pollPayload: pollPayload[0],
                        });
                        try {
                            const poll = yield axios_1.default.post("https://api.runware.ai/v1", pollPayload, {
                                headers: runwareHeaders,
                                timeout: 60000,
                            });
                            const pd = poll.data;
                            const item = Array.isArray(pd === null || pd === void 0 ? void 0 : pd.data)
                                ? pd.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskUUID) === pollTaskUUID || (d === null || d === void 0 ? void 0 : d.videoURL)) || pd.data[0]
                                : pd === null || pd === void 0 ? void 0 : pd.data;
                            const status = (item === null || item === void 0 ? void 0 : item.status) || (item === null || item === void 0 ? void 0 : item.taskStatus);
                            if (status)
                                console.log("[LTX2F] Poll status", { attempt, status });
                            if (status === "success" || (item === null || item === void 0 ? void 0 : item.videoURL) || (item === null || item === void 0 ? void 0 : item.url)) {
                                videoUrl =
                                    (item === null || item === void 0 ? void 0 : item.videoURL) ||
                                        (item === null || item === void 0 ? void 0 : item.url) ||
                                        (item === null || item === void 0 ? void 0 : item.video) ||
                                        (Array.isArray(item === null || item === void 0 ? void 0 : item.videos) ? item.videos[0] : null);
                                if (videoUrl)
                                    break;
                            }
                            if (status === "error" || status === "failed") {
                                respondRunwareError(res, 502, "LTX-2 Fast generation failed during polling", pd);
                                return;
                            }
                            consecutive400 = 0;
                        }
                        catch (e) {
                            const statusCode = (_r = e === null || e === void 0 ? void 0 : e.response) === null || _r === void 0 ? void 0 : _r.status;
                            const body = (_s = e === null || e === void 0 ? void 0 : e.response) === null || _s === void 0 ? void 0 : _s.data;
                            console.log("[LTX2F] Poll error", {
                                attempt,
                                statusCode,
                                body: typeof body === "object"
                                    ? JSON.stringify(body).slice(0, 500)
                                    : body,
                            });
                            if (statusCode === 400) {
                                consecutive400++;
                                if (!switched &&
                                    pollTaskUUID !== createdTaskUUID &&
                                    consecutive400 >= 2) {
                                    console.log("[LTX2F] Switching poll taskUUID to created one due to repeated 400", { from: pollTaskUUID, to: createdTaskUUID });
                                    pollTaskUUID = createdTaskUUID;
                                    switched = true;
                                    consecutive400 = 0;
                                }
                                if (consecutive400 >= 5) {
                                    respondRunwareError(res, 502, "LTX-2 Fast polling returned repeated 400 errors", body || ((_t = e === null || e === void 0 ? void 0 : e.response) === null || _t === void 0 ? void 0 : _t.data) || e);
                                    return;
                                }
                            }
                            continue;
                        }
                    }
                }
                if (!videoUrl) {
                    console.log("[LTX2F] Timeout - no video URL returned after polling");
                    respondRunwareError(res, 502, "LTX-2 Fast did not return a video URL (timeout or missing)", data);
                    return;
                }
                // 4) Download and upload to S3
                let ltxStream;
                try {
                    ltxStream = yield axios_1.default.get(videoUrl, {
                        responseType: "stream",
                        timeout: 600000,
                    });
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to download LTX-2 Fast video",
                        details: serializeError(e),
                    });
                    return;
                }
                let uploaded;
                try {
                    uploaded = yield uploadGeneratedVideo(feature, "ltx2-fast", ltxStream.data);
                }
                catch (e) {
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
            }
            catch (err) {
                console.error("[LTX2F] Fatal error:", ((_u = err === null || err === void 0 ? void 0 : err.response) === null || _u === void 0 ? void 0 : _u.data) || err);
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
                    imageCloudUrlInitial: imageCloudUrl === null || imageCloudUrl === void 0 ? void 0 : imageCloudUrl.slice(0, 120),
                    lastFrameProvided: !!lastFrameCloudUrl,
                });
                const runwareHeaders = {
                    Authorization: `Bearer ${process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY}`,
                    "Content-Type": "application/json",
                };
                // 1) Upload frame images to Runware to obtain imageUUIDs
                const uploadOne = (imgUrl) => __awaiter(void 0, void 0, void 0, function* () {
                    const payload = [
                        {
                            taskType: "imageUpload",
                            taskUUID: (0, crypto_1.randomUUID)(),
                            image: imgUrl,
                        },
                    ];
                    const r = yield axios_1.default.post("https://api.runware.ai/v1", payload, {
                        headers: runwareHeaders,
                        timeout: 180000,
                    });
                    const d = r.data;
                    const obj = Array.isArray(d === null || d === void 0 ? void 0 : d.data) ? d.data[0] : d === null || d === void 0 ? void 0 : d.data;
                    return (obj === null || obj === void 0 ? void 0 : obj.imageUUID) || (obj === null || obj === void 0 ? void 0 : obj.imageUuid);
                });
                let firstUUID;
                try {
                    firstUUID = yield uploadOne(imageCloudUrl);
                    console.log("[VIDUQ2] imageUpload first success", { firstUUID });
                }
                catch (e) {
                    console.error("[VIDUQ2] imageUpload first failed:", ((_v = e === null || e === void 0 ? void 0 : e.response) === null || _v === void 0 ? void 0 : _v.data) || (e === null || e === void 0 ? void 0 : e.message) || e);
                    respondRunwareError(res, 400, "Failed to upload first frame to Runware (Vidu Q2)", ((_w = e === null || e === void 0 ? void 0 : e.response) === null || _w === void 0 ? void 0 : _w.data) || e);
                    return;
                }
                if (!firstUUID) {
                    res.status(400).json({
                        success: false,
                        error: "Runware imageUpload did not return imageUUID",
                    });
                    return;
                }
                let lastUUID;
                if (lastFrameCloudUrl) {
                    try {
                        lastUUID = yield uploadOne(lastFrameCloudUrl);
                        console.log("[VIDUQ2] imageUpload last success", { lastUUID });
                    }
                    catch (e) {
                        console.warn("[VIDUQ2] imageUpload last failed (continuing as single frame)", ((_x = e === null || e === void 0 ? void 0 : e.response) === null || _x === void 0 ? void 0 : _x.data) || (e === null || e === void 0 ? void 0 : e.message) || e);
                    }
                }
                // Model-specific params - optional from request body, fallback to env
                const duration = req.body.duration !== undefined
                    ? Number(req.body.duration)
                    : Number(process.env.VIDUQ2_DURATION || 5);
                const movementAmplitude = req.body.movementAmplitude ||
                    process.env.VIDUQ2_MOVEMENT_AMPLITUDE ||
                    "medium"; // low|medium|large
                const bgm = req.body.bgm !== undefined
                    ? Boolean(req.body.bgm)
                    : String(process.env.VIDUQ2_BGM || "false") === "true";
                // 2) Create videoInference task (omit width/height when using frameImages)
                const createdTaskUUID = (0, crypto_1.randomUUID)();
                const frameImages = [
                    { inputImage: firstUUID, frame: "first" },
                ];
                if (lastUUID)
                    frameImages.push({ inputImage: lastUUID, frame: "last" });
                const task = {
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
                const createResp = yield axios_1.default.post("https://api.runware.ai/v1", [task], { headers: runwareHeaders, timeout: 180000 });
                const data = createResp.data;
                const ackItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
                    ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "videoInference") ||
                        data.data[0]
                    : data === null || data === void 0 ? void 0 : data.data;
                let videoUrl = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.videoURL) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.url) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.video) ||
                    (Array.isArray(ackItem === null || ackItem === void 0 ? void 0 : ackItem.videos) ? ackItem.videos[0] : null);
                let pollTaskUUID = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID) || createdTaskUUID;
                console.log("[VIDUQ2] Ack response", {
                    ackTaskUUID: ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID,
                    createdTaskUUID,
                    chosenPollTaskUUID: pollTaskUUID,
                    immediateVideo: !!videoUrl,
                    status: (ackItem === null || ackItem === void 0 ? void 0 : ackItem.status) || (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskStatus),
                });
                // 3) Poll for completion if needed
                if (!videoUrl && pollTaskUUID) {
                    const maxAttempts = 100;
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    let consecutive400 = 0;
                    let switched = false;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        yield delay(3000);
                        const pollPayload = [
                            { taskType: "getResponse", taskUUID: pollTaskUUID },
                        ];
                        console.log("[VIDUQ2] Poll attempt", {
                            attempt,
                            pollPayload: pollPayload[0],
                        });
                        try {
                            const poll = yield axios_1.default.post("https://api.runware.ai/v1", pollPayload, { headers: runwareHeaders, timeout: 60000 });
                            const pd = poll.data;
                            const item = Array.isArray(pd === null || pd === void 0 ? void 0 : pd.data)
                                ? pd.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskUUID) === pollTaskUUID || (d === null || d === void 0 ? void 0 : d.videoURL)) || pd.data[0]
                                : pd === null || pd === void 0 ? void 0 : pd.data;
                            const status = (item === null || item === void 0 ? void 0 : item.status) || (item === null || item === void 0 ? void 0 : item.taskStatus);
                            if (status)
                                console.log("[VIDUQ2] Poll status", { attempt, status });
                            if (status === "success" || (item === null || item === void 0 ? void 0 : item.videoURL) || (item === null || item === void 0 ? void 0 : item.url)) {
                                videoUrl =
                                    (item === null || item === void 0 ? void 0 : item.videoURL) ||
                                        (item === null || item === void 0 ? void 0 : item.url) ||
                                        (item === null || item === void 0 ? void 0 : item.video) ||
                                        (Array.isArray(item === null || item === void 0 ? void 0 : item.videos) ? item.videos[0] : null);
                                if (videoUrl)
                                    break;
                            }
                            if (status === "error" || status === "failed") {
                                respondRunwareError(res, 502, "Vidu Q2 Turbo generation failed during polling", pd);
                                return;
                            }
                            consecutive400 = 0;
                        }
                        catch (e) {
                            const statusCode = (_y = e === null || e === void 0 ? void 0 : e.response) === null || _y === void 0 ? void 0 : _y.status;
                            const body = (_z = e === null || e === void 0 ? void 0 : e.response) === null || _z === void 0 ? void 0 : _z.data;
                            console.log("[VIDUQ2] Poll error", {
                                attempt,
                                statusCode,
                                body: typeof body === "object"
                                    ? JSON.stringify(body).slice(0, 500)
                                    : body,
                            });
                            if (statusCode === 400) {
                                consecutive400++;
                                if (!switched &&
                                    pollTaskUUID !== createdTaskUUID &&
                                    consecutive400 >= 2) {
                                    console.log("[VIDUQ2] Switching poll taskUUID to created one due to repeated 400", { from: pollTaskUUID, to: createdTaskUUID });
                                    pollTaskUUID = createdTaskUUID;
                                    switched = true;
                                    consecutive400 = 0;
                                }
                                if (consecutive400 >= 5) {
                                    respondRunwareError(res, 502, "Vidu Q2 Turbo polling returned repeated 400 errors", body || ((_0 = e === null || e === void 0 ? void 0 : e.response) === null || _0 === void 0 ? void 0 : _0.data) || e);
                                    return;
                                }
                            }
                            continue;
                        }
                    }
                }
                if (!videoUrl) {
                    console.log("[VIDUQ2] Timeout - no video URL returned after polling");
                    respondRunwareError(res, 502, "Vidu Q2 Turbo did not return a video URL (timeout or missing)", data);
                    return;
                }
                // 4) Download and upload to S3
                let vq2Stream;
                try {
                    vq2Stream = yield axios_1.default.get(videoUrl, {
                        responseType: "stream",
                        timeout: 600000,
                    });
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to download Vidu Q2 Turbo video",
                        details: serializeError(e),
                    });
                    return;
                }
                let uploaded;
                try {
                    uploaded = yield uploadGeneratedVideo(feature, "viduq2-turbo", vq2Stream.data);
                }
                catch (e) {
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
            }
            catch (err) {
                console.error("[VIDUQ2] Fatal error:", ((_1 = err === null || err === void 0 ? void 0 : err.response) === null || _1 === void 0 ? void 0 : _1.data) || err);
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
                    Authorization: `Bearer ${process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY}`,
                    "Content-Type": "application/json",
                };
                console.log("Runware API KEY: ", process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY);
                // Helper to upload an image url and get imageUUID
                const uploadToRunware = (img) => __awaiter(void 0, void 0, void 0, function* () {
                    var _a;
                    try {
                        const uploadPayload = [
                            { taskType: "imageUpload", taskUUID: (0, crypto_1.randomUUID)(), image: img },
                        ];
                        const r = yield axios_1.default.post("https://api.runware.ai/v1", uploadPayload, {
                            headers: runwareHeaders,
                            timeout: 180000,
                            maxBodyLength: Infinity,
                            maxContentLength: Infinity,
                        });
                        const d = r.data;
                        const obj = Array.isArray(d === null || d === void 0 ? void 0 : d.data) ? d.data[0] : d === null || d === void 0 ? void 0 : d.data;
                        return (obj === null || obj === void 0 ? void 0 : obj.imageUUID) || (obj === null || obj === void 0 ? void 0 : obj.imageUuid);
                    }
                    catch (e) {
                        console.warn("Runware imageUpload failed (Veo3.1):", ((_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) || (e === null || e === void 0 ? void 0 : e.message) || e);
                        return undefined;
                    }
                });
                // Build frameImages array
                const frameImages = [];
                if (imageCloudUrl) {
                    const firstUUID = yield uploadToRunware(imageCloudUrl);
                    if (!firstUUID) {
                        throw new Error("Runware imageUpload did not return imageUUID for the first frame (Veo3.1)");
                    }
                    frameImages.push({ inputImage: firstUUID, frame: "first" });
                }
                if (lastFrameCloudUrl) {
                    const lastUUID = yield uploadToRunware(lastFrameCloudUrl);
                    if (!lastUUID) {
                        throw new Error("Runware imageUpload did not return imageUUID for the last frame (Veo3.1)");
                    }
                    frameImages.push({ inputImage: lastUUID, frame: "last" });
                }
                // Optional parameters from request, fallback to env vars
                const width = req.body.width !== undefined
                    ? Number(req.body.width)
                    : Number(process.env.VEO31_WIDTH || 1280);
                const height = req.body.height !== undefined
                    ? Number(req.body.height)
                    : Number(process.env.VEO31_HEIGHT || 720);
                const duration = req.body.duration !== undefined
                    ? Number(req.body.duration)
                    : Number(process.env.VEO31_DURATION || 8);
                const generateAudio = req.body.generateAudio !== undefined
                    ? req.body.generateAudio
                    : true;
                const createdTaskUUID = (0, crypto_1.randomUUID)();
                const task = {
                    taskType: "videoInference",
                    taskUUID: createdTaskUUID,
                    model: "google:3@2",
                    positivePrompt: prompt || "",
                    width,
                    height,
                    duration,
                    deliveryMethod: "async",
                    providerSettings: { google: { generateAudio } },
                    frameImages,
                };
                console.log("veo 3.1 task:", task);
                const runwareResp = yield axios_1.default.post("https://api.runware.ai/v1", [task], {
                    headers: runwareHeaders,
                    timeout: 180000,
                });
                const data = runwareResp.data;
                console.log("veo 3.1 resp data: ", data);
                const ackItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
                    ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "videoInference") ||
                        data.data[0]
                    : data === null || data === void 0 ? void 0 : data.data;
                let videoUrl = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.videoURL) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.url) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.video) ||
                    (Array.isArray(ackItem === null || ackItem === void 0 ? void 0 : ackItem.videos) ? ackItem.videos[0] : null);
                let pollTaskUUID = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID) || createdTaskUUID;
                // Poll using getResponse with 400 fallback
                if (!videoUrl && pollTaskUUID) {
                    const maxAttempts = 100;
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    let consecutive400 = 0;
                    let switched = false;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        yield delay(3000);
                        const pollPayload = [
                            {
                                taskType: "getResponse",
                                taskUUID: pollTaskUUID,
                            },
                        ];
                        try {
                            const poll = yield axios_1.default.post("https://api.runware.ai/v1", pollPayload, { headers: runwareHeaders, timeout: 60000 });
                            console.log("poll payload:", pollPayload);
                            const pd = poll.data;
                            console.log("poll data: ", pd);
                            const item = Array.isArray(pd === null || pd === void 0 ? void 0 : pd.data)
                                ? pd.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskUUID) === pollTaskUUID || (d === null || d === void 0 ? void 0 : d.videoURL)) || pd.data[0]
                                : pd === null || pd === void 0 ? void 0 : pd.data;
                            const status = (item === null || item === void 0 ? void 0 : item.status) || (item === null || item === void 0 ? void 0 : item.taskStatus);
                            if (status === "success" || (item === null || item === void 0 ? void 0 : item.videoURL) || (item === null || item === void 0 ? void 0 : item.url)) {
                                videoUrl =
                                    (item === null || item === void 0 ? void 0 : item.videoURL) ||
                                        (item === null || item === void 0 ? void 0 : item.url) ||
                                        (item === null || item === void 0 ? void 0 : item.video) ||
                                        (Array.isArray(item === null || item === void 0 ? void 0 : item.videos) ? item.videos[0] : null);
                                if (videoUrl)
                                    break;
                            }
                            if (status === "error" || status === "failed") {
                                respondRunwareError(res, 422, "Runware Veo 3.1 returned error during polling", pd);
                                return;
                            }
                            consecutive400 = 0;
                        }
                        catch (e) {
                            const statusCode = (_2 = e === null || e === void 0 ? void 0 : e.response) === null || _2 === void 0 ? void 0 : _2.status;
                            const body = (_3 = e === null || e === void 0 ? void 0 : e.response) === null || _3 === void 0 ? void 0 : _3.data;
                            console.log("Veo 3.1 poll error", {
                                attempt,
                                statusCode,
                                body: typeof body === "object"
                                    ? JSON.stringify(body).slice(0, 500)
                                    : body,
                            });
                            if (statusCode === 400) {
                                consecutive400++;
                                if (!switched &&
                                    pollTaskUUID !== createdTaskUUID &&
                                    consecutive400 >= 2) {
                                    pollTaskUUID = createdTaskUUID;
                                    switched = true;
                                    consecutive400 = 0;
                                }
                                if (consecutive400 >= 5) {
                                    respondRunwareError(res, 422, "Runware Veo 3.1 polling returned repeated 400 errors", body || ((_4 = e === null || e === void 0 ? void 0 : e.response) === null || _4 === void 0 ? void 0 : _4.data) || e);
                                    return;
                                }
                            }
                            continue;
                        }
                    }
                }
                if (!videoUrl) {
                    respondRunwareError(res, 502, "Runware Veo 3.1 did not return video URL (timeout or missing)", data);
                    return;
                }
                // Download & upload to S3
                let rwStream;
                try {
                    rwStream = yield axios_1.default.get(videoUrl, {
                        responseType: "stream",
                        timeout: 600000,
                    });
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to download Runware Veo 3.1 video",
                        details: serializeError(e),
                    });
                    return;
                }
                let uploaded;
                try {
                    uploaded = yield uploadGeneratedVideo(feature, "veo31", rwStream.data);
                }
                catch (e) {
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
            }
            catch (err) {
                console.error("Runware Veo 3.1 error:", ((_5 = err === null || err === void 0 ? void 0 : err.response) === null || _5 === void 0 ? void 0 : _5.data) || err);
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
                    imageCloudUrlInitial: imageCloudUrl === null || imageCloudUrl === void 0 ? void 0 : imageCloudUrl.slice(0, 120),
                    lastFrameProvided: !!lastFrameCloudUrl,
                });
                const runwareHeaders = {
                    Authorization: `Bearer ${process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY}`,
                    "Content-Type": "application/json",
                };
                // Helper upload
                const uploadToRunware = (img) => __awaiter(void 0, void 0, void 0, function* () {
                    var _a;
                    try {
                        const uploadPayload = [
                            { taskType: "imageUpload", taskUUID: (0, crypto_1.randomUUID)(), image: img },
                        ];
                        const r = yield axios_1.default.post("https://api.runware.ai/v1", uploadPayload, {
                            headers: runwareHeaders,
                            timeout: 180000,
                            maxBodyLength: Infinity,
                            maxContentLength: Infinity,
                        });
                        const d = r.data;
                        const obj = Array.isArray(d === null || d === void 0 ? void 0 : d.data) ? d.data[0] : d === null || d === void 0 ? void 0 : d.data;
                        return (obj === null || obj === void 0 ? void 0 : obj.imageUUID) || (obj === null || obj === void 0 ? void 0 : obj.imageUuid);
                    }
                    catch (e) {
                        console.warn("Runware imageUpload failed (Veo3.1 Fast):", ((_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) || (e === null || e === void 0 ? void 0 : e.message) || e);
                        return undefined;
                    }
                });
                const frameImages = [];
                if (imageCloudUrl) {
                    const firstUUID = yield uploadToRunware(imageCloudUrl);
                    if (!firstUUID) {
                        throw new Error("Runware imageUpload did not return imageUUID for the first frame (Veo3.1 Fast)");
                    }
                    frameImages.push({ inputImage: firstUUID, frame: "first" });
                }
                if (lastFrameCloudUrl) {
                    const lastUUID = yield uploadToRunware(lastFrameCloudUrl);
                    if (!lastUUID) {
                        throw new Error("Runware imageUpload did not return imageUUID for the last frame (Veo3.1 Fast)");
                    }
                    frameImages.push({ inputImage: lastUUID, frame: "last" });
                }
                // Optional parameters from request, fallback to env vars
                const width = req.body.width !== undefined
                    ? Number(req.body.width)
                    : Number(process.env.VEO31F_WIDTH || 1280);
                const height = req.body.height !== undefined
                    ? Number(req.body.height)
                    : Number(process.env.VEO31F_HEIGHT || 720);
                const duration = req.body.duration !== undefined
                    ? Number(req.body.duration)
                    : Number(process.env.VEO31F_DURATION || 8);
                const generateAudio = req.body.generateAudio !== undefined
                    ? req.body.generateAudio
                    : true;
                const createdTaskUUID = (0, crypto_1.randomUUID)();
                const task = {
                    taskType: "videoInference",
                    taskUUID: createdTaskUUID,
                    model: "google:3@3",
                    positivePrompt: prompt || "",
                    width,
                    height,
                    duration,
                    deliveryMethod: "async",
                    providerSettings: { google: { generateAudio } },
                    frameImages,
                };
                console.log("[VEO31F] Created task", {
                    taskUUID: createdTaskUUID,
                    width,
                    height,
                    duration,
                    frames: frameImages.length,
                });
                const runwareResp = yield axios_1.default.post("https://api.runware.ai/v1", [task], { headers: runwareHeaders, timeout: 180000 });
                const data = runwareResp.data;
                const ackItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
                    ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "videoInference") ||
                        data.data[0]
                    : data === null || data === void 0 ? void 0 : data.data;
                let videoUrl = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.videoURL) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.url) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.video) ||
                    (Array.isArray(ackItem === null || ackItem === void 0 ? void 0 : ackItem.videos) ? ackItem.videos[0] : null);
                let pollTaskUUID = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID) || createdTaskUUID;
                console.log("[VEO31F] Ack response", {
                    ackTaskUUID: ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID,
                    createdTaskUUID,
                    chosenPollTaskUUID: pollTaskUUID,
                    immediateVideo: !!videoUrl,
                    status: (ackItem === null || ackItem === void 0 ? void 0 : ackItem.status) || (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskStatus),
                });
                if (!videoUrl && pollTaskUUID) {
                    const maxAttempts = 100;
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    let consecutive400 = 0;
                    let switched = false;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        yield delay(3000);
                        const pollPayload = [
                            { taskType: "getResponse", taskUUID: pollTaskUUID },
                        ];
                        console.log("[VEO31F] Poll attempt", {
                            attempt,
                            pollTaskUUID,
                        });
                        try {
                            const poll = yield axios_1.default.post("https://api.runware.ai/v1", pollPayload, { headers: runwareHeaders, timeout: 60000 });
                            const pd = poll.data;
                            const item = Array.isArray(pd === null || pd === void 0 ? void 0 : pd.data)
                                ? pd.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskUUID) === pollTaskUUID || (d === null || d === void 0 ? void 0 : d.videoURL)) || pd.data[0]
                                : pd === null || pd === void 0 ? void 0 : pd.data;
                            const status = (item === null || item === void 0 ? void 0 : item.status) || (item === null || item === void 0 ? void 0 : item.taskStatus);
                            if (status)
                                console.log("[VEO31F] Poll status", { attempt, status });
                            if (status === "success" || (item === null || item === void 0 ? void 0 : item.videoURL) || (item === null || item === void 0 ? void 0 : item.url)) {
                                videoUrl =
                                    (item === null || item === void 0 ? void 0 : item.videoURL) ||
                                        (item === null || item === void 0 ? void 0 : item.url) ||
                                        (item === null || item === void 0 ? void 0 : item.video) ||
                                        (Array.isArray(item === null || item === void 0 ? void 0 : item.videos) ? item.videos[0] : null);
                                if (videoUrl)
                                    break;
                            }
                            if (status === "error" || status === "failed") {
                                respondRunwareError(res, 422, "Runware Veo 3.1 Fast returned error during polling", pd);
                                return;
                            }
                            consecutive400 = 0;
                        }
                        catch (e) {
                            const statusCode = (_6 = e === null || e === void 0 ? void 0 : e.response) === null || _6 === void 0 ? void 0 : _6.status;
                            const body = (_7 = e === null || e === void 0 ? void 0 : e.response) === null || _7 === void 0 ? void 0 : _7.data;
                            console.log("[VEO31F] Poll error", {
                                attempt,
                                statusCode,
                                body: typeof body === "object"
                                    ? JSON.stringify(body).slice(0, 500)
                                    : body,
                            });
                            if (statusCode === 400) {
                                consecutive400++;
                                if (!switched &&
                                    pollTaskUUID !== createdTaskUUID &&
                                    consecutive400 >= 2) {
                                    console.log("[VEO31F] Switching poll taskUUID to created one due to repeated 400", { from: pollTaskUUID, to: createdTaskUUID });
                                    pollTaskUUID = createdTaskUUID;
                                    switched = true;
                                    consecutive400 = 0;
                                }
                                if (consecutive400 >= 5) {
                                    console.log("[VEO31F] Aborting after repeated 400s during polling");
                                    respondRunwareError(res, 422, "Runware Veo 3.1 Fast polling returned repeated 400 errors", body || ((_8 = e === null || e === void 0 ? void 0 : e.response) === null || _8 === void 0 ? void 0 : _8.data) || e);
                                    return;
                                }
                            }
                            continue;
                        }
                    }
                }
                if (!videoUrl) {
                    respondRunwareError(res, 502, "Runware Veo 3.1 Fast did not return video URL (timeout or missing)", data);
                    return;
                }
                let rwStream;
                try {
                    rwStream = yield axios_1.default.get(videoUrl, {
                        responseType: "stream",
                        timeout: 600000,
                    });
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to download Runware Veo 3.1 Fast video",
                        details: serializeError(e),
                    });
                    return;
                }
                let uploaded;
                try {
                    uploaded = yield uploadGeneratedVideo(feature, "veo31-fast", rwStream.data);
                    console.log("[VEO31F] S3 upload success", { key: uploaded.key });
                }
                catch (e) {
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
            }
            catch (err) {
                console.error("Runware Veo 3.1 Fast error:", ((_9 = err === null || err === void 0 ? void 0 : err.response) === null || _9 === void 0 ? void 0 : _9.data) || err);
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
                    imageCloudUrlInitial: imageCloudUrl === null || imageCloudUrl === void 0 ? void 0 : imageCloudUrl.slice(0, 120),
                    lastFrameProvided: !!lastFrameCloudUrl,
                });
                // Upload images to Runware to obtain imageUUIDs (more reliable than using plain URLs)
                const runwareHeaders = {
                    Authorization: `Bearer ${process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY}`,
                    "Content-Type": "application/json",
                };
                const uploadToRunware = (img) => __awaiter(void 0, void 0, void 0, function* () {
                    var _a;
                    try {
                        const uploadPayload = [
                            { taskType: "imageUpload", taskUUID: (0, crypto_1.randomUUID)(), image: img },
                        ];
                        const r = yield axios_1.default.post("https://api.runware.ai/v1", uploadPayload, {
                            headers: runwareHeaders,
                            timeout: 180000,
                            maxBodyLength: Infinity,
                            maxContentLength: Infinity,
                        });
                        const d = r.data;
                        const obj = Array.isArray(d === null || d === void 0 ? void 0 : d.data) ? d.data[0] : d === null || d === void 0 ? void 0 : d.data;
                        return (obj === null || obj === void 0 ? void 0 : obj.imageUUID) || (obj === null || obj === void 0 ? void 0 : obj.imageUuid);
                    }
                    catch (e) {
                        console.warn("Runware imageUpload failed:", ((_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) || (e === null || e === void 0 ? void 0 : e.message) || e);
                        return undefined;
                    }
                });
                // Build frameImages array as objects with UUIDs per Runware spec
                const frameImages = [];
                if (imageCloudUrl) {
                    const firstUUID = yield uploadToRunware(imageCloudUrl);
                    if (!firstUUID) {
                        throw new Error("Runware imageUpload did not return imageUUID for the first frame");
                    }
                    frameImages.push({ inputImage: firstUUID, frame: "first" });
                }
                if (lastFrameCloudUrl) {
                    const lastUUID = yield uploadToRunware(lastFrameCloudUrl);
                    if (!lastUUID) {
                        throw new Error("Runware imageUpload did not return imageUUID for the last frame");
                    }
                    frameImages.push({ inputImage: lastUUID, frame: "last" });
                }
                // Duration: optional from request, default to 8
                const duration = req.body.duration !== undefined ? Number(req.body.duration) : 8;
                // Generate audio: optional from request, default to true
                const generateAudio = req.body.generateAudio !== undefined
                    ? req.body.generateAudio
                    : true;
                const task = {
                    taskType: "videoInference",
                    taskUUID: (0, crypto_1.randomUUID)(),
                    model: "google:3@1", // Runware model AIR ID for Veo 3 Fast (with audio)
                    // Use user prompt override or feature prompt
                    positivePrompt: prompt || "",
                    width: 1280,
                    height: 720,
                    duration: duration,
                    deliveryMethod: "async", // video generation requires async; we'll poll for completion
                    providerSettings: {
                        google: { generateAudio: generateAudio },
                    },
                    // Frame images: first and optional last as objects
                    frameImages,
                };
                console.log("[VEO3F] Created task", {
                    width: 1280,
                    height: 720,
                    duration: 8,
                    hasLastFrame: !!lastFrameCloudUrl,
                });
                const payload = [task];
                console.log("veo 3 task payload:", payload);
                const runwareResp = yield axios_1.default.post("https://api.runware.ai/v1", payload, {
                    headers: runwareHeaders,
                    timeout: 180000,
                });
                const data = runwareResp.data;
                const ackItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
                    ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "videoInference") ||
                        data.data[0]
                    : data === null || data === void 0 ? void 0 : data.data;
                let videoUrl = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.videoURL) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.url) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.video) ||
                    (Array.isArray(ackItem === null || ackItem === void 0 ? void 0 : ackItem.videos) ? ackItem.videos[0] : null);
                // If URL not directly available (async mode), poll getResponse using taskUUID
                let taskUUID = ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID;
                console.log("[VEO3F] Ack response", {
                    ackTaskUUID: taskUUID,
                    immediateVideo: !!videoUrl,
                    status: (ackItem === null || ackItem === void 0 ? void 0 : ackItem.status) || (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskStatus),
                });
                if (!videoUrl && taskUUID) {
                    const maxAttempts = 80; // ~4 minutes at 3s interval
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        yield delay(3000);
                        const pollPayload = [
                            { taskType: "getResponse", taskUUID: taskUUID },
                        ];
                        console.log("veo 3 fast poll payload: ", pollPayload);
                        let pollResp;
                        try {
                            pollResp = yield axios_1.default.post("https://api.runware.ai/v1", pollPayload, { headers: runwareHeaders, timeout: 60000 });
                        }
                        catch (e) {
                            // transient errors: continue polling
                            console.log("[VEO3F] Poll transient error (continuing)", ((_10 = e === null || e === void 0 ? void 0 : e.response) === null || _10 === void 0 ? void 0 : _10.status) || (e === null || e === void 0 ? void 0 : e.message));
                            continue;
                        }
                        const pd = pollResp.data;
                        const item = Array.isArray(pd === null || pd === void 0 ? void 0 : pd.data)
                            ? pd.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskUUID) === taskUUID || (d === null || d === void 0 ? void 0 : d.videoURL)) || pd.data[0]
                            : pd === null || pd === void 0 ? void 0 : pd.data;
                        const status = (item === null || item === void 0 ? void 0 : item.status) || (item === null || item === void 0 ? void 0 : item.taskStatus);
                        if (status)
                            console.log("[VEO3F] Poll status", { attempt, status });
                        if (status === "success" || (item === null || item === void 0 ? void 0 : item.videoURL) || (item === null || item === void 0 ? void 0 : item.url)) {
                            videoUrl =
                                (item === null || item === void 0 ? void 0 : item.videoURL) ||
                                    (item === null || item === void 0 ? void 0 : item.url) ||
                                    (item === null || item === void 0 ? void 0 : item.video) ||
                                    (Array.isArray(item === null || item === void 0 ? void 0 : item.videos) ? item.videos[0] : null);
                            if (videoUrl)
                                break;
                        }
                        if (status === "error" || status === "failed") {
                            respondRunwareError(res, 422, "Runware Veo3@fast returned error during polling", pd);
                            return;
                        }
                    }
                }
                if (!videoUrl) {
                    console.log("[VEO3F] Timeout - no video URL returned after polling");
                    respondRunwareError(res, 502, "Runware Veo3@fast did not return video URL (timeout or missing)", data);
                    return;
                }
                // Download & upload to S3 (normalize hosting)
                let rwStream;
                try {
                    rwStream = yield axios_1.default.get(videoUrl, {
                        responseType: "stream",
                        timeout: 600000,
                    });
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to download Runware Veo3@fast video",
                        details: serializeError(e),
                    });
                    return;
                }
                let uploaded;
                try {
                    uploaded = yield uploadGeneratedVideo(feature, "veo3-fast", rwStream.data);
                    console.log("[VEO3F] S3 upload success", { key: uploaded.key });
                }
                catch (e) {
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
            }
            catch (err) {
                console.error("Runware Veo3@fast error:", ((_11 = err === null || err === void 0 ? void 0 : err.response) === null || _11 === void 0 ? void 0 : _11.data) || err);
                res.status(500).json({
                    success: false,
                    error: "Runware Veo3@fast generation failed",
                    details: serializeError(err),
                });
                return;
            }
        }
        if (isRunwayGen4Turbo) {
            try {
                console.log("[Runway Gen4] Start generation", {
                    feature,
                    rawModel,
                    imageCloudUrlInitial: imageCloudUrl === null || imageCloudUrl === void 0 ? void 0 : imageCloudUrl.slice(0, 120),
                    lastFrameProvided: !!lastFrameCloudUrl,
                });
                const runwareHeaders = {
                    Authorization: `Bearer ${process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY}`,
                    "Content-Type": "application/json",
                };
                const uploadFrame = (imgUrl) => __awaiter(void 0, void 0, void 0, function* () {
                    const payload = [
                        {
                            taskType: "imageUpload",
                            taskUUID: (0, crypto_1.randomUUID)(),
                            image: imgUrl,
                        },
                    ];
                    const resp = yield axios_1.default.post("https://api.runware.ai/v1", payload, {
                        headers: runwareHeaders,
                        timeout: 180000,
                    });
                    const data = resp.data;
                    const obj = Array.isArray(data === null || data === void 0 ? void 0 : data.data) ? data.data[0] : data === null || data === void 0 ? void 0 : data.data;
                    return (obj === null || obj === void 0 ? void 0 : obj.imageUUID) || (obj === null || obj === void 0 ? void 0 : obj.imageUuid);
                });
                let firstUUID;
                try {
                    firstUUID = yield uploadFrame(imageCloudUrl);
                    console.log("[Runway Gen4] imageUpload first success", {
                        firstUUID,
                    });
                }
                catch (e) {
                    console.error("[Runway Gen4] imageUpload first failed:", ((_12 = e === null || e === void 0 ? void 0 : e.response) === null || _12 === void 0 ? void 0 : _12.data) || (e === null || e === void 0 ? void 0 : e.message) || e);
                    respondRunwareError(res, 400, "Failed to upload first frame to Runway Gen-4 Turbo", ((_13 = e === null || e === void 0 ? void 0 : e.response) === null || _13 === void 0 ? void 0 : _13.data) || e);
                    return;
                }
                if (!firstUUID) {
                    res.status(400).json({
                        success: false,
                        error: "Runware imageUpload did not return imageUUID",
                    });
                    return;
                }
                let lastUUID;
                if (lastFrameCloudUrl) {
                    try {
                        lastUUID = yield uploadFrame(lastFrameCloudUrl);
                        console.log("[Runway Gen4] imageUpload last success", {
                            lastUUID,
                        });
                    }
                    catch (e) {
                        console.warn("[Runway Gen4] imageUpload last failed (continuing with first frame only)", ((_14 = e === null || e === void 0 ? void 0 : e.response) === null || _14 === void 0 ? void 0 : _14.data) || (e === null || e === void 0 ? void 0 : e.message) || e);
                    }
                }
                const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
                const supportedDefaults = {
                    width: 1280,
                    height: 720,
                    duration: 10,
                    fps: 24,
                    cfg: 7.5,
                };
                // Optional parameters from request, fallback to env vars
                const width = clamp(req.body.width !== undefined
                    ? Number(req.body.width)
                    : Number(process.env.RUNWAY_TURBO_WIDTH || supportedDefaults.width), 256, 1920);
                const height = clamp(req.body.height !== undefined
                    ? Number(req.body.height)
                    : Number(process.env.RUNWAY_TURBO_HEIGHT || supportedDefaults.height), 256, 1080);
                const duration = clamp(req.body.duration !== undefined
                    ? Number(req.body.duration)
                    : Number(process.env.RUNWAY_TURBO_DURATION ||
                        supportedDefaults.duration), 2, 10);
                const fps = clamp(req.body.fps !== undefined
                    ? Number(req.body.fps)
                    : Number(process.env.RUNWAY_TURBO_FPS || supportedDefaults.fps), 15, 60);
                const cfgScale = clamp(req.body.cfgScale !== undefined
                    ? Number(req.body.cfgScale)
                    : Number(process.env.RUNWAY_TURBO_CFG || supportedDefaults.cfg), 1, 20);
                const publicFigureThreshold = req.body.publicFigureThreshold !== undefined
                    ? String(req.body.publicFigureThreshold)
                    : process.env.RUNWAY_TURBO_PUBLIC_FIGURE_THRESHOLD || undefined;
                const createdTaskUUID = (0, crypto_1.randomUUID)();
                const frameImages = [{ image: firstUUID, frame: "first" }];
                if (lastUUID)
                    frameImages.push({ image: lastUUID, frame: "last" });
                const task = {
                    taskType: "videoInference",
                    taskUUID: createdTaskUUID,
                    model: "runway:1@1",
                    positivePrompt: prompt || "",
                    duration,
                    width,
                    height,
                    inputs: {
                        frameImages,
                    },
                };
                if (publicFigureThreshold) {
                    task.providerSettings = {
                        runway: {
                            contentModeration: {
                                publicFigureThreshold,
                            },
                        },
                    };
                }
                console.log("[Runway Gen4] Created task", {
                    taskUUID: createdTaskUUID,
                    duration,
                    fps,
                    width,
                    height,
                    cfgScale,
                    frames: frameImages.length,
                    moderation: publicFigureThreshold,
                });
                const createResp = yield axios_1.default.post("https://api.runware.ai/v1", [task], {
                    headers: runwareHeaders,
                    timeout: 180000,
                });
                const data = createResp.data;
                const ackItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
                    ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "videoInference") ||
                        data.data[0]
                    : data === null || data === void 0 ? void 0 : data.data;
                let videoUrl = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.videoURL) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.url) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.video) ||
                    (Array.isArray(ackItem === null || ackItem === void 0 ? void 0 : ackItem.videos) ? ackItem.videos[0] : null);
                let pollTaskUUID = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID) || createdTaskUUID;
                console.log("[Runway Gen4] Ack response", {
                    ackTaskUUID: ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID,
                    createdTaskUUID,
                    chosenPollTaskUUID: pollTaskUUID,
                    immediateVideo: !!videoUrl,
                    status: (ackItem === null || ackItem === void 0 ? void 0 : ackItem.status) || (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskStatus),
                });
                if (!videoUrl && pollTaskUUID) {
                    const maxAttempts = 120;
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    let consecutive400 = 0;
                    let switched = false;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        yield delay(3000);
                        const pollPayload = [
                            { taskType: "getResponse", taskUUID: pollTaskUUID },
                        ];
                        console.log("[Runway Gen4] Poll attempt", {
                            attempt,
                            pollTaskUUID,
                        });
                        try {
                            const poll = yield axios_1.default.post("https://api.runware.ai/v1", pollPayload, { headers: runwareHeaders, timeout: 60000 });
                            const pd = poll.data;
                            const item = Array.isArray(pd === null || pd === void 0 ? void 0 : pd.data)
                                ? pd.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskUUID) === pollTaskUUID || (d === null || d === void 0 ? void 0 : d.videoURL)) || pd.data[0]
                                : pd === null || pd === void 0 ? void 0 : pd.data;
                            const status = (item === null || item === void 0 ? void 0 : item.status) || (item === null || item === void 0 ? void 0 : item.taskStatus);
                            if (status)
                                console.log("[Runway Gen4] Poll status", { attempt, status });
                            if (status === "success" || (item === null || item === void 0 ? void 0 : item.videoURL) || (item === null || item === void 0 ? void 0 : item.url)) {
                                videoUrl =
                                    (item === null || item === void 0 ? void 0 : item.videoURL) ||
                                        (item === null || item === void 0 ? void 0 : item.url) ||
                                        (item === null || item === void 0 ? void 0 : item.video) ||
                                        (Array.isArray(item === null || item === void 0 ? void 0 : item.videos) ? item.videos[0] : null);
                                if (videoUrl)
                                    break;
                            }
                            if (status === "error" || status === "failed") {
                                respondRunwareError(res, 502, "Runway Gen-4 Turbo generation failed during polling", pd);
                                return;
                            }
                            consecutive400 = 0;
                        }
                        catch (e) {
                            const statusCode = (_15 = e === null || e === void 0 ? void 0 : e.response) === null || _15 === void 0 ? void 0 : _15.status;
                            const body = (_16 = e === null || e === void 0 ? void 0 : e.response) === null || _16 === void 0 ? void 0 : _16.data;
                            let parsedBody = body;
                            if (typeof body === "string") {
                                try {
                                    parsedBody = JSON.parse(body);
                                }
                                catch (_116) {
                                    parsedBody = undefined;
                                }
                            }
                            const runwareMessage = Array.isArray(parsedBody === null || parsedBody === void 0 ? void 0 : parsedBody.errors)
                                ? ((_17 = parsedBody.errors[0]) === null || _17 === void 0 ? void 0 : _17.message) ||
                                    ((_18 = parsedBody.errors[0]) === null || _18 === void 0 ? void 0 : _18.responseContent)
                                : undefined;
                            console.log("[Runway Gen4] Poll error", {
                                attempt,
                                statusCode,
                                body: typeof body === "object"
                                    ? JSON.stringify(body).slice(0, 500)
                                    : body,
                            });
                            if (statusCode === 400) {
                                consecutive400++;
                                if (!switched &&
                                    pollTaskUUID !== createdTaskUUID &&
                                    consecutive400 >= 2) {
                                    console.log("[Runway Gen4] Switching poll UUID due to repeated 400", { from: pollTaskUUID, to: createdTaskUUID });
                                    pollTaskUUID = createdTaskUUID;
                                    switched = true;
                                    consecutive400 = 0;
                                }
                                if (consecutive400 >= 5) {
                                    respondRunwareError(res, 502, (runwareMessage === null || runwareMessage === void 0 ? void 0 : runwareMessage.trim()) ||
                                        "Runway Gen-4 Turbo polling returned repeated 400 errors", parsedBody || body || e, runwareMessage
                                        ? { code: "RUNWAY_PROVIDER_ERROR" }
                                        : undefined);
                                    return;
                                }
                            }
                            continue;
                        }
                    }
                }
                if (!videoUrl) {
                    respondRunwareError(res, 502, "Runway Gen-4 Turbo did not return a video URL", data);
                    return;
                }
                let runwayStream;
                try {
                    runwayStream = yield axios_1.default.get(videoUrl, {
                        responseType: "stream",
                        timeout: 600000,
                    });
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to download Runway Gen-4 Turbo video",
                        details: serializeError(e),
                    });
                    return;
                }
                let uploadedRunway;
                try {
                    uploadedRunway = yield uploadGeneratedVideo(feature, "runway-gen4-turbo", runwayStream.data);
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to upload Runway Gen-4 Turbo video to S3",
                        details: serializeError(e),
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    video: {
                        url: uploadedRunway.signedUrl,
                        signedUrl: uploadedRunway.signedUrl,
                        key: uploadedRunway.key,
                    },
                    s3Key: uploadedRunway.key,
                });
                return;
            }
            catch (err) {
                console.error("Runway Gen-4 Turbo error:", ((_19 = err === null || err === void 0 ? void 0 : err.response) === null || _19 === void 0 ? void 0 : _19.data) || err);
                const runwareErrors = (_21 = (_20 = err === null || err === void 0 ? void 0 : err.response) === null || _20 === void 0 ? void 0 : _20.data) === null || _21 === void 0 ? void 0 : _21.errors;
                const invalidPromptError = Array.isArray(runwareErrors)
                    ? runwareErrors.find((e) => (e === null || e === void 0 ? void 0 : e.code) === "invalidPositivePrompt")
                    : null;
                if (invalidPromptError) {
                    const minLen = Number(invalidPromptError === null || invalidPromptError === void 0 ? void 0 : invalidPromptError.min) || 1;
                    const maxLen = Number(invalidPromptError === null || invalidPromptError === void 0 ? void 0 : invalidPromptError.max) || 1000;
                    res.status(400).json({
                        success: false,
                        error: `Runway Gen-4 Turbo prompt must be between ${minLen} and ${maxLen} characters.`,
                        code: "RUNWAY_PROMPT_LENGTH",
                        details: serializeError(err),
                    });
                    return;
                }
                res.status(500).json({
                    success: false,
                    error: "Runway Gen-4 Turbo generation failed",
                    details: serializeError(err),
                });
                return;
            }
        }
        if (isRunwareSora2) {
            try {
                console.log("[Sora2] Start generation", {
                    feature,
                    rawModel,
                    imageCloudUrlInitial: imageCloudUrl === null || imageCloudUrl === void 0 ? void 0 : imageCloudUrl.slice(0, 120),
                    lastFrameProvided: !!lastFrameCloudUrl,
                });
                if (!prompt || !prompt.trim()) {
                    res.status(400).json({
                        success: false,
                        error: "Prompt is required for Sora 2",
                    });
                    return;
                }
                if (lastFrameCloudUrl) {
                    console.warn("[Sora2] last frame provided but ignored (model supports first frame only)");
                }
                const runwareHeaders = {
                    Authorization: `Bearer ${process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY}`,
                    "Content-Type": "application/json",
                };
                const uploadFrame = (imgUrl) => __awaiter(void 0, void 0, void 0, function* () {
                    const payload = [
                        {
                            taskType: "imageUpload",
                            taskUUID: (0, crypto_1.randomUUID)(),
                            image: imgUrl,
                        },
                    ];
                    const resp = yield axios_1.default.post("https://api.runware.ai/v1", payload, {
                        headers: runwareHeaders,
                        timeout: 180000,
                    });
                    const data = resp.data;
                    const obj = Array.isArray(data === null || data === void 0 ? void 0 : data.data) ? data.data[0] : data === null || data === void 0 ? void 0 : data.data;
                    return extractRunwareImageMeta(obj);
                });
                const pickDuration = () => {
                    const allowed = [4, 8, 12];
                    // Optional from request, fallback to env
                    const requestedDuration = req.body.duration !== undefined
                        ? Number(req.body.duration)
                        : Number(process.env.SORA2_DURATION);
                    if (allowed.includes(requestedDuration))
                        return requestedDuration;
                    return 8;
                };
                const duration = pickDuration();
                // Optional orientation from request, fallback to env
                const orientation = req.body.orientation ||
                    process.env.SORA2_ORIENTATION ||
                    process.env.SORA2_ASPECT ||
                    "";
                const usePortrait = /portrait|vertical|9[:x]16|720x1280/.test(orientation);
                const targetWidth = usePortrait ? 720 : 1280;
                const targetHeight = usePortrait ? 1280 : 720;
                const { providerUrl: soraReadyImageUrl } = yield ensureImageDimensionsForProvider(imageCloudUrl, feature, targetWidth, targetHeight);
                let firstUUID;
                let taskWidth = targetWidth;
                let taskHeight = targetHeight;
                try {
                    const uploadMeta = yield uploadFrame(soraReadyImageUrl);
                    firstUUID = uploadMeta.uuid;
                    taskWidth = uploadMeta.width || targetWidth;
                    taskHeight = uploadMeta.height || targetHeight;
                    console.log("[Sora2] imageUpload success", {
                        firstUUID,
                        taskWidth,
                        taskHeight,
                        uploadWidth: uploadMeta.width,
                        uploadHeight: uploadMeta.height,
                    });
                }
                catch (e) {
                    console.error("[Sora2] imageUpload failed:", ((_22 = e === null || e === void 0 ? void 0 : e.response) === null || _22 === void 0 ? void 0 : _22.data) || (e === null || e === void 0 ? void 0 : e.message) || e);
                    respondRunwareError(res, 400, "Failed to upload image to Runware (Sora 2)", ((_23 = e === null || e === void 0 ? void 0 : e.response) === null || _23 === void 0 ? void 0 : _23.data) || e);
                    return;
                }
                if (!firstUUID) {
                    res.status(400).json({
                        success: false,
                        error: "Runware imageUpload did not return imageUUID",
                    });
                    return;
                }
                const createdTaskUUID = (0, crypto_1.randomUUID)();
                const frameImages = [
                    { inputImage: firstUUID, frame: "first" },
                ];
                const task = {
                    taskType: "videoInference",
                    taskUUID: createdTaskUUID,
                    model: "openai:3@1",
                    positivePrompt: prompt,
                    duration,
                    deliveryMethod: "async",
                    frameImages,
                    width: taskWidth,
                    height: taskHeight,
                };
                console.log("[Sora2] Created task", {
                    taskUUID: createdTaskUUID,
                    duration,
                    width: taskWidth,
                    height: taskHeight,
                });
                const createResp = yield axios_1.default.post("https://api.runware.ai/v1", [task], {
                    headers: runwareHeaders,
                    timeout: 180000,
                });
                const data = createResp.data;
                const ackItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
                    ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "videoInference") ||
                        data.data[0]
                    : data === null || data === void 0 ? void 0 : data.data;
                let videoUrl = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.videoURL) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.url) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.video) ||
                    (Array.isArray(ackItem === null || ackItem === void 0 ? void 0 : ackItem.videos) ? ackItem.videos[0] : null);
                let pollTaskUUID = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID) || createdTaskUUID;
                console.log("[Sora2] Ack response", {
                    ackTaskUUID: ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID,
                    createdTaskUUID,
                    chosenPollTaskUUID: pollTaskUUID,
                    immediateVideo: !!videoUrl,
                    status: (ackItem === null || ackItem === void 0 ? void 0 : ackItem.status) || (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskStatus),
                });
                if (!videoUrl && pollTaskUUID) {
                    const maxAttempts = 120;
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    let consecutive400 = 0;
                    let switched = false;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        yield delay(3000);
                        const pollPayload = [
                            { taskType: "getResponse", taskUUID: pollTaskUUID },
                        ];
                        console.log("[Sora2] Poll attempt", {
                            attempt,
                            pollTaskUUID,
                        });
                        try {
                            const poll = yield axios_1.default.post("https://api.runware.ai/v1", pollPayload, { headers: runwareHeaders, timeout: 60000 });
                            const pd = poll.data;
                            const item = Array.isArray(pd === null || pd === void 0 ? void 0 : pd.data)
                                ? pd.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskUUID) === pollTaskUUID || (d === null || d === void 0 ? void 0 : d.videoURL)) || pd.data[0]
                                : pd === null || pd === void 0 ? void 0 : pd.data;
                            const status = (item === null || item === void 0 ? void 0 : item.status) || (item === null || item === void 0 ? void 0 : item.taskStatus);
                            if (status)
                                console.log("[Sora2] Poll status", { attempt, status });
                            if (status === "success" || (item === null || item === void 0 ? void 0 : item.videoURL) || (item === null || item === void 0 ? void 0 : item.url)) {
                                videoUrl =
                                    (item === null || item === void 0 ? void 0 : item.videoURL) ||
                                        (item === null || item === void 0 ? void 0 : item.url) ||
                                        (item === null || item === void 0 ? void 0 : item.video) ||
                                        (Array.isArray(item === null || item === void 0 ? void 0 : item.videos) ? item.videos[0] : null);
                                if (videoUrl)
                                    break;
                            }
                            if (status === "error" || status === "failed") {
                                respondRunwareError(res, 502, "Sora 2 generation failed during polling", pd);
                                return;
                            }
                            consecutive400 = 0;
                        }
                        catch (e) {
                            const statusCode = (_24 = e === null || e === void 0 ? void 0 : e.response) === null || _24 === void 0 ? void 0 : _24.status;
                            const body = (_25 = e === null || e === void 0 ? void 0 : e.response) === null || _25 === void 0 ? void 0 : _25.data;
                            console.log("[Sora2] Poll error", {
                                attempt,
                                statusCode,
                                body: typeof body === "object"
                                    ? JSON.stringify(body).slice(0, 500)
                                    : body,
                            });
                            if (statusCode === 400) {
                                consecutive400++;
                                if (!switched &&
                                    pollTaskUUID !== createdTaskUUID &&
                                    consecutive400 >= 2) {
                                    console.log("[Sora2] Switching poll UUID due to repeated 400", { from: pollTaskUUID, to: createdTaskUUID });
                                    pollTaskUUID = createdTaskUUID;
                                    switched = true;
                                    consecutive400 = 0;
                                }
                                if (consecutive400 >= 5) {
                                    respondRunwareError(res, 502, "Sora 2 polling returned repeated 400 errors", body || ((_26 = e === null || e === void 0 ? void 0 : e.response) === null || _26 === void 0 ? void 0 : _26.data) || serializeError(e));
                                    return;
                                }
                            }
                            continue;
                        }
                    }
                }
                if (!videoUrl) {
                    respondRunwareError(res, 502, "Sora 2 did not return a video URL", data);
                    return;
                }
                let soraStream;
                try {
                    soraStream = yield axios_1.default.get(videoUrl, {
                        responseType: "stream",
                        timeout: 600000,
                    });
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to download Sora 2 video",
                        details: serializeError(e),
                    });
                    return;
                }
                let uploadedSora;
                try {
                    uploadedSora = yield uploadGeneratedVideo(feature, "sora-2", soraStream.data);
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to upload Sora 2 video to S3",
                        details: serializeError(e),
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    video: {
                        url: uploadedSora.signedUrl,
                        signedUrl: uploadedSora.signedUrl,
                        key: uploadedSora.key,
                    },
                    s3Key: uploadedSora.key,
                });
                return;
            }
            catch (err) {
                console.error("Sora 2 error:", ((_27 = err === null || err === void 0 ? void 0 : err.response) === null || _27 === void 0 ? void 0 : _27.data) || err);
                respondRunwareError(res, 500, "Sora 2 generation failed", ((_28 = err === null || err === void 0 ? void 0 : err.response) === null || _28 === void 0 ? void 0 : _28.data) || err);
                return;
            }
        }
        if (isRunwareSora2Pro) {
            try {
                console.log("[Sora2Pro] Start generation", {
                    feature,
                    rawModel,
                    imageCloudUrlInitial: imageCloudUrl === null || imageCloudUrl === void 0 ? void 0 : imageCloudUrl.slice(0, 120),
                    lastFrameProvided: !!lastFrameCloudUrl,
                });
                if (!prompt || !prompt.trim()) {
                    res.status(400).json({
                        success: false,
                        error: "Prompt is required for Sora 2 Pro",
                    });
                    return;
                }
                if (lastFrameCloudUrl) {
                    console.warn("[Sora2Pro] last frame provided but ignored (model supports first frame only)");
                }
                const runwareHeaders = {
                    Authorization: `Bearer ${process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY}`,
                    "Content-Type": "application/json",
                };
                const uploadFrame = (imgUrl) => __awaiter(void 0, void 0, void 0, function* () {
                    const payload = [
                        {
                            taskType: "imageUpload",
                            taskUUID: (0, crypto_1.randomUUID)(),
                            image: imgUrl,
                        },
                    ];
                    const resp = yield axios_1.default.post("https://api.runware.ai/v1", payload, {
                        headers: runwareHeaders,
                        timeout: 180000,
                    });
                    const data = resp.data;
                    const obj = Array.isArray(data === null || data === void 0 ? void 0 : data.data) ? data.data[0] : data === null || data === void 0 ? void 0 : data.data;
                    return extractRunwareImageMeta(obj);
                });
                const allowedDurations = [4, 8, 12];
                const pickDuration = () => {
                    const envVal = Number(process.env.SORA2PRO_DURATION);
                    if (allowedDurations.includes(envVal))
                        return envVal;
                    return 12;
                };
                const duration = pickDuration();
                const combos = [
                    { width: 1280, height: 720, tag: "16:9" },
                    { width: 720, height: 1280, tag: "9:16" },
                    { width: 1792, height: 1024, tag: "7:4" },
                    { width: 1024, height: 1792, tag: "4:7" },
                ];
                const pickDims = () => {
                    const envWidth = Number(process.env.SORA2PRO_WIDTH);
                    const envHeight = Number(process.env.SORA2PRO_HEIGHT);
                    if (envWidth && envHeight) {
                        const match = combos.find((c) => c.width === envWidth && c.height === envHeight);
                        if (match)
                            return match;
                    }
                    const aspectPref = (process.env.SORA2PRO_ASPECT ||
                        process.env.SORA2PRO_ORIENTATION ||
                        process.env.SORA2_PRO_ASPECT ||
                        "").toLowerCase();
                    if (aspectPref) {
                        if (/9[:x]16|portrait|vertical/.test(aspectPref))
                            return combos[1];
                        if (/16[:x]9|landscape|horizontal/.test(aspectPref))
                            return combos[0];
                        if (/7[:x]4|1792x1024|wide/.test(aspectPref))
                            return combos[2];
                        if (/4[:x]7|1024x1792/.test(aspectPref))
                            return combos[3];
                    }
                    return combos[2];
                };
                const dims = pickDims();
                const targetWidth = dims.width;
                const targetHeight = dims.height;
                const { providerUrl: soraProReadyImageUrl } = yield ensureImageDimensionsForProvider(imageCloudUrl, feature, targetWidth, targetHeight);
                let firstUUID;
                let taskWidth = targetWidth;
                let taskHeight = targetHeight;
                try {
                    const uploadMeta = yield uploadFrame(soraProReadyImageUrl);
                    firstUUID = uploadMeta.uuid;
                    taskWidth = uploadMeta.width || targetWidth;
                    taskHeight = uploadMeta.height || targetHeight;
                    console.log("[Sora2Pro] imageUpload success", {
                        firstUUID,
                        taskWidth,
                        taskHeight,
                        uploadWidth: uploadMeta.width,
                        uploadHeight: uploadMeta.height,
                    });
                }
                catch (e) {
                    console.error("[Sora2Pro] imageUpload failed:", ((_29 = e === null || e === void 0 ? void 0 : e.response) === null || _29 === void 0 ? void 0 : _29.data) || (e === null || e === void 0 ? void 0 : e.message) || e);
                    respondRunwareError(res, 400, "Failed to upload image to Runware (Sora 2 Pro)", ((_30 = e === null || e === void 0 ? void 0 : e.response) === null || _30 === void 0 ? void 0 : _30.data) || e);
                    return;
                }
                if (!firstUUID) {
                    res.status(400).json({
                        success: false,
                        error: "Runware imageUpload did not return imageUUID",
                    });
                    return;
                }
                const createdTaskUUID = (0, crypto_1.randomUUID)();
                const frameImages = [
                    { inputImage: firstUUID, frame: "first" },
                ];
                const task = {
                    taskType: "videoInference",
                    taskUUID: createdTaskUUID,
                    model: "openai:3@2",
                    positivePrompt: prompt,
                    duration,
                    width: taskWidth,
                    height: taskHeight,
                    deliveryMethod: "async",
                    frameImages,
                };
                console.log("[Sora2Pro] Created task", {
                    taskUUID: createdTaskUUID,
                    duration,
                    width: taskWidth,
                    height: taskHeight,
                });
                const createResp = yield axios_1.default.post("https://api.runware.ai/v1", [task], {
                    headers: runwareHeaders,
                    timeout: 180000,
                });
                const data = createResp.data;
                const ackItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
                    ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "videoInference") ||
                        data.data[0]
                    : data === null || data === void 0 ? void 0 : data.data;
                let videoUrl = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.videoURL) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.url) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.video) ||
                    (Array.isArray(ackItem === null || ackItem === void 0 ? void 0 : ackItem.videos) ? ackItem.videos[0] : null);
                let pollTaskUUID = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID) || createdTaskUUID;
                console.log("[Sora2Pro] Ack response", {
                    ackTaskUUID: ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID,
                    createdTaskUUID,
                    chosenPollTaskUUID: pollTaskUUID,
                    immediateVideo: !!videoUrl,
                    status: (ackItem === null || ackItem === void 0 ? void 0 : ackItem.status) || (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskStatus),
                });
                if (!videoUrl && pollTaskUUID) {
                    const maxAttempts = 120;
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    let consecutive400 = 0;
                    let switched = false;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        yield delay(3000);
                        const pollPayload = [
                            { taskType: "getResponse", taskUUID: pollTaskUUID },
                        ];
                        console.log("[Sora2Pro] Poll attempt", {
                            attempt,
                            pollTaskUUID,
                        });
                        try {
                            const poll = yield axios_1.default.post("https://api.runware.ai/v1", pollPayload, { headers: runwareHeaders, timeout: 60000 });
                            const pd = poll.data;
                            const item = Array.isArray(pd === null || pd === void 0 ? void 0 : pd.data)
                                ? pd.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskUUID) === pollTaskUUID || (d === null || d === void 0 ? void 0 : d.videoURL)) || pd.data[0]
                                : pd === null || pd === void 0 ? void 0 : pd.data;
                            const status = (item === null || item === void 0 ? void 0 : item.status) || (item === null || item === void 0 ? void 0 : item.taskStatus);
                            if (status)
                                console.log("[Sora2Pro] Poll status", { attempt, status });
                            if (status === "success" || (item === null || item === void 0 ? void 0 : item.videoURL) || (item === null || item === void 0 ? void 0 : item.url)) {
                                videoUrl =
                                    (item === null || item === void 0 ? void 0 : item.videoURL) ||
                                        (item === null || item === void 0 ? void 0 : item.url) ||
                                        (item === null || item === void 0 ? void 0 : item.video) ||
                                        (Array.isArray(item === null || item === void 0 ? void 0 : item.videos) ? item.videos[0] : null);
                                if (videoUrl)
                                    break;
                            }
                            if (status === "error" || status === "failed") {
                                respondRunwareError(res, 502, "Sora 2 Pro generation failed during polling", pd);
                                return;
                            }
                            consecutive400 = 0;
                        }
                        catch (e) {
                            const statusCode = (_31 = e === null || e === void 0 ? void 0 : e.response) === null || _31 === void 0 ? void 0 : _31.status;
                            const body = (_32 = e === null || e === void 0 ? void 0 : e.response) === null || _32 === void 0 ? void 0 : _32.data;
                            console.log("[Sora2Pro] Poll error", {
                                attempt,
                                statusCode,
                                body: typeof body === "object"
                                    ? JSON.stringify(body).slice(0, 500)
                                    : body,
                            });
                            if (statusCode === 400) {
                                consecutive400++;
                                if (!switched &&
                                    pollTaskUUID !== createdTaskUUID &&
                                    consecutive400 >= 2) {
                                    console.log("[Sora2Pro] Switching poll UUID due to repeated 400", { from: pollTaskUUID, to: createdTaskUUID });
                                    pollTaskUUID = createdTaskUUID;
                                    switched = true;
                                    consecutive400 = 0;
                                }
                                if (consecutive400 >= 5) {
                                    respondRunwareError(res, 502, "Sora 2 Pro polling returned repeated 400 errors", body || ((_33 = e === null || e === void 0 ? void 0 : e.response) === null || _33 === void 0 ? void 0 : _33.data) || e);
                                    return;
                                }
                            }
                            continue;
                        }
                    }
                }
                if (!videoUrl) {
                    respondRunwareError(res, 502, "Sora 2 Pro did not return a video URL", data);
                    return;
                }
                let soraProStream;
                try {
                    soraProStream = yield axios_1.default.get(videoUrl, {
                        responseType: "stream",
                        timeout: 600000,
                    });
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to download Sora 2 Pro video",
                        details: serializeError(e),
                    });
                    return;
                }
                let uploadedSoraPro;
                try {
                    uploadedSoraPro = yield uploadGeneratedVideo(feature, "sora-2-pro", soraProStream.data);
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to upload Sora 2 Pro video to S3",
                        details: serializeError(e),
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    video: {
                        url: uploadedSoraPro.signedUrl,
                        signedUrl: uploadedSoraPro.signedUrl,
                        key: uploadedSoraPro.key,
                    },
                    s3Key: uploadedSoraPro.key,
                });
                return;
            }
            catch (err) {
                console.error("Sora 2 Pro error:", ((_34 = err === null || err === void 0 ? void 0 : err.response) === null || _34 === void 0 ? void 0 : _34.data) || err);
                const providerErr = extractRunwareError((_35 = err === null || err === void 0 ? void 0 : err.response) === null || _35 === void 0 ? void 0 : _35.data);
                res.status(500).json({
                    success: false,
                    error: "Sora 2 Pro generation failed",
                    details: (providerErr === null || providerErr === void 0 ? void 0 : providerErr.responseContent) || serializeError(err),
                    providerError: providerErr,
                });
                return;
            }
        }
        if (isRunwareHailuo23Fast) {
            try {
                console.log("[Hailuo2.3Fast] Start generation", {
                    feature,
                    rawModel,
                    imageCloudUrlInitial: imageCloudUrl === null || imageCloudUrl === void 0 ? void 0 : imageCloudUrl.slice(0, 120),
                    lastFrameProvided: !!lastFrameCloudUrl,
                });
                if (lastFrameCloudUrl) {
                    console.warn("[Hailuo2.3Fast] last frame provided but ignored (model uses first frame only)");
                }
                const runwareHeaders = {
                    Authorization: `Bearer ${process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY}`,
                    "Content-Type": "application/json",
                };
                const uploadFrame = (imgUrl) => __awaiter(void 0, void 0, void 0, function* () {
                    const payload = [
                        {
                            taskType: "imageUpload",
                            taskUUID: (0, crypto_1.randomUUID)(),
                            image: imgUrl,
                        },
                    ];
                    const resp = yield axios_1.default.post("https://api.runware.ai/v1", payload, {
                        headers: runwareHeaders,
                        timeout: 180000,
                    });
                    const data = resp.data;
                    const obj = Array.isArray(data === null || data === void 0 ? void 0 : data.data) ? data.data[0] : data === null || data === void 0 ? void 0 : data.data;
                    return (obj === null || obj === void 0 ? void 0 : obj.imageUUID) || (obj === null || obj === void 0 ? void 0 : obj.imageUuid);
                });
                let firstUUID;
                try {
                    firstUUID = yield uploadFrame(imageCloudUrl);
                    console.log("[Hailuo2.3Fast] imageUpload success", { firstUUID });
                }
                catch (e) {
                    console.error("[Hailuo2.3Fast] imageUpload failed:", ((_36 = e === null || e === void 0 ? void 0 : e.response) === null || _36 === void 0 ? void 0 : _36.data) || (e === null || e === void 0 ? void 0 : e.message) || e);
                    respondRunwareError(res, 400, "Failed to upload image to Runware (Hailuo 2.3 Fast)", ((_37 = e === null || e === void 0 ? void 0 : e.response) === null || _37 === void 0 ? void 0 : _37.data) || e);
                    return;
                }
                if (!firstUUID) {
                    res.status(400).json({
                        success: false,
                        error: "Runware imageUpload did not return imageUUID",
                    });
                    return;
                }
                const allowedDurations = [6, 10];
                const requestedDuration = Number(process.env.HAILUO23_FAST_DURATION);
                const duration = allowedDurations.includes(requestedDuration)
                    ? requestedDuration
                    : 6;
                if (duration === 10) {
                    console.log("[Hailuo2.3Fast] Using 10s duration – ensure input frame is 1366x768 per Runware docs");
                }
                const promptOptimizer = String(process.env.HAILUO23_FAST_PROMPT_OPTIMIZER || "false") ===
                    "true";
                const createdTaskUUID = (0, crypto_1.randomUUID)();
                const frameImages = [
                    { inputImage: firstUUID, frame: "first" },
                ];
                const providerSettings = {};
                if (promptOptimizer) {
                    providerSettings.minimax = { promptOptimizer: true };
                }
                const task = {
                    taskType: "videoInference",
                    taskUUID: createdTaskUUID,
                    model: "minimax:4@2",
                    positivePrompt: prompt || "",
                    duration,
                    deliveryMethod: "async",
                    frameImages,
                };
                if (Object.keys(providerSettings).length > 0) {
                    task.providerSettings = providerSettings;
                }
                console.log("[Hailuo2.3Fast] Created task", {
                    taskUUID: createdTaskUUID,
                    duration,
                    promptOptimizer,
                });
                const createResp = yield axios_1.default.post("https://api.runware.ai/v1", [task], {
                    headers: runwareHeaders,
                    timeout: 180000,
                });
                const data = createResp.data;
                const ackItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
                    ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "videoInference") ||
                        data.data[0]
                    : data === null || data === void 0 ? void 0 : data.data;
                let videoUrl = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.videoURL) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.url) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.video) ||
                    (Array.isArray(ackItem === null || ackItem === void 0 ? void 0 : ackItem.videos) ? ackItem.videos[0] : null);
                let pollTaskUUID = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID) || createdTaskUUID;
                console.log("[Hailuo2.3Fast] Ack response", {
                    ackTaskUUID: ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID,
                    createdTaskUUID,
                    chosenPollTaskUUID: pollTaskUUID,
                    immediateVideo: !!videoUrl,
                    status: (ackItem === null || ackItem === void 0 ? void 0 : ackItem.status) || (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskStatus),
                });
                if (!videoUrl && pollTaskUUID) {
                    const maxAttempts = 100;
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    let consecutive400 = 0;
                    let switched = false;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        yield delay(3000);
                        const pollPayload = [
                            { taskType: "getResponse", taskUUID: pollTaskUUID },
                        ];
                        console.log("[Hailuo2.3Fast] Poll attempt", {
                            attempt,
                            pollTaskUUID,
                        });
                        try {
                            const poll = yield axios_1.default.post("https://api.runware.ai/v1", pollPayload, { headers: runwareHeaders, timeout: 60000 });
                            const pd = poll.data;
                            const item = Array.isArray(pd === null || pd === void 0 ? void 0 : pd.data)
                                ? pd.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskUUID) === pollTaskUUID || (d === null || d === void 0 ? void 0 : d.videoURL)) || pd.data[0]
                                : pd === null || pd === void 0 ? void 0 : pd.data;
                            const status = (item === null || item === void 0 ? void 0 : item.status) || (item === null || item === void 0 ? void 0 : item.taskStatus);
                            if (status)
                                console.log("[Hailuo2.3Fast] Poll status", {
                                    attempt,
                                    status,
                                });
                            if (status === "success" || (item === null || item === void 0 ? void 0 : item.videoURL) || (item === null || item === void 0 ? void 0 : item.url)) {
                                videoUrl =
                                    (item === null || item === void 0 ? void 0 : item.videoURL) ||
                                        (item === null || item === void 0 ? void 0 : item.url) ||
                                        (item === null || item === void 0 ? void 0 : item.video) ||
                                        (Array.isArray(item === null || item === void 0 ? void 0 : item.videos) ? item.videos[0] : null);
                                if (videoUrl)
                                    break;
                            }
                            if (status === "error" || status === "failed") {
                                respondRunwareError(res, 502, "Hailuo 2.3 Fast generation failed during polling", pd);
                                return;
                            }
                            consecutive400 = 0;
                        }
                        catch (e) {
                            const statusCode = (_38 = e === null || e === void 0 ? void 0 : e.response) === null || _38 === void 0 ? void 0 : _38.status;
                            const body = (_39 = e === null || e === void 0 ? void 0 : e.response) === null || _39 === void 0 ? void 0 : _39.data;
                            console.log("[Hailuo2.3Fast] Poll error", {
                                attempt,
                                statusCode,
                                body: typeof body === "object"
                                    ? JSON.stringify(body).slice(0, 500)
                                    : body,
                            });
                            if (statusCode === 400) {
                                consecutive400++;
                                if (!switched &&
                                    pollTaskUUID !== createdTaskUUID &&
                                    consecutive400 >= 2) {
                                    console.log("[Hailuo2.3Fast] Switching poll UUID due to repeated 400", { from: pollTaskUUID, to: createdTaskUUID });
                                    pollTaskUUID = createdTaskUUID;
                                    switched = true;
                                    consecutive400 = 0;
                                }
                                if (consecutive400 >= 5) {
                                    respondRunwareError(res, 502, "Hailuo 2.3 Fast polling returned repeated 400 errors", body || ((_40 = e === null || e === void 0 ? void 0 : e.response) === null || _40 === void 0 ? void 0 : _40.data) || e);
                                    return;
                                }
                            }
                            continue;
                        }
                    }
                }
                if (!videoUrl) {
                    respondRunwareError(res, 502, "Hailuo 2.3 Fast did not return a video URL", data);
                    return;
                }
                let hailuoFastStream;
                try {
                    hailuoFastStream = yield axios_1.default.get(videoUrl, {
                        responseType: "stream",
                        timeout: 600000,
                    });
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to download Hailuo 2.3 Fast video",
                        details: serializeError(e),
                    });
                    return;
                }
                let uploadedFast;
                try {
                    uploadedFast = yield uploadGeneratedVideo(feature, "hailuo-2-3-fast", hailuoFastStream.data);
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to upload Hailuo 2.3 Fast video to S3",
                        details: serializeError(e),
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    video: {
                        url: uploadedFast.signedUrl,
                        signedUrl: uploadedFast.signedUrl,
                        key: uploadedFast.key,
                    },
                    s3Key: uploadedFast.key,
                });
                return;
            }
            catch (err) {
                console.error("Hailuo 2.3 Fast error:", ((_41 = err === null || err === void 0 ? void 0 : err.response) === null || _41 === void 0 ? void 0 : _41.data) || err);
                res.status(500).json({
                    success: false,
                    error: "Hailuo 2.3 Fast generation failed",
                    details: serializeError(err),
                });
                return;
            }
        }
        if (isRunwareHailuo23) {
            try {
                console.log("[Hailuo2.3] Start generation", {
                    feature,
                    rawModel,
                    imageCloudUrlInitial: imageCloudUrl === null || imageCloudUrl === void 0 ? void 0 : imageCloudUrl.slice(0, 120),
                    lastFrameProvided: !!lastFrameCloudUrl,
                });
                if (lastFrameCloudUrl) {
                    console.warn("[Hailuo2.3] last frame provided but ignored (model uses first frame only)");
                }
                const runwareHeaders = {
                    Authorization: `Bearer ${process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY}`,
                    "Content-Type": "application/json",
                };
                const uploadFrame = (imgUrl) => __awaiter(void 0, void 0, void 0, function* () {
                    const payload = [
                        {
                            taskType: "imageUpload",
                            taskUUID: (0, crypto_1.randomUUID)(),
                            image: imgUrl,
                        },
                    ];
                    const resp = yield axios_1.default.post("https://api.runware.ai/v1", payload, {
                        headers: runwareHeaders,
                        timeout: 180000,
                    });
                    const data = resp.data;
                    const obj = Array.isArray(data === null || data === void 0 ? void 0 : data.data) ? data.data[0] : data === null || data === void 0 ? void 0 : data.data;
                    return (obj === null || obj === void 0 ? void 0 : obj.imageUUID) || (obj === null || obj === void 0 ? void 0 : obj.imageUuid);
                });
                let firstUUID;
                try {
                    firstUUID = yield uploadFrame(imageCloudUrl);
                    console.log("[Hailuo2.3] imageUpload success", { firstUUID });
                }
                catch (e) {
                    console.error("[Hailuo2.3] imageUpload failed:", ((_42 = e === null || e === void 0 ? void 0 : e.response) === null || _42 === void 0 ? void 0 : _42.data) || (e === null || e === void 0 ? void 0 : e.message) || e);
                    respondRunwareError(res, 400, "Failed to upload image to Runware (Hailuo 2.3)", ((_43 = e === null || e === void 0 ? void 0 : e.response) === null || _43 === void 0 ? void 0 : _43.data) || e);
                    return;
                }
                if (!firstUUID) {
                    res.status(400).json({
                        success: false,
                        error: "Runware imageUpload did not return imageUUID",
                    });
                    return;
                }
                const allowedDurations = [6, 10];
                // Optional from request, fallback to env
                const requestedDuration = req.body.duration !== undefined
                    ? Number(req.body.duration)
                    : Number(process.env.HAILUO23_DURATION);
                const duration = allowedDurations.includes(requestedDuration)
                    ? requestedDuration
                    : 6;
                if (duration === 10) {
                    console.log("[Hailuo2.3] Using 10s duration – ensure source frame is 1366x768 per Runware docs");
                }
                // Optional prompt optimizer from request, fallback to env
                const promptOptimizer = req.body.promptOptimizer !== undefined
                    ? Boolean(req.body.promptOptimizer)
                    : String(process.env.HAILUO23_PROMPT_OPTIMIZER || "false") ===
                        "true";
                const createdTaskUUID = (0, crypto_1.randomUUID)();
                const frameImages = [
                    { inputImage: firstUUID, frame: "first" },
                ];
                const providerSettings = {};
                if (promptOptimizer) {
                    providerSettings.minimax = { promptOptimizer: true };
                }
                const task = {
                    taskType: "videoInference",
                    taskUUID: createdTaskUUID,
                    model: "minimax:4@1",
                    positivePrompt: prompt || "",
                    duration,
                    deliveryMethod: "async",
                    frameImages,
                };
                if (Object.keys(providerSettings).length > 0) {
                    task.providerSettings = providerSettings;
                }
                console.log("[Hailuo2.3] Created task", {
                    taskUUID: createdTaskUUID,
                    duration,
                    promptOptimizer,
                });
                const createResp = yield axios_1.default.post("https://api.runware.ai/v1", [task], {
                    headers: runwareHeaders,
                    timeout: 180000,
                });
                const data = createResp.data;
                const ackItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
                    ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "videoInference") ||
                        data.data[0]
                    : data === null || data === void 0 ? void 0 : data.data;
                let videoUrl = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.videoURL) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.url) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.video) ||
                    (Array.isArray(ackItem === null || ackItem === void 0 ? void 0 : ackItem.videos) ? ackItem.videos[0] : null);
                let pollTaskUUID = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID) || createdTaskUUID;
                console.log("[Hailuo2.3] Ack response", {
                    ackTaskUUID: ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID,
                    createdTaskUUID,
                    chosenPollTaskUUID: pollTaskUUID,
                    immediateVideo: !!videoUrl,
                    status: (ackItem === null || ackItem === void 0 ? void 0 : ackItem.status) || (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskStatus),
                });
                if (!videoUrl && pollTaskUUID) {
                    const maxAttempts = 100;
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    let consecutive400 = 0;
                    let switched = false;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        yield delay(3000);
                        const pollPayload = [
                            { taskType: "getResponse", taskUUID: pollTaskUUID },
                        ];
                        console.log("[Hailuo2.3] Poll attempt", {
                            attempt,
                            pollTaskUUID,
                        });
                        try {
                            const poll = yield axios_1.default.post("https://api.runware.ai/v1", pollPayload, { headers: runwareHeaders, timeout: 60000 });
                            const pd = poll.data;
                            const item = Array.isArray(pd === null || pd === void 0 ? void 0 : pd.data)
                                ? pd.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskUUID) === pollTaskUUID || (d === null || d === void 0 ? void 0 : d.videoURL)) || pd.data[0]
                                : pd === null || pd === void 0 ? void 0 : pd.data;
                            const status = (item === null || item === void 0 ? void 0 : item.status) || (item === null || item === void 0 ? void 0 : item.taskStatus);
                            if (status)
                                console.log("[Hailuo2.3] Poll status", { attempt, status });
                            if (status === "success" || (item === null || item === void 0 ? void 0 : item.videoURL) || (item === null || item === void 0 ? void 0 : item.url)) {
                                videoUrl =
                                    (item === null || item === void 0 ? void 0 : item.videoURL) ||
                                        (item === null || item === void 0 ? void 0 : item.url) ||
                                        (item === null || item === void 0 ? void 0 : item.video) ||
                                        (Array.isArray(item === null || item === void 0 ? void 0 : item.videos) ? item.videos[0] : null);
                                if (videoUrl)
                                    break;
                            }
                            if (status === "error" || status === "failed") {
                                respondRunwareError(res, 502, "Hailuo 2.3 generation failed during polling", pd);
                                return;
                            }
                            consecutive400 = 0;
                        }
                        catch (e) {
                            const statusCode = (_44 = e === null || e === void 0 ? void 0 : e.response) === null || _44 === void 0 ? void 0 : _44.status;
                            const body = (_45 = e === null || e === void 0 ? void 0 : e.response) === null || _45 === void 0 ? void 0 : _45.data;
                            console.log("[Hailuo2.3] Poll error", {
                                attempt,
                                statusCode,
                                body: typeof body === "object"
                                    ? JSON.stringify(body).slice(0, 500)
                                    : body,
                            });
                            if (statusCode === 400) {
                                consecutive400++;
                                if (!switched &&
                                    pollTaskUUID !== createdTaskUUID &&
                                    consecutive400 >= 2) {
                                    console.log("[Hailuo2.3] Switching poll UUID due to repeated 400", { from: pollTaskUUID, to: createdTaskUUID });
                                    pollTaskUUID = createdTaskUUID;
                                    switched = true;
                                    consecutive400 = 0;
                                }
                                if (consecutive400 >= 5) {
                                    respondRunwareError(res, 502, "Hailuo 2.3 polling returned repeated 400 errors", body || ((_46 = e === null || e === void 0 ? void 0 : e.response) === null || _46 === void 0 ? void 0 : _46.data) || e);
                                    return;
                                }
                            }
                            continue;
                        }
                    }
                }
                if (!videoUrl) {
                    respondRunwareError(res, 502, "Hailuo 2.3 did not return a video URL", data);
                    return;
                }
                let hailuoStream;
                try {
                    hailuoStream = yield axios_1.default.get(videoUrl, {
                        responseType: "stream",
                        timeout: 600000,
                    });
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to download Hailuo 2.3 video",
                        details: serializeError(e),
                    });
                    return;
                }
                let uploaded;
                try {
                    uploaded = yield uploadGeneratedVideo(feature, "hailuo-2-3", hailuoStream.data);
                }
                catch (e) {
                    res.status(500).json({
                        success: false,
                        error: "Failed to upload Hailuo 2.3 video to S3",
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
            }
            catch (err) {
                console.error("Hailuo 2.3 error:", ((_47 = err === null || err === void 0 ? void 0 : err.response) === null || _47 === void 0 ? void 0 : _47.data) || err);
                res.status(500).json({
                    success: false,
                    error: "Hailuo 2.3 generation failed",
                    details: serializeError(err),
                });
                return;
            }
        }
        // Runware ControlNet XL Video (Image-to-Video)
        if (isRunwareControlNetXL) {
            try {
                console.log("[ControlNet XL Video] Start generation", {
                    feature,
                    rawModel,
                    imageCloudUrlInitial: imageCloudUrl === null || imageCloudUrl === void 0 ? void 0 : imageCloudUrl.slice(0, 120),
                });
                const runwareHeaders = {
                    Authorization: `Bearer ${process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY}`,
                    "Content-Type": "application/json",
                };
                // 1) Upload first frame image to get imageUUID
                const uploadPayload = [
                    {
                        taskType: "imageUpload",
                        taskUUID: (0, crypto_1.randomUUID)(),
                        image: imageCloudUrl,
                    },
                ];
                let firstUUID;
                try {
                    const up = yield axios_1.default.post("https://api.runware.ai/v1", uploadPayload, { headers: runwareHeaders, timeout: 180000 });
                    const d = up.data;
                    const obj = Array.isArray(d === null || d === void 0 ? void 0 : d.data) ? d.data[0] : d === null || d === void 0 ? void 0 : d.data;
                    firstUUID = (obj === null || obj === void 0 ? void 0 : obj.imageUUID) || (obj === null || obj === void 0 ? void 0 : obj.imageUuid);
                    console.log("[ControlNet XL Video] imageUpload success", {
                        firstUUID,
                    });
                }
                catch (e) {
                    console.error("Runware ControlNet XL Video imageUpload failed:", ((_48 = e === null || e === void 0 ? void 0 : e.response) === null || _48 === void 0 ? void 0 : _48.data) || (e === null || e === void 0 ? void 0 : e.message) || e);
                    respondRunwareError(res, 400, "Failed to upload image to Runware (ControlNet XL Video)", ((_49 = e === null || e === void 0 ? void 0 : e.response) === null || _49 === void 0 ? void 0 : _49.data) || e);
                    return;
                }
                if (!firstUUID) {
                    res.status(400).json({
                        success: false,
                        error: "Runware imageUpload did not return imageUUID",
                    });
                    return;
                }
                // 2) Create videoInference task for ControlNet XL Video
                const taskUUIDCreated = (0, crypto_1.randomUUID)();
                const task = {
                    taskType: "videoInference",
                    taskUUID: taskUUIDCreated,
                    model: "civitai:136070@267493",
                    positivePrompt: prompt || "",
                    width: 512,
                    height: 512,
                    duration: 4,
                    deliveryMethod: "async",
                    frameImages: [{ inputImage: firstUUID, frame: "first" }],
                };
                console.log("[ControlNet XL Video] Created task", {
                    taskUUID: taskUUIDCreated,
                    width: 512,
                    height: 512,
                    duration: 4,
                });
                const createResp = yield axios_1.default.post("https://api.runware.ai/v1", [task], { headers: runwareHeaders, timeout: 180000 });
                const createData = createResp.data;
                const ackItem = Array.isArray(createData === null || createData === void 0 ? void 0 : createData.data)
                    ? createData.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "videoInference") || createData.data[0]
                    : createData === null || createData === void 0 ? void 0 : createData.data;
                let videoUrl = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.videoURL) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.url) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.video) ||
                    (Array.isArray(ackItem === null || ackItem === void 0 ? void 0 : ackItem.videos) ? ackItem.videos[0] : null);
                let pollTaskUUID = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID) || taskUUIDCreated;
                console.log("[ControlNet XL Video] Ack response", {
                    ackTaskUUID: ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID,
                    createdTaskUUID: taskUUIDCreated,
                    chosenPollTaskUUID: pollTaskUUID,
                    immediateVideo: !!videoUrl,
                    status: (ackItem === null || ackItem === void 0 ? void 0 : ackItem.status) || (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskStatus),
                });
                // 3) Poll if no immediate URL
                if (!videoUrl && pollTaskUUID) {
                    const maxAttempts = 100; // ~5 min
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    let consecutive400 = 0;
                    let switchedToCreated = false;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        yield delay(3000);
                        const pollPayload = [
                            { taskType: "getResponse", taskUUID: pollTaskUUID },
                        ];
                        console.log("[ControlNet XL Video] Poll attempt", {
                            attempt,
                            pollPayload: pollPayload[0],
                        });
                        try {
                            const poll = yield axios_1.default.post("https://api.runware.ai/v1", pollPayload, { headers: runwareHeaders, timeout: 60000 });
                            const pd = poll.data;
                            const item = Array.isArray(pd === null || pd === void 0 ? void 0 : pd.data)
                                ? pd.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskUUID) === pollTaskUUID || (d === null || d === void 0 ? void 0 : d.videoURL)) || pd.data[0]
                                : pd === null || pd === void 0 ? void 0 : pd.data;
                            const status = (item === null || item === void 0 ? void 0 : item.status) || (item === null || item === void 0 ? void 0 : item.taskStatus);
                            if (status)
                                console.log("[ControlNet XL Video] Poll status", {
                                    attempt,
                                    status,
                                });
                            if (status === "success" || (item === null || item === void 0 ? void 0 : item.videoURL) || (item === null || item === void 0 ? void 0 : item.url)) {
                                videoUrl =
                                    (item === null || item === void 0 ? void 0 : item.videoURL) ||
                                        (item === null || item === void 0 ? void 0 : item.url) ||
                                        (item === null || item === void 0 ? void 0 : item.video) ||
                                        (Array.isArray(item === null || item === void 0 ? void 0 : item.videos) ? item.videos[0] : null);
                                if (videoUrl)
                                    break;
                            }
                            if (status === "error" || status === "failed") {
                                respondRunwareError(res, 502, "Runware ControlNet XL Video generation failed during polling", pd);
                                return;
                            }
                            consecutive400 = 0; // reset on successful poll
                        }
                        catch (e) {
                            const statusCode = (_50 = e === null || e === void 0 ? void 0 : e.response) === null || _50 === void 0 ? void 0 : _50.status;
                            const body = (_51 = e === null || e === void 0 ? void 0 : e.response) === null || _51 === void 0 ? void 0 : _51.data;
                            console.log("[ControlNet XL Video] Poll error", {
                                attempt,
                                statusCode,
                                body: typeof body === "object"
                                    ? JSON.stringify(body).slice(0, 500)
                                    : body,
                            });
                            if (statusCode === 400) {
                                consecutive400++;
                                // If repeated 400 and ack UUID differs, try switching to created taskUUID once
                                if (!switchedToCreated &&
                                    pollTaskUUID !== taskUUIDCreated &&
                                    consecutive400 >= 2) {
                                    console.log("[ControlNet XL Video] Switching to created taskUUID due to repeated 400", { from: pollTaskUUID, to: taskUUIDCreated });
                                    pollTaskUUID = taskUUIDCreated;
                                    switchedToCreated = true;
                                    consecutive400 = 0;
                                }
                                if (consecutive400 >= 5) {
                                    respondRunwareError(res, 502, "Runware ControlNet XL Video polling returned repeated 400 errors", body || ((_52 = e === null || e === void 0 ? void 0 : e.response) === null || _52 === void 0 ? void 0 : _52.data) || e);
                                    return;
                                }
                            }
                            continue;
                        }
                    }
                }
                if (!videoUrl) {
                    console.log("[ControlNet XL Video] Timeout - no video URL returned after polling");
                    respondRunwareError(res, 502, "Runware ControlNet XL Video did not return a video URL (timeout or missing)", createData);
                    return;
                }
                // 4) Download and upload to S3
                let rwStream;
                try {
                    rwStream = yield axios_1.default.get(videoUrl, {
                        responseType: "stream",
                        timeout: 600000,
                    });
                    console.log("[ControlNet XL Video] Download started");
                }
                catch (e) {
                    console.log("[ControlNet XL Video] Download error", {
                        error: serializeError(e),
                    });
                    res.status(500).json({
                        success: false,
                        error: "Failed to download ControlNet XL Video",
                        details: serializeError(e),
                    });
                    return;
                }
                let uploaded;
                try {
                    uploaded = yield uploadGeneratedVideo(feature, "controlnet-xl-video", rwStream.data, videoType);
                    console.log("[ControlNet XL Video] S3 upload success", {
                        key: uploaded.key,
                    });
                }
                catch (e) {
                    console.log("[ControlNet XL Video] S3 upload error", {
                        error: serializeError(e),
                    });
                    res.status(500).json({
                        success: false,
                        error: "Failed to upload ControlNet XL Video to S3",
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
            }
            catch (err) {
                console.error("Runware ControlNet XL Video error:", ((_53 = err === null || err === void 0 ? void 0 : err.response) === null || _53 === void 0 ? void 0 : _53.data) || err);
                res.status(500).json({
                    success: false,
                    error: "ControlNet XL Video generation failed",
                    details: serializeError(err),
                });
                return;
            }
        }
        // Runware Claymotion F1 (Image-to-Video)
        if (isRunwareClaymotionF1) {
            try {
                console.log("[Claymotion F1] Start generation", {
                    feature,
                    rawModel,
                    imageCloudUrlInitial: imageCloudUrl === null || imageCloudUrl === void 0 ? void 0 : imageCloudUrl.slice(0, 120),
                });
                const runwareHeaders = {
                    Authorization: `Bearer ${process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY}`,
                    "Content-Type": "application/json",
                };
                // 1) Upload first frame image to get imageUUID
                const uploadPayload = [
                    {
                        taskType: "imageUpload",
                        taskUUID: (0, crypto_1.randomUUID)(),
                        image: imageCloudUrl,
                    },
                ];
                let firstUUID;
                try {
                    const up = yield axios_1.default.post("https://api.runware.ai/v1", uploadPayload, { headers: runwareHeaders, timeout: 180000 });
                    const d = up.data;
                    const obj = Array.isArray(d === null || d === void 0 ? void 0 : d.data) ? d.data[0] : d === null || d === void 0 ? void 0 : d.data;
                    firstUUID = (obj === null || obj === void 0 ? void 0 : obj.imageUUID) || (obj === null || obj === void 0 ? void 0 : obj.imageUuid);
                    console.log("[Claymotion F1] imageUpload success", { firstUUID });
                }
                catch (e) {
                    console.error("Runware Claymotion F1 imageUpload failed:", ((_54 = e === null || e === void 0 ? void 0 : e.response) === null || _54 === void 0 ? void 0 : _54.data) || (e === null || e === void 0 ? void 0 : e.message) || e);
                    respondRunwareError(res, 400, "Failed to upload image to Runware (Claymotion F1)", ((_55 = e === null || e === void 0 ? void 0 : e.response) === null || _55 === void 0 ? void 0 : _55.data) || e);
                    return;
                }
                if (!firstUUID) {
                    res.status(400).json({
                        success: false,
                        error: "Runware imageUpload did not return imageUUID",
                    });
                    return;
                }
                // 2) Create videoInference task for Claymotion F1
                const taskUUIDCreated = (0, crypto_1.randomUUID)();
                const task = {
                    taskType: "videoInference",
                    taskUUID: taskUUIDCreated,
                    model: "civitai:855822@957548",
                    positivePrompt: prompt || "",
                    width: 512,
                    height: 512,
                    duration: 4,
                    deliveryMethod: "async",
                    frameImages: [{ inputImage: firstUUID, frame: "first" }],
                };
                console.log("[Claymotion F1] Created task", {
                    taskUUID: taskUUIDCreated,
                    width: 512,
                    height: 512,
                    duration: 4,
                });
                const createResp = yield axios_1.default.post("https://api.runware.ai/v1", [task], { headers: runwareHeaders, timeout: 180000 });
                const createData = createResp.data;
                const ackItem = Array.isArray(createData === null || createData === void 0 ? void 0 : createData.data)
                    ? createData.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "videoInference") || createData.data[0]
                    : createData === null || createData === void 0 ? void 0 : createData.data;
                let videoUrl = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.videoURL) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.url) ||
                    (ackItem === null || ackItem === void 0 ? void 0 : ackItem.video) ||
                    (Array.isArray(ackItem === null || ackItem === void 0 ? void 0 : ackItem.videos) ? ackItem.videos[0] : null);
                let pollTaskUUID = (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID) || taskUUIDCreated;
                console.log("[Claymotion F1] Ack response", {
                    ackTaskUUID: ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskUUID,
                    createdTaskUUID: taskUUIDCreated,
                    chosenPollTaskUUID: pollTaskUUID,
                    immediateVideo: !!videoUrl,
                    status: (ackItem === null || ackItem === void 0 ? void 0 : ackItem.status) || (ackItem === null || ackItem === void 0 ? void 0 : ackItem.taskStatus),
                });
                // 3) Poll if no immediate URL
                if (!videoUrl && pollTaskUUID) {
                    const maxAttempts = 100; // ~5 min
                    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                    let consecutive400 = 0;
                    let switchedToCreated = false;
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        yield delay(3000);
                        const pollPayload = [
                            { taskType: "getResponse", taskUUID: pollTaskUUID },
                        ];
                        console.log("[Claymotion F1] Poll attempt", {
                            attempt,
                            pollPayload: pollPayload[0],
                        });
                        try {
                            const poll = yield axios_1.default.post("https://api.runware.ai/v1", pollPayload, { headers: runwareHeaders, timeout: 60000 });
                            const pd = poll.data;
                            const item = Array.isArray(pd === null || pd === void 0 ? void 0 : pd.data)
                                ? pd.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskUUID) === pollTaskUUID || (d === null || d === void 0 ? void 0 : d.videoURL)) || pd.data[0]
                                : pd === null || pd === void 0 ? void 0 : pd.data;
                            const status = (item === null || item === void 0 ? void 0 : item.status) || (item === null || item === void 0 ? void 0 : item.taskStatus);
                            if (status)
                                console.log("[Claymotion F1] Poll status", {
                                    attempt,
                                    status,
                                });
                            if (status === "success" || (item === null || item === void 0 ? void 0 : item.videoURL) || (item === null || item === void 0 ? void 0 : item.url)) {
                                videoUrl =
                                    (item === null || item === void 0 ? void 0 : item.videoURL) ||
                                        (item === null || item === void 0 ? void 0 : item.url) ||
                                        (item === null || item === void 0 ? void 0 : item.video) ||
                                        (Array.isArray(item === null || item === void 0 ? void 0 : item.videos) ? item.videos[0] : null);
                                if (videoUrl)
                                    break;
                            }
                            if (status === "error" || status === "failed") {
                                respondRunwareError(res, 502, "Runware Claymotion F1 generation failed during polling", pd);
                                return;
                            }
                            consecutive400 = 0; // reset on successful poll
                        }
                        catch (e) {
                            const statusCode = (_56 = e === null || e === void 0 ? void 0 : e.response) === null || _56 === void 0 ? void 0 : _56.status;
                            const body = (_57 = e === null || e === void 0 ? void 0 : e.response) === null || _57 === void 0 ? void 0 : _57.data;
                            console.log("[Claymotion F1] Poll error", {
                                attempt,
                                statusCode,
                                body: typeof body === "object"
                                    ? JSON.stringify(body).slice(0, 500)
                                    : body,
                            });
                            if (statusCode === 400) {
                                consecutive400++;
                                // If repeated 400 and ack UUID differs, try switching to created taskUUID once
                                if (!switchedToCreated &&
                                    pollTaskUUID !== taskUUIDCreated &&
                                    consecutive400 >= 2) {
                                    console.log("[Claymotion F1] Switching to created taskUUID due to repeated 400", { from: pollTaskUUID, to: taskUUIDCreated });
                                    pollTaskUUID = taskUUIDCreated;
                                    switchedToCreated = true;
                                    consecutive400 = 0;
                                }
                                if (consecutive400 >= 5) {
                                    respondRunwareError(res, 502, "Runware Claymotion F1 polling returned repeated 400 errors", body || ((_58 = e === null || e === void 0 ? void 0 : e.response) === null || _58 === void 0 ? void 0 : _58.data) || e);
                                    return;
                                }
                            }
                            continue;
                        }
                    }
                }
                if (!videoUrl) {
                    console.log("[Claymotion F1] Timeout - no video URL returned after polling");
                    respondRunwareError(res, 502, "Runware Claymotion F1 did not return a video URL (timeout or missing)", createData);
                    return;
                }
                // 4) Download and upload to S3
                let rwStream;
                try {
                    rwStream = yield axios_1.default.get(videoUrl, {
                        responseType: "stream",
                        timeout: 600000,
                    });
                    console.log("[Claymotion F1] Download started");
                }
                catch (e) {
                    console.log("[Claymotion F1] Download error", {
                        error: serializeError(e),
                    });
                    res.status(500).json({
                        success: false,
                        error: "Failed to download Claymotion F1 video",
                        details: serializeError(e),
                    });
                    return;
                }
                let uploaded;
                try {
                    uploaded = yield uploadGeneratedVideo(feature, "claymotion-f1", rwStream.data, videoType);
                    console.log("[Claymotion F1] S3 upload success", {
                        key: uploaded.key,
                    });
                }
                catch (e) {
                    console.log("[Claymotion F1] S3 upload error", {
                        error: serializeError(e),
                    });
                    res.status(500).json({
                        success: false,
                        error: "Failed to upload Claymotion F1 video to S3",
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
            }
            catch (err) {
                console.error("Runware Claymotion F1 error:", ((_59 = err === null || err === void 0 ? void 0 : err.response) === null || _59 === void 0 ? void 0 : _59.data) || err);
                res.status(500).json({
                    success: false,
                    error: "Claymotion F1 generation failed",
                    details: serializeError(err),
                });
                return;
            }
        }
        if (isPixverseTransition || isPixverseImage2Video) {
            // Ensure 512x512 for Pixverse-compatible inputs for ANY host (S3/Cloudinary/etc)
            const force512 = (url) => {
                if (!url)
                    return url;
                try {
                    if (!/res\.cloudinary\.com\//i.test(url))
                        return url; // only transform Cloudinary inline
                    if (/\/image\/upload\/c_fill,w_512,h_512\//.test(url))
                        return url;
                    return url.replace(/(\/image\/upload\/)(?!c_fill,w_512,h_512\/)/, "$1c_fill,w_512,h_512,q_auto,f_auto/");
                }
                catch (_a) {
                    return url;
                }
            };
            // Normalize any URL to 512x512 by resizing+reuploading to S3 when not Cloudinary
            const normalizeTo512 = (url) => __awaiter(void 0, void 0, void 0, function* () {
                if (!url)
                    return undefined;
                // If Cloudinary, prefer URL transformation for speed
                const maybeCloud = force512(url);
                if (maybeCloud !== url)
                    return maybeCloud;
                try {
                    const ensured = yield (0, s3_1.ensure512SquareImageFromUrl)(url);
                    const key = (0, s3_1.makeKey)({
                        type: "image",
                        feature: "pixverse-512",
                        ext: "png",
                    });
                    yield (0, s3_1.uploadBuffer)(key, ensured.buffer, ensured.contentType);
                    const signed = yield (0, signedUrl_1.signKey)(key);
                    return signed;
                }
                catch (e) {
                    console.warn("[Pixverse] 512 resize failed, using original URL", e);
                    return url;
                }
            });
            const firstFrame512 = yield normalizeTo512(imageCloudUrl);
            const lastFrame512 = yield normalizeTo512(lastFrameCloudUrl);
            const pixKey = process.env.PIXVERSE_API_KEY || process.env.EACHLABS_API_KEY;
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
            // Optional parameters from request, fallback to env vars
            const pixVersion = process.env.PIXVERSE_VERSION || "0.0.1";
            const commonInput = {
                motion_mode: req.body.motionMode || process.env.PIXVERSE_MOTION_MODE || "normal",
                quality: req.body.quality || process.env.PIXVERSE_QUALITY || "540p",
                duration: req.body.duration !== undefined
                    ? Number(req.body.duration)
                    : Number(process.env.PIXVERSE_DURATION || 5),
                prompt,
                webhook_url: process.env.PIXVERSE_WEBHOOK_URL || "",
            };
            if (isPixverseTransition) {
                commonInput.last_frame_url = lastFrame512 || lastFrameCloudUrl;
                commonInput.first_frame_url = firstFrame512 || imageCloudUrl;
            }
            else {
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
            let predictionId;
            try {
                const createResp = yield axios_1.default.post("https://api.eachlabs.ai/v1/prediction/", createPayload, {
                    headers: {
                        "X-API-Key": pixKey,
                        "Content-Type": "application/json",
                    },
                });
                const prediction = createResp.data || {};
                console.log("Pixverse create response:", prediction);
                const statusStr = String(prediction.status || "").toLowerCase();
                if (statusStr !== "success") {
                    const provider_message = (prediction === null || prediction === void 0 ? void 0 : prediction.message) ||
                        (prediction === null || prediction === void 0 ? void 0 : prediction.error) ||
                        (prediction === null || prediction === void 0 ? void 0 : prediction.status) ||
                        "Unknown status";
                    res.status(502).json({
                        success: false,
                        error: `Pixverse creation failed: ${provider_message}`,
                        provider: "Pixverse",
                        provider_status: prediction === null || prediction === void 0 ? void 0 : prediction.status,
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
            }
            catch (err) {
                const pixErr = err;
                console.error("Pixverse create error (single attempt):", {
                    error: pixErr,
                    payload: createPayload,
                    serverResponse: (_60 = pixErr === null || pixErr === void 0 ? void 0 : pixErr.response) === null || _60 === void 0 ? void 0 : _60.data,
                });
                const provider_message = extractEachlabsErrorMessage(err);
                res.status(502).json({
                    success: false,
                    error: provider_message,
                    details: serializeError(err),
                });
                return;
            }
            // Poll prediction (works for both variants)
            let pixVideoUrl;
            for (let i = 0; i < 300; i++) {
                // up to ~5 min (300 *1s) typical runtime 45s
                yield new Promise((r) => setTimeout(r, 1000));
                try {
                    const pollResp = yield axios_1.default.get(`https://api.eachlabs.ai/v1/prediction/${predictionId}`, { headers: { "X-API-Key": pixKey }, timeout: 20000 });
                    const result = pollResp.data;
                    console.log(result);
                    const status = result.status;
                    const lower = (status || "").toLowerCase();
                    if (lower === "success" || lower === "completed") {
                        // Output may be a direct URL string or an object/array
                        const rawOut = result.output;
                        if (typeof rawOut === "string") {
                            pixVideoUrl = rawOut;
                        }
                        else if (rawOut) {
                            const out = rawOut;
                            pixVideoUrl =
                                out.video_url ||
                                    out.video ||
                                    (Array.isArray(out) ? ((_61 = out[0]) === null || _61 === void 0 ? void 0 : _61.video_url) || out[0] : null) ||
                                    result.video_url ||
                                    result.video ||
                                    out.url ||
                                    result.url ||
                                    null;
                        }
                        else {
                            pixVideoUrl =
                                result.video_url || result.video || result.url || null;
                        }
                        break;
                    }
                    else if (["error", "failed", "canceled", "cancelled"].includes(lower)) {
                        const provider_output = result === null || result === void 0 ? void 0 : result.output;
                        const provider_message = (result === null || result === void 0 ? void 0 : result.error) ||
                            (result === null || result === void 0 ? void 0 : result.message) ||
                            (result === null || result === void 0 ? void 0 : result.status) ||
                            provider_output;
                        // Prefer the explicit output text when present (e.g., "incorrect image width or height")
                        const userError = provider_output ||
                            provider_message ||
                            "Pixverse prediction failed";
                        res.status(422).json({
                            success: false,
                            error: userError,
                            provider: "Pixverse",
                            provider_status: result === null || result === void 0 ? void 0 : result.status,
                            provider_message,
                            provider_output,
                            details: safeJson(result),
                        });
                        return;
                    }
                    else {
                        // still processing; continue loop
                    }
                }
                catch (e) {
                    console.warn("Pixverse poll error (continuing)", (e === null || e === void 0 ? void 0 : e.message) || e);
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
                pixStream = yield axios_1.default.get(pixVideoUrl, {
                    responseType: "stream",
                    timeout: 600000,
                });
            }
            catch (e) {
                res.status(500).json({
                    success: false,
                    error: "Failed to download Pixverse video",
                    details: serializeError(e),
                });
                return;
            }
            let uploadedPix;
            try {
                uploadedPix = yield uploadGeneratedVideo(feature, "pixverse", pixStream.data);
            }
            catch (e) {
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
            const eachLabsKey = process.env.PIXVERSE_API_KEY || process.env.EACHLABS_API_KEY;
            if (!eachLabsKey) {
                res.status(500).json({
                    success: false,
                    error: "EACHLABS / PIXVERSE API key not set",
                });
                return;
            }
            // Collect up to three reference images. Primary is required (already uploaded to Cloudinary earlier if needed)
            // We allow client to pass optional image_url2 / image_url3 (already Cloudinary URLs OR public). If not cloudinary, attempt upload.
            let image2Raw = req.body.image_url2;
            let image3Raw = req.body.image_url3;
            const maybeUploadExtra = (raw) => __awaiter(void 0, void 0, void 0, function* () {
                var _a, _b;
                if (!raw)
                    return undefined;
                if (raw.includes("cloudinary.com"))
                    return raw; // already hosted
                const isLikelyPublic = /^https?:\/\//i.test(raw) && !/localhost|127\.|^file:/i.test(raw);
                try {
                    if (process.env.CLOUDINARY_UPLOAD_URL &&
                        process.env.CLOUDINARY_UPLOAD_PRESET) {
                        const formD = new (require("form-data"))();
                        formD.append("file", raw);
                        formD.append("upload_preset", process.env.CLOUDINARY_UPLOAD_PRESET);
                        const upRes = yield axios_1.default.post(process.env.CLOUDINARY_UPLOAD_URL, formD, { headers: formD.getHeaders(), timeout: 60000 });
                        return ((_a = upRes.data) === null || _a === void 0 ? void 0 : _a.secure_url) || ((_b = upRes.data) === null || _b === void 0 ? void 0 : _b.url) || raw;
                    }
                    if (isLikelyPublic)
                        return raw; // allow public
                }
                catch (e) {
                    console.warn("Optional reference image upload failed (ignored)", serializeError(e));
                    if (isLikelyPublic)
                        return raw;
                }
                return undefined;
            });
            const image2 = yield maybeUploadExtra(image2Raw);
            const image3 = yield maybeUploadExtra(image3Raw);
            const viduVersion = process.env.VIDU_Q1_VERSION || "0.0.1";
            const duration = Number(process.env.VIDU_Q1_DURATION || 5);
            const aspect = process.env.VIDU_Q1_ASPECT_RATIO || "16:9";
            const resolution = process.env.VIDU_Q1_RESOLUTION || "1080p"; // docs show "1080p"
            const movementAmplitude = process.env.VIDU_Q1_MOVEMENT_AMPLITUDE || "auto"; // auto / low / high
            const bgm = process.env.VIDU_Q1_BGM || "false"; // "true" / "false"
            const input = {
                resolution,
                prompt, // Use feature prompt or override
                duration,
                aspect_ratio: aspect,
                movement_amplitude: movementAmplitude,
                bgm,
            };
            // Add references in required naming order (image_url1..3)
            input.image_url = imageCloudUrl;
            if (lastFrameCloudUrl)
                input.image_url2 = lastFrameCloudUrl;
            if (image2)
                input.image_url2 = image2; // override if user explicitly provided second reference
            if (image3)
                input.image_url3 = image3;
            const createPayload = {
                model: "vidu-q-1-reference-to-video",
                version: viduVersion,
                input,
                webhook_url: process.env.VIDU_Q1_WEBHOOK_URL || "",
            };
            let predictionId;
            try {
                const createResp = yield axios_1.default.post("https://api.eachlabs.ai/v1/prediction/", createPayload, {
                    headers: {
                        "X-API-Key": eachLabsKey,
                        "Content-Type": "application/json",
                    },
                    timeout: 45000,
                });
                const prediction = createResp.data || {};
                console.log("Vidu Q1 create response:", prediction);
                const statusStr = String(prediction.status || "").toLowerCase();
                if (statusStr !== "success") {
                    const provider_message = (prediction === null || prediction === void 0 ? void 0 : prediction.message) ||
                        (prediction === null || prediction === void 0 ? void 0 : prediction.error) ||
                        (prediction === null || prediction === void 0 ? void 0 : prediction.status) ||
                        "Unknown status";
                    res.status(502).json({
                        success: false,
                        error: `Vidu Q1 creation failed: ${provider_message}`,
                        provider: "ViduQ1",
                        provider_status: prediction === null || prediction === void 0 ? void 0 : prediction.status,
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
            }
            catch (err) {
                const viduQ1Err = err;
                console.error("Vidu Q1 create error:", {
                    error: viduQ1Err,
                    payload: createPayload,
                    serverResponse: (_62 = viduQ1Err === null || viduQ1Err === void 0 ? void 0 : viduQ1Err.response) === null || _62 === void 0 ? void 0 : _62.data,
                });
                const provider_message = extractEachlabsErrorMessage(err);
                res.status(502).json({
                    success: false,
                    error: `Vidu Q1 creation failed: ${provider_message}`,
                    details: serializeError(err),
                });
                return;
            }
            // Poll
            let viduVideoUrl;
            for (let i = 0; i < 300; i++) {
                // up to ~5 min
                yield new Promise((r) => setTimeout(r, 1000));
                try {
                    const pollResp = yield axios_1.default.get(`https://api.eachlabs.ai/v1/prediction/${predictionId}`, { headers: { "X-API-Key": eachLabsKey }, timeout: 20000 });
                    const result = pollResp.data || {};
                    const lower = String(result.status || "").toLowerCase();
                    if (lower === "success" || lower === "completed") {
                        const rawOut = result.output;
                        if (typeof rawOut === "string")
                            viduVideoUrl = rawOut;
                        else if (rawOut) {
                            const out = rawOut;
                            viduVideoUrl =
                                out.video_url ||
                                    out.video ||
                                    (Array.isArray(out) ? ((_63 = out[0]) === null || _63 === void 0 ? void 0 : _63.video_url) || out[0] : null) ||
                                    result.video_url ||
                                    result.video ||
                                    out.url ||
                                    result.url ||
                                    null;
                        }
                        else {
                            viduVideoUrl =
                                result.video_url || result.video || result.url || null;
                        }
                        break;
                    }
                    else if (["error", "failed", "canceled", "cancelled"].includes(lower)) {
                        const provider_message = (result === null || result === void 0 ? void 0 : result.error) ||
                            (result === null || result === void 0 ? void 0 : result.message) ||
                            (result === null || result === void 0 ? void 0 : result.status);
                        res.status(500).json({
                            success: false,
                            error: provider_message
                                ? `Vidu Q1 prediction failed: ${provider_message}`
                                : "Vidu Q1 prediction failed",
                            provider: "ViduQ1",
                            provider_status: result === null || result === void 0 ? void 0 : result.status,
                            provider_message,
                            details: safeJson(result),
                        });
                        return;
                    }
                }
                catch (e) {
                    console.warn("Vidu Q1 poll error (continuing)", (e === null || e === void 0 ? void 0 : e.message) || e);
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
                viduStream = yield axios_1.default.get(viduVideoUrl, {
                    responseType: "stream",
                    timeout: 600000,
                });
            }
            catch (e) {
                res.status(500).json({
                    success: false,
                    error: "Failed to download Vidu Q1 video",
                    details: serializeError(e),
                });
                return;
            }
            let uploadedViduQ1;
            try {
                uploadedViduQ1 = yield uploadGeneratedVideo(feature, "viduq1-ref", viduStream.data, videoType);
            }
            catch (e) {
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
            let createResp;
            let predictionId;
            try {
                createResp = yield axios_1.default.post("https://api.eachlabs.ai/v1/prediction/", createPayload, {
                    headers: {
                        "X-API-Key": eachLabsKey,
                        "Content-Type": "application/json",
                    },
                    timeout: 30000,
                });
                const prediction = createResp.data || {};
                console.log("Vidu 1.5 create response:", prediction);
                const statusStr = String(prediction.status || "").toLowerCase();
                if (statusStr !== "success") {
                    const provider_message = (prediction === null || prediction === void 0 ? void 0 : prediction.error) ||
                        (prediction === null || prediction === void 0 ? void 0 : prediction.message) ||
                        "Unknown status";
                    res.status(502).json({
                        success: false,
                        error: `Vidu 1.5 creation failed: ${provider_message}`,
                        provider: "Vidu15",
                        provider_status: prediction === null || prediction === void 0 ? void 0 : prediction.status,
                        provider_message,
                        details: safeJson(prediction),
                    });
                    return;
                }
                predictionId = prediction === null || prediction === void 0 ? void 0 : prediction.predictionID;
                if (!predictionId) {
                    res.status(502).json({
                        success: false,
                        error: "Vidu 1.5 response missing prediction id",
                        details: safeJson(prediction),
                    });
                    return;
                }
            }
            catch (err) {
                const vidu15Err = err;
                console.error("Vidu 1.5 create error:", {
                    error: vidu15Err,
                    payload: createPayload,
                    serverResponse: (_64 = vidu15Err === null || vidu15Err === void 0 ? void 0 : vidu15Err.response) === null || _64 === void 0 ? void 0 : _64.data,
                });
                const provider_message = extractEachlabsErrorMessage(err);
                res.status(502).json({
                    success: false,
                    error: `Vidu 1.5 creation failed: ${provider_message}`,
                    details: serializeError(err),
                });
                return;
            }
            // Poll
            let viduVideoUrl;
            for (let i = 0; i < 300; i++) {
                // up to ~5 min
                yield new Promise((r) => setTimeout(r, 1000));
                try {
                    const pollResp = yield axios_1.default.get(`https://api.eachlabs.ai/v1/prediction/${predictionId}`, { headers: { "X-API-Key": eachLabsKey }, timeout: 20000 });
                    const result = pollResp.data || {};
                    const lower = String(result.status || "").toLowerCase();
                    if (lower === "success" || lower === "completed") {
                        const rawOut = result.output;
                        if (typeof rawOut === "string")
                            viduVideoUrl = rawOut;
                        else if (rawOut) {
                            const out = rawOut;
                            viduVideoUrl =
                                out.video_url ||
                                    out.video ||
                                    (Array.isArray(out) ? ((_65 = out[0]) === null || _65 === void 0 ? void 0 : _65.video_url) || out[0] : null) ||
                                    result.video_url ||
                                    result.video ||
                                    out.url ||
                                    result.url ||
                                    null;
                        }
                        else {
                            viduVideoUrl =
                                result.video_url || result.video || result.url || null;
                        }
                        break;
                    }
                    else if (["error", "failed", "canceled", "cancelled"].includes(lower)) {
                        const provider_message = (result === null || result === void 0 ? void 0 : result.error) ||
                            (result === null || result === void 0 ? void 0 : result.message) ||
                            (result === null || result === void 0 ? void 0 : result.status);
                        res.status(500).json({
                            success: false,
                            error: provider_message
                                ? `Vidu Q1 prediction failed: ${provider_message}`
                                : "Vidu Q1 prediction failed",
                            provider: "ViduQ1",
                            provider_status: result === null || result === void 0 ? void 0 : result.status,
                            provider_message,
                            details: safeJson(result),
                        });
                        return;
                    }
                }
                catch (e) {
                    console.warn("Vidu Q1 poll error (continuing)", (e === null || e === void 0 ? void 0 : e.message) || e);
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
                viduStream = yield axios_1.default.get(viduVideoUrl, {
                    responseType: "stream",
                    timeout: 600000,
                });
            }
            catch (e) {
                res.status(500).json({
                    success: false,
                    error: "Failed to download Vidu 1.5 video",
                    details: serializeError(e),
                });
                return;
            }
            let uploadedVidu15;
            try {
                uploadedVidu15 = yield uploadGeneratedVideo(feature, "vidu15", viduStream.data);
            }
            catch (e) {
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
        // Eachlabs Wan 2.5 Image to Video branch
        const isWan25Image2Video = /wan-2\.5-image-to-video/i.test(rawModel);
        if (isWan25Image2Video) {
            const eachLabsKey = process.env.EACHLABS_API_KEY;
            if (!eachLabsKey) {
                res.status(500).json({
                    success: false,
                    error: "EACHLABS API key not set",
                });
                return;
            }
            const wanVersion = "0.0.1";
            // Validate and get duration from request body (only 5 or 10 allowed)
            let duration = req.body.duration ? Number(req.body.duration) : 5;
            if (![5, 10].includes(duration)) {
                duration = 5; // Default to 5 if invalid
            }
            // Validate and get resolution from request body (only 480p, 720p, 1080p allowed)
            let resolution = req.body.resolution
                ? String(req.body.resolution)
                : "720p";
            if (!["480p", "720p", "1080p"].includes(resolution)) {
                resolution = "720p"; // Default to 720p if invalid
            }
            const input = {
                image: imageCloudUrl, // EachLabs API expects 'image' not 'image_url'
                prompt: prompt,
                duration: duration,
                resolution: resolution,
            };
            const createPayload = {
                model: "wan-2-5-image-to-video",
                version: wanVersion,
                input,
            };
            let createResp;
            let predictionId;
            try {
                createResp = yield axios_1.default.post("https://api.eachlabs.ai/v1/prediction/", createPayload, {
                    headers: {
                        "X-API-Key": eachLabsKey,
                        "Content-Type": "application/json",
                    },
                    timeout: 30000,
                });
                const prediction = createResp.data || {};
                console.log("Wan 2.5 create response:", prediction);
                const statusStr = String(prediction.status || "").toLowerCase();
                if (statusStr !== "success") {
                    const provider_message = (prediction === null || prediction === void 0 ? void 0 : prediction.error) ||
                        (prediction === null || prediction === void 0 ? void 0 : prediction.message) ||
                        "Unknown status";
                    res.status(502).json({
                        success: false,
                        error: `Wan 2.5 creation failed: ${provider_message}`,
                        provider: "Wan25",
                        provider_status: prediction === null || prediction === void 0 ? void 0 : prediction.status,
                        provider_message,
                        details: safeJson(prediction),
                    });
                    return;
                }
                predictionId = prediction === null || prediction === void 0 ? void 0 : prediction.predictionID;
                if (!predictionId) {
                    res.status(502).json({
                        success: false,
                        error: "Wan 2.5 response missing prediction id",
                        details: safeJson(prediction),
                    });
                    return;
                }
            }
            catch (err) {
                const wan25Err = err;
                console.error("Wan 2.5 create error:", {
                    error: wan25Err,
                    payload: createPayload,
                    serverResponse: (_66 = wan25Err === null || wan25Err === void 0 ? void 0 : wan25Err.response) === null || _66 === void 0 ? void 0 : _66.data,
                });
                const provider_message = extractEachlabsErrorMessage(err);
                res.status(502).json({
                    success: false,
                    error: `Wan 2.5 creation failed: ${provider_message}`,
                    details: serializeError(err),
                });
                return;
            }
            // Poll
            let wanVideoUrl;
            for (let i = 0; i < 300; i++) {
                // up to ~5 min
                yield new Promise((r) => setTimeout(r, 1000));
                try {
                    const pollResp = yield axios_1.default.get(`https://api.eachlabs.ai/v1/prediction/${predictionId}`, { headers: { "X-API-Key": eachLabsKey }, timeout: 20000 });
                    const result = pollResp.data || {};
                    const lower = String(result.status || "").toLowerCase();
                    if (lower === "success" || lower === "completed") {
                        const rawOut = result.output;
                        if (typeof rawOut === "string")
                            wanVideoUrl = rawOut;
                        else if (rawOut) {
                            const out = rawOut;
                            wanVideoUrl =
                                out.video_url ||
                                    out.video ||
                                    (Array.isArray(out) ? ((_67 = out[0]) === null || _67 === void 0 ? void 0 : _67.video_url) || out[0] : null) ||
                                    result.video_url ||
                                    result.video ||
                                    out.url ||
                                    result.url ||
                                    null;
                        }
                        else {
                            wanVideoUrl =
                                result.video_url || result.video || result.url || null;
                        }
                        break;
                    }
                    else if (["error", "failed", "canceled", "cancelled"].includes(lower)) {
                        const provider_message = (result === null || result === void 0 ? void 0 : result.error) ||
                            (result === null || result === void 0 ? void 0 : result.message) ||
                            (result === null || result === void 0 ? void 0 : result.status);
                        res.status(500).json({
                            success: false,
                            error: provider_message
                                ? `Wan 2.5 prediction failed: ${provider_message}`
                                : "Wan 2.5 prediction failed",
                            provider: "Wan25",
                            provider_status: result === null || result === void 0 ? void 0 : result.status,
                            provider_message,
                            details: safeJson(result),
                        });
                        return;
                    }
                }
                catch (e) {
                    console.warn("Wan 2.5 poll error (continuing)", (e === null || e === void 0 ? void 0 : e.message) || e);
                    continue;
                }
            }
            if (!wanVideoUrl) {
                res.status(504).json({
                    success: false,
                    error: "Wan 2.5 prediction timeout",
                    provider: "Wan25",
                    provider_status: "timeout",
                    provider_message: "Prediction did not complete in allotted time",
                });
                return;
            }
            // Download & upload to S3
            let wanStream;
            try {
                wanStream = yield axios_1.default.get(wanVideoUrl, {
                    responseType: "stream",
                    timeout: 600000,
                });
            }
            catch (e) {
                res.status(500).json({
                    success: false,
                    error: "Failed to download Wan 2.5 video",
                    details: serializeError(e),
                });
                return;
            }
            let uploadedWan25;
            try {
                uploadedWan25 = yield uploadGeneratedVideo(feature, "wan25", wanStream.data, videoType);
            }
            catch (e) {
                res.status(500).json({
                    success: false,
                    error: "Failed to upload Wan 2.5 video to S3",
                    details: serializeError(e),
                });
                return;
            }
            yield logAppApiCall(appId, `generate-video/${feature}`, videoType, "wan-2.5-image-to-video", "success", undefined, Date.now() - startTime);
            res.status(200).json({
                success: true,
                video: {
                    url: uploadedWan25.signedUrl,
                    signedUrl: uploadedWan25.signedUrl,
                    key: uploadedWan25.key,
                },
                s3Key: uploadedWan25.key,
            });
            return;
        }
        // Eachlabs Vidu Q1 Image to Video branch
        const isViduQ1Image2Video = /vidu-q1-image-to-video/i.test(rawModel);
        if (isViduQ1Image2Video) {
            const eachLabsKey = process.env.PIXVERSE_API_KEY || process.env.EACHLABS_API_KEY;
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
            let createResp;
            let predictionId;
            try {
                createResp = yield axios_1.default.post("https://api.eachlabs.ai/v1/prediction/", createPayload, {
                    headers: {
                        "x-api-key": eachLabsKey,
                        "Content-Type": "application/json",
                    },
                    timeout: 30000,
                });
                const prediction = createResp.data || {};
                console.log("Vidu Q1 I2V create response:", prediction);
                const statusStr = String(prediction.status || "").toLowerCase();
                if (statusStr !== "success") {
                    const provider_message = (prediction === null || prediction === void 0 ? void 0 : prediction.error) ||
                        (prediction === null || prediction === void 0 ? void 0 : prediction.message) ||
                        "Unknown status";
                    res.status(502).json({
                        success: false,
                        error: `Vidu Q1 I2V creation failed: ${provider_message}`,
                        provider: "ViduQ1I2V",
                        provider_status: prediction === null || prediction === void 0 ? void 0 : prediction.status,
                        provider_message,
                        details: safeJson(prediction),
                    });
                    return;
                }
                predictionId = prediction === null || prediction === void 0 ? void 0 : prediction.predictionID;
                if (!predictionId) {
                    res.status(502).json({
                        success: false,
                        error: "Vidu Q1 I2V response missing prediction id",
                        details: safeJson(prediction),
                    });
                    return;
                }
            }
            catch (err) {
                const viduQ1I2VErr = err;
                console.error("Vidu Q1 I2V create error:", {
                    error: viduQ1I2VErr,
                    payload: createPayload,
                    serverResponse: (_68 = viduQ1I2VErr === null || viduQ1I2VErr === void 0 ? void 0 : viduQ1I2VErr.response) === null || _68 === void 0 ? void 0 : _68.data,
                });
                const provider_message = extractEachlabsErrorMessage(err);
                res.status(502).json({
                    success: false,
                    error: `Vidu Q1 I2V creation failed: ${provider_message}`,
                    details: serializeError(err),
                });
                return;
            }
            // Poll
            let viduVideoUrl;
            for (let i = 0; i < 300; i++) {
                // up to ~5 min
                yield new Promise((r) => setTimeout(r, 1000));
                try {
                    const result = yield axios_1.default.get(`https://api.eachlabs.ai/v1/prediction/${predictionId}`, {
                        headers: { "x-api-key": eachLabsKey },
                        timeout: 10000,
                    });
                    const lower = String(result.data.status || "").toLowerCase();
                    if (lower === "success" || lower === "completed") {
                        const rawOut = result.data.output;
                        if (typeof rawOut === "string")
                            viduVideoUrl = rawOut;
                        else if (rawOut) {
                            const out = rawOut;
                            viduVideoUrl =
                                out.video_url ||
                                    out.video ||
                                    (Array.isArray(out) ? ((_69 = out[0]) === null || _69 === void 0 ? void 0 : _69.video_url) || out[0] : null) ||
                                    out.url ||
                                    result.data.url ||
                                    null;
                        }
                        else {
                            viduVideoUrl =
                                result.data.video_url ||
                                    result.data.video ||
                                    result.data.url ||
                                    null;
                        }
                        break;
                    }
                    else if (lower === "failed" || lower === "error") {
                        const provider_message = result.data.error || result.data.message || "Unknown error";
                        res.status(500).json({
                            success: false,
                            error: provider_message
                                ? `Vidu Q1 I2V prediction failed: ${provider_message}`
                                : "Vidu Q1 I2V prediction failed",
                            provider: "ViduQ1I2V",
                            provider_status: (_70 = result.data) === null || _70 === void 0 ? void 0 : _70.status,
                            provider_message,
                            details: safeJson(result.data),
                        });
                        return;
                    }
                }
                catch (e) {
                    console.warn("Vidu Q1 I2V poll error (continuing)", (e === null || e === void 0 ? void 0 : e.message) || e);
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
                viduStream = yield axios_1.default.get(viduVideoUrl, {
                    responseType: "stream",
                    timeout: 600000,
                });
            }
            catch (e) {
                res.status(500).json({
                    success: false,
                    error: "Failed to download Vidu Q1 I2V video",
                    details: serializeError(e),
                });
                return;
            }
            let uploadedViduQ1I2V;
            try {
                uploadedViduQ1I2V = yield uploadGeneratedVideo(feature, "viduq1-i2v", viduStream.data);
            }
            catch (e) {
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
            const eachLabsKey = process.env.PIXVERSE_API_KEY || process.env.EACHLABS_API_KEY;
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
            let createResp;
            let predictionId;
            try {
                createResp = yield axios_1.default.post("https://api.eachlabs.ai/v1/prediction/", createPayload, {
                    headers: {
                        "x-api-key": eachLabsKey,
                        "Content-Type": "application/json",
                    },
                    timeout: 30000,
                });
                const prediction = createResp.data || {};
                console.log("Vidu 2.0 create response:", prediction);
                const statusStr = String(prediction.status || "").toLowerCase();
                if (statusStr !== "success") {
                    const provider_message = (prediction === null || prediction === void 0 ? void 0 : prediction.message) ||
                        (prediction === null || prediction === void 0 ? void 0 : prediction.error) ||
                        (prediction === null || prediction === void 0 ? void 0 : prediction.status) ||
                        "Unknown status";
                    res.status(502).json({
                        success: false,
                        error: `Vidu 2.0 creation failed: ${provider_message}`,
                        provider: "Vidu20",
                        provider_status: prediction === null || prediction === void 0 ? void 0 : prediction.status,
                        provider_message,
                        details: safeJson(prediction),
                    });
                    return;
                }
                predictionId = prediction === null || prediction === void 0 ? void 0 : prediction.predictionID;
                if (!predictionId) {
                    res.status(502).json({
                        success: false,
                        error: "Vidu 2.0 response missing prediction id",
                        details: safeJson(prediction),
                    });
                    return;
                }
            }
            catch (err) {
                const vidu20Err = err;
                console.error("Vidu 2.0 create error:", {
                    error: vidu20Err,
                    payload: createPayload,
                    serverResponse: (_71 = vidu20Err === null || vidu20Err === void 0 ? void 0 : vidu20Err.response) === null || _71 === void 0 ? void 0 : _71.data,
                });
                const provider_message = extractEachlabsErrorMessage(err);
                res.status(502).json({
                    success: false,
                    error: `Vidu 2.0 creation failed: ${provider_message}`,
                    details: serializeError(err),
                });
                return;
            }
            // Poll
            let viduVideoUrl;
            for (let i = 0; i < 300; i++) {
                // up to ~5 min
                yield new Promise((r) => setTimeout(r, 1000));
                try {
                    const pollResp = yield axios_1.default.get(`https://api.eachlabs.ai/v1/prediction/${predictionId}`, {
                        headers: { "x-api-key": eachLabsKey },
                        timeout: 20000,
                    });
                    const result = pollResp.data || {};
                    const lower = String(result.status || "").toLowerCase();
                    if (lower === "success" || lower === "completed") {
                        const rawOut = result.output;
                        if (typeof rawOut === "string") {
                            viduVideoUrl = rawOut;
                        }
                        else if (rawOut) {
                            const out = rawOut;
                            viduVideoUrl =
                                out.video_url ||
                                    out.video ||
                                    (Array.isArray(out) ? ((_72 = out[0]) === null || _72 === void 0 ? void 0 : _72.video_url) || out[0] : null) ||
                                    result.video_url ||
                                    result.video ||
                                    out.url ||
                                    result.url ||
                                    null;
                        }
                        else {
                            viduVideoUrl =
                                result.video_url || result.video || result.url || null;
                        }
                        break;
                    }
                    else if (["error", "failed", "canceled", "cancelled"].includes(lower)) {
                        const provider_message = (result === null || result === void 0 ? void 0 : result.error) ||
                            (result === null || result === void 0 ? void 0 : result.message) ||
                            (result === null || result === void 0 ? void 0 : result.status);
                        res.status(500).json({
                            success: false,
                            error: provider_message
                                ? `Vidu 2.0 prediction failed: ${provider_message}`
                                : "Vidu 2.0 prediction failed",
                            provider: "Vidu20",
                            provider_status: result === null || result === void 0 ? void 0 : result.status,
                            provider_message,
                            details: safeJson(result),
                        });
                        return;
                    }
                }
                catch (e) {
                    console.warn("Vidu 2.0 poll error (continuing)", (e === null || e === void 0 ? void 0 : e.message) || e);
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
                viduStream = yield axios_1.default.get(viduVideoUrl, {
                    responseType: "stream",
                    timeout: 600000,
                });
            }
            catch (e) {
                res.status(500).json({
                    success: false,
                    error: "Failed to download Vidu 2.0 video",
                    details: serializeError(e),
                });
                return;
            }
            let uploadedVidu20;
            try {
                uploadedVidu20 = yield uploadGeneratedVideo(feature, "vidu20", viduStream.data);
            }
            catch (e) {
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
            let createResp;
            let predictionId;
            try {
                createResp = yield axios_1.default.post("https://api.eachlabs.ai/v1/prediction/", createPayload, {
                    headers: {
                        "X-API-Key": eachLabsKey,
                        "Content-Type": "application/json",
                    },
                    timeout: 30000,
                });
                const prediction = createResp.data || {};
                console.log("Veo 2 Image to Video create response:", prediction);
                const statusStr = String(prediction.status || "").toLowerCase();
                if (statusStr !== "success") {
                    const provider_message = (prediction === null || prediction === void 0 ? void 0 : prediction.message) ||
                        (prediction === null || prediction === void 0 ? void 0 : prediction.error) ||
                        (prediction === null || prediction === void 0 ? void 0 : prediction.status) ||
                        "Unknown status";
                    res.status(502).json({
                        success: false,
                        error: `Veo 2 Image to Video creation failed: ${provider_message}`,
                        provider: "Veo2Image2Video",
                        provider_status: prediction === null || prediction === void 0 ? void 0 : prediction.status,
                        provider_message,
                        details: safeJson(prediction),
                    });
                    return;
                }
                predictionId = prediction === null || prediction === void 0 ? void 0 : prediction.predictionID;
                if (!predictionId) {
                    res.status(502).json({
                        success: false,
                        error: "Veo 2 Image to Video response missing prediction id",
                        details: safeJson(prediction),
                    });
                    return;
                }
            }
            catch (err) {
                const veo2Err = err;
                console.error("Veo 2 Image to Video create error:", {
                    error: veo2Err,
                    payload: createPayload,
                    serverResponse: (_73 = veo2Err === null || veo2Err === void 0 ? void 0 : veo2Err.response) === null || _73 === void 0 ? void 0 : _73.data,
                });
                const provider_message = extractEachlabsErrorMessage(err);
                res.status(502).json({
                    success: false,
                    error: `Veo 2 I2V creation failed: ${provider_message}`,
                    details: serializeError(err),
                });
                return;
            }
            // Poll
            let veoVideoUrl;
            for (let i = 0; i < 300; i++) {
                // up to ~5 min
                yield new Promise((r) => setTimeout(r, 1000));
                try {
                    const pollResp = yield axios_1.default.get(`https://api.eachlabs.ai/v1/prediction/${predictionId}`, {
                        headers: { "x-api-key": eachLabsKey },
                        timeout: 20000,
                    });
                    const result = pollResp.data || {};
                    const lower = String(result.status || "").toLowerCase();
                    if (lower === "success" || lower === "completed") {
                        const rawOut = result.output;
                        if (typeof rawOut === "string") {
                            veoVideoUrl = rawOut;
                        }
                        else if (rawOut) {
                            const out = rawOut;
                            veoVideoUrl =
                                out.video_url ||
                                    out.video ||
                                    (Array.isArray(out) ? ((_74 = out[0]) === null || _74 === void 0 ? void 0 : _74.video_url) || out[0] : null) ||
                                    result.video_url ||
                                    result.video ||
                                    out.url ||
                                    result.url ||
                                    null;
                        }
                        else {
                            veoVideoUrl =
                                result.video_url || result.video || result.url || null;
                        }
                        break;
                    }
                    else if (["error", "failed", "canceled", "cancelled"].includes(lower)) {
                        const provider_message = (result === null || result === void 0 ? void 0 : result.error) ||
                            (result === null || result === void 0 ? void 0 : result.message) ||
                            (result === null || result === void 0 ? void 0 : result.status);
                        res.status(500).json({
                            success: false,
                            error: provider_message
                                ? `Veo 2 Image to Video prediction failed: ${provider_message}`
                                : "Veo 2 Image to Video prediction failed",
                            provider: "Veo2Image2Video",
                            provider_status: result === null || result === void 0 ? void 0 : result.status,
                            provider_message,
                            details: safeJson(result),
                        });
                        return;
                    }
                }
                catch (e) {
                    console.warn("Veo 2 Image to Video poll error (continuing)", (e === null || e === void 0 ? void 0 : e.message) || e);
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
                veoStream = yield axios_1.default.get(veoVideoUrl, {
                    responseType: "stream",
                    timeout: 600000,
                });
            }
            catch (e) {
                res.status(500).json({
                    success: false,
                    error: "Failed to download Veo 2 Image to Video video",
                    details: serializeError(e),
                });
                return;
            }
            let uploadedVeo2I2V;
            try {
                uploadedVeo2I2V = yield uploadGeneratedVideo(feature, "veo2-i2v", veoStream.data);
            }
            catch (e) {
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
            let createResp;
            let predictionId;
            try {
                createResp = yield axios_1.default.post("https://api.eachlabs.ai/v1/prediction/", createPayload, {
                    headers: {
                        "x-api-key": eachLabsKey,
                        "Content-Type": "application/json",
                    },
                    timeout: 30000,
                });
                const prediction = createResp.data || {};
                console.log("Veo 3 Image to Video create response:", prediction);
                const statusStr = String(prediction.status || "").toLowerCase();
                if (statusStr !== "success") {
                    const provider_message = (prediction === null || prediction === void 0 ? void 0 : prediction.message) ||
                        (prediction === null || prediction === void 0 ? void 0 : prediction.error) ||
                        (prediction === null || prediction === void 0 ? void 0 : prediction.status) ||
                        "Unknown status";
                    res.status(502).json({
                        success: false,
                        error: `Veo 3 Image to Video creation failed: ${provider_message}`,
                        provider: "Veo3Image2Video",
                        provider_status: prediction === null || prediction === void 0 ? void 0 : prediction.status,
                        provider_message,
                        details: safeJson(prediction),
                    });
                    return;
                }
                predictionId = prediction === null || prediction === void 0 ? void 0 : prediction.predictionID;
                if (!predictionId) {
                    res.status(502).json({
                        success: false,
                        error: "Veo 3 Image to Video response missing prediction id",
                        details: safeJson(prediction),
                    });
                    return;
                }
            }
            catch (err) {
                const veo3Err = err;
                console.error("Veo 3 Image to Video create error:", {
                    error: veo3Err,
                    payload: createPayload,
                    serverResponse: (_75 = veo3Err === null || veo3Err === void 0 ? void 0 : veo3Err.response) === null || _75 === void 0 ? void 0 : _75.data,
                });
                const provider_message = extractEachlabsErrorMessage(err);
                res.status(502).json({
                    success: false,
                    error: `Veo 3 I2V creation failed: ${provider_message}`,
                    details: serializeError(err),
                });
                return;
            }
            // Poll
            let veoVideoUrl;
            for (let i = 0; i < 300; i++) {
                // up to ~5 min
                yield new Promise((r) => setTimeout(r, 1000));
                try {
                    const pollResp = yield axios_1.default.get(`https://api.eachlabs.ai/v1/prediction/${predictionId}`, {
                        headers: { "x-api-key": eachLabsKey },
                        timeout: 20000,
                    });
                    const result = pollResp.data || {};
                    const lower = String(result.status || "").toLowerCase();
                    if (lower === "success" || lower === "completed") {
                        const rawOut = result.output;
                        if (typeof rawOut === "string") {
                            veoVideoUrl = rawOut;
                        }
                        else if (rawOut) {
                            const out = rawOut;
                            veoVideoUrl =
                                out.video_url ||
                                    out.video ||
                                    (Array.isArray(out) ? ((_76 = out[0]) === null || _76 === void 0 ? void 0 : _76.video_url) || out[0] : null) ||
                                    result.video_url ||
                                    result.video ||
                                    out.url ||
                                    result.url ||
                                    null;
                        }
                        else {
                            veoVideoUrl =
                                result.video_url || result.video || result.url || null;
                        }
                        break;
                    }
                    else if (["error", "failed", "canceled", "cancelled"].includes(lower)) {
                        const provider_message = (result === null || result === void 0 ? void 0 : result.error) ||
                            (result === null || result === void 0 ? void 0 : result.message) ||
                            (result === null || result === void 0 ? void 0 : result.status);
                        res.status(500).json({
                            success: false,
                            error: provider_message
                                ? `Veo 3 Image to Video prediction failed: ${provider_message}`
                                : "Veo 3 Image to Video prediction failed",
                            provider: "Veo3Image2Video",
                            provider_status: result === null || result === void 0 ? void 0 : result.status,
                            provider_message,
                            details: safeJson(result),
                        });
                        return;
                    }
                }
                catch (e) {
                    console.warn("Veo 3 Image to Video poll error (continuing)", (e === null || e === void 0 ? void 0 : e.message) || e);
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
                veoStream = yield axios_1.default.get(veoVideoUrl, {
                    responseType: "stream",
                    timeout: 600000,
                });
            }
            catch (e) {
                res.status(500).json({
                    success: false,
                    error: "Failed to download Veo 3 Image to Video video",
                    details: serializeError(e),
                });
                return;
            }
            let uploadedVeo3I2V;
            try {
                uploadedVeo3I2V = yield uploadGeneratedVideo(feature, "veo3-i2v", veoStream.data);
            }
            catch (e) {
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
        const isBytedanceSeeddance = /bytedance-seeddance-v1-pro-image-to-video/i.test(rawModel);
        if (isBytedanceOmnihuman || isBytedanceSeeddance) {
            console.log("[Bytedance] Starting video generation for model:", isBytedanceOmnihuman
                ? "bytedance-omnihuman"
                : "seedance-v1-pro-image-to-video");
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
            let audioUrl = null;
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
                    const audioExt = (req.file.originalname || "mp3").split(".").pop() || "mp3";
                    const audioKey = (0, s3_1.makeKey)({
                        type: "audio",
                        feature,
                        ext: audioExt,
                    });
                    yield (0, s3_1.uploadBuffer)(audioKey, req.file.buffer, req.file.mimetype || "audio/mpeg");
                    try {
                        audioUrl = yield (0, signedUrl_1.signKey)(audioKey);
                    }
                    catch (_117) {
                        audioUrl = (0, s3_1.publicUrlFor)(audioKey); // fallback (may be private)
                    }
                }
                catch (e) {
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
            const bytedanceInput = {
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
            }
            else {
                // Seeddance V1 Pro
                bytedancePayload = {
                    model: "seedance-v1-pro-image-to-video",
                    version: "0.0.1",
                    input: Object.assign(Object.assign(Object.assign({}, bytedanceInput), { camera_fixed: false, duration: "5", resolution: "720p" }), (prompt ? { prompt } : {})),
                    webhook_url: "",
                };
            }
            console.log("[Bytedance] Payload:", JSON.stringify(bytedancePayload, null, 2));
            let taskId;
            try {
                const createResp = yield axios_1.default.post("https://api.eachlabs.ai/v1/prediction/", bytedancePayload, {
                    headers: {
                        "X-API-Key": bytedanceKey,
                        "Content-Type": "application/json",
                    },
                    timeout: 45000,
                });
                const data = createResp.data || {};
                console.log("[Bytedance] Creation response:", JSON.stringify(data, null, 2));
                if (data.status !== "success") {
                    const provider_message = data.message || data.error || data.status || "Unknown error";
                    console.error("[Bytedance] Creation failed:", provider_message, data);
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
            }
            catch (e) {
                console.error("[Bytedance] Creation error:", serializeError(e));
                const provider_message = extractEachlabsErrorMessage(e);
                res.status(502).json({
                    success: false,
                    error: `Bytedance creation failed: ${provider_message}`,
                    provider: "Bytedance",
                    details: serializeError(e),
                });
                return;
            }
            // Poll for completion
            let bytedanceVideoUrl = null;
            for (let i = 0; i < 120; i++) {
                // up to ~8 minutes (120 * 4s)
                yield new Promise((r) => setTimeout(r, 4000));
                try {
                    const pollResp = yield axios_1.default.get(`https://api.eachlabs.ai/v1/prediction/${taskId}`, {
                        headers: {
                            "X-API-Key": bytedanceKey,
                            "Content-Type": "application/json",
                        },
                        timeout: 20000,
                    });
                    const pollData = pollResp.data || {};
                    console.log(`[Bytedance] Poll #${i + 1}:`, JSON.stringify(pollData, null, 2));
                    if (pollData.status === "succeeded" ||
                        pollData.status === "success") {
                        bytedanceVideoUrl = pollData.output;
                        if (bytedanceVideoUrl) {
                            console.log("[Bytedance] Generation completed. Video URL:", bytedanceVideoUrl);
                            break;
                        }
                    }
                    if (pollData.status === "failed" || pollData.status === "error") {
                        const provider_message = pollData.output || pollData.error || pollData.status;
                        console.error(`[Bytedance] Generation failed:`, provider_message, pollData);
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
                }
                catch (e) {
                    console.warn(`[Bytedance] Poll error (continuing):`, (e === null || e === void 0 ? void 0 : e.message) || e);
                    continue;
                }
            }
            if (!bytedanceVideoUrl) {
                console.error("[Bytedance] Generation timeout: No video URL after polling");
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
                bytedanceStream = yield axios_1.default.get(bytedanceVideoUrl, {
                    responseType: "stream",
                    timeout: 600000,
                });
            }
            catch (e) {
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
                uploadedBytedance = yield uploadGeneratedVideo(feature, isBytedanceOmnihuman ? "bytedance-omnihuman" : "seedance-v1-pro", bytedanceStream.data);
            }
            catch (e) {
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
        const isMiniMax = /MiniMax-Hailuo-02|I2V-01-Director|I2V-01-live|I2V-01/i.test(rawModel);
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
            }
            else if (/I2V-01-Director/i.test(rawModel)) {
                minimaxModel = "I2V-01-Director";
            }
            else if (/I2V-01-live/i.test(rawModel)) {
                minimaxModel = "I2V-01-live";
            }
            else if (/I2V-01/i.test(rawModel)) {
                minimaxModel = "I2V-01";
            }
            const resolution = process.env.MINIMAX_RESOLUTION ||
                (minimaxModel === "MiniMax-Hailuo-02" ? "768P" : "720P");
            const mmPayload = {
                model: minimaxModel,
                prompt: prompt, // MiniMax requires prompt
                duration,
                resolution,
            };
            // first_frame_image required for I2V models (and Hailuo at some resolutions)
            mmPayload.first_frame_image = imageCloudUrl;
            let taskId;
            try {
                const createResp = yield axios_1.default.post("https://api.minimax.io/v1/video_generation", mmPayload, {
                    headers: {
                        Authorization: `Bearer ${miniMaxKey}`,
                        "Content-Type": "application/json",
                    },
                    timeout: 45000,
                });
                const data = createResp.data || {};
                console.log("Minimax response: ", data);
                const base = data.base_resp || {};
                const provider_code = base.status_code;
                const provider_message = base.status_msg;
                taskId = data === null || data === void 0 ? void 0 : data.task_id;
                // If provider returns an error code (non-zero) or no task id, treat as failure and expose provider message
                if ((provider_code !== undefined && provider_code !== 0) || !taskId) {
                    res.status(400).json({
                        success: false,
                        error: provider_message || "MiniMax creation failed",
                        provider: "MiniMax",
                        provider_code,
                        provider_message: provider_message ||
                            (taskId ? undefined : "Missing task_id in response"),
                        details: safeJson(data),
                    });
                    return;
                }
            }
            catch (e) {
                // already using e as any here, so no change needed
                const respData = (_77 = e === null || e === void 0 ? void 0 : e.response) === null || _77 === void 0 ? void 0 : _77.data;
                const base = (respData === null || respData === void 0 ? void 0 : respData.base_resp) || {};
                const provider_code = base === null || base === void 0 ? void 0 : base.status_code;
                const provider_message = (base === null || base === void 0 ? void 0 : base.status_msg) || (respData === null || respData === void 0 ? void 0 : respData.message) || (e === null || e === void 0 ? void 0 : e.message);
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
            let mmVideoUrl = null;
            let mmFileId = null;
            for (let i = 0; i < 90; i++) {
                // up to ~6 min (90 * 4s)
                yield new Promise((r) => setTimeout(r, 4000));
                try {
                    const pollResp = yield axios_1.default.get("https://api.minimax.io/v1/query/video_generation", {
                        headers: { Authorization: `Bearer ${miniMaxKey}` },
                        params: { task_id: taskId },
                        timeout: 20000,
                    });
                    const status = (_78 = pollResp.data) === null || _78 === void 0 ? void 0 : _78.status;
                    if (status === "Success" || status === "success") {
                        // Assume file_id -> downloadable endpoint
                        const fileId = (_79 = pollResp.data) === null || _79 === void 0 ? void 0 : _79.file_id;
                        console.log("MiniMax generation success payload:", safeJson(pollResp.data));
                        mmFileId = fileId || null;
                        // If API already provides a direct downloadable URL use it, else will fetch below
                        mmVideoUrl =
                            ((_80 = pollResp.data) === null || _80 === void 0 ? void 0 : _80.video_url) || ((_81 = pollResp.data) === null || _81 === void 0 ? void 0 : _81.file_url) || null;
                        break; // exit loop, will handle retrieval next
                    }
                    if (status === "Fail" ||
                        status === "failed" ||
                        status === "error") {
                        const base = ((_82 = pollResp.data) === null || _82 === void 0 ? void 0 : _82.base_resp) || {};
                        const provider_code = base === null || base === void 0 ? void 0 : base.status_code;
                        const provider_message = (base === null || base === void 0 ? void 0 : base.status_msg) ||
                            ((_83 = pollResp.data) === null || _83 === void 0 ? void 0 : _83.status_reason) ||
                            ((_84 = pollResp.data) === null || _84 === void 0 ? void 0 : _84.message) ||
                            ((_85 = pollResp.data) === null || _85 === void 0 ? void 0 : _85.status);
                        res.status(500).json({
                            success: false,
                            error: provider_message
                                ? `MiniMax generation failed: ${provider_message}`
                                : "MiniMax generation failed",
                            provider: "MiniMax",
                            provider_code,
                            provider_message,
                            provider_status: (_86 = pollResp.data) === null || _86 === void 0 ? void 0 : _86.status,
                            details: safeJson(pollResp.data),
                        });
                        return;
                    }
                }
                catch (e) {
                    console.warn("MiniMax poll error (continuing):", (e === null || e === void 0 ? void 0 : e.message) || e);
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
                    const retrieveResp = yield axios_1.default.get("https://api.minimax.io/v1/files/retrieve", {
                        headers: {
                            Authorization: `Bearer ${miniMaxKey}`,
                            "Content-Type": "application/json",
                        },
                        params: { file_id: mmFileId },
                        timeout: 30000,
                    });
                    mmVideoUrl =
                        ((_88 = (_87 = retrieveResp.data) === null || _87 === void 0 ? void 0 : _87.file) === null || _88 === void 0 ? void 0 : _88.download_url) ||
                            ((_89 = retrieveResp.data) === null || _89 === void 0 ? void 0 : _89.download_url) ||
                            null;
                    if (!mmVideoUrl) {
                        console.error("MiniMax retrieve missing download_url", safeJson(retrieveResp.data));
                        res.status(502).json({
                            success: false,
                            error: "MiniMax retrieve missing download_url",
                            provider: "MiniMax",
                            provider_message: "retrieve missing download_url",
                            details: safeJson(retrieveResp.data),
                        });
                        return;
                    }
                }
                catch (e) {
                    console.error("MiniMax retrieve error:", serializeError(e));
                    const respData = (_90 = e === null || e === void 0 ? void 0 : e.response) === null || _90 === void 0 ? void 0 : _90.data;
                    const base = (respData === null || respData === void 0 ? void 0 : respData.base_resp) || {};
                    const provider_code = base === null || base === void 0 ? void 0 : base.status_code;
                    const provider_message = (base === null || base === void 0 ? void 0 : base.status_msg) || (respData === null || respData === void 0 ? void 0 : respData.message) || (e === null || e === void 0 ? void 0 : e.message);
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
                mmStream = yield axios_1.default.get(mmVideoUrl, {
                    responseType: "stream",
                    timeout: 600000,
                });
            }
            catch (e) {
                const respData = (_91 = e === null || e === void 0 ? void 0 : e.response) === null || _91 === void 0 ? void 0 : _91.data;
                const base = (respData === null || respData === void 0 ? void 0 : respData.base_resp) || {};
                const provider_code = base === null || base === void 0 ? void 0 : base.status_code;
                const provider_message = (base === null || base === void 0 ? void 0 : base.status_msg) || (respData === null || respData === void 0 ? void 0 : respData.message) || (e === null || e === void 0 ? void 0 : e.message);
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
                uploadedMiniMax = yield uploadGeneratedVideo(feature, "minimax", mmStream.data);
            }
            catch (e) {
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
        if (!isLumaModel) {
            res.status(400).json({
                success: false,
                error: `Unsupported or unrecognized model: ${rawModel}`,
            });
            return;
        }
        // Step 3 (fallback): Generate video using LumaLabs Dream Machine (Ray 2 - Image to Video)
        const lumaApiKey = process.env.LUMA_API_KEY;
        if (!lumaApiKey) {
            throw new Error("LUMA_API_KEY not set in environment");
        }
        // Map friendly model names to Luma identifiers
        const resolveLumaModel = (val) => {
            const v = val.toString().toLowerCase();
            if (v.includes("1.6"))
                return "ray-1-6";
            if (v.includes("flash"))
                return "ray-flash-2"; // fast Ray 2
            return "ray-2"; // default
        };
        const selectedModel = resolveLumaModel(finalModel); // Use guaranteed string value
        // Build payload per docs: POST https://api.lumalabs.ai/dream-machine/v1/generations
        const lumaPayload = {
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
        const httpsAgent = new https_1.default.Agent({ keepAlive: true, family: 4 });
        const httpAgent = new http_1.default.Agent({ keepAlive: true, family: 4 });
        const isTransient = (err) => {
            var _a;
            const code = (err === null || err === void 0 ? void 0 : err.code) || ((_a = err === null || err === void 0 ? void 0 : err.cause) === null || _a === void 0 ? void 0 : _a.code);
            return [
                "ETIMEDOUT",
                "ENETUNREACH",
                "ECONNRESET",
                "EAI_AGAIN",
                "ESOCKETTIMEDOUT",
            ].includes(code);
        };
        let createGenRes;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                createGenRes = yield axios_1.default.post("https://api.lumalabs.ai/dream-machine/v1/generations", lumaPayload, {
                    headers: {
                        accept: "application/json",
                        "content-type": "application/json",
                        authorization: `Bearer ${lumaApiKey}`,
                    },
                    timeout: 45000,
                    httpsAgent,
                    httpAgent,
                });
                break; // success
            }
            catch (err) {
                const e = err;
                if (attempt < 3 && isTransient(e)) {
                    const backoff = attempt * 2000;
                    console.warn(`Luma create generation transient error (attempt ${attempt}/3):`, (e === null || e === void 0 ? void 0 : e.code) || (e === null || e === void 0 ? void 0 : e.message) || e);
                    yield new Promise((r) => setTimeout(r, backoff));
                    continue;
                }
                console.error("Luma create generation error:", {
                    error: serializeError(e),
                    payload: lumaPayload,
                    serverResponse: (_92 = e === null || e === void 0 ? void 0 : e.response) === null || _92 === void 0 ? void 0 : _92.data,
                });
                const respData = (_93 = e === null || e === void 0 ? void 0 : e.response) === null || _93 === void 0 ? void 0 : _93.data;
                // Prefer detail/message/error from server response for user-facing error
                const userMessage = (respData === null || respData === void 0 ? void 0 : respData.detail) ||
                    (respData === null || respData === void 0 ? void 0 : respData.message) ||
                    (respData === null || respData === void 0 ? void 0 : respData.error) ||
                    (e === null || e === void 0 ? void 0 : e.message);
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
        const generationId = ((_94 = createGenRes.data) === null || _94 === void 0 ? void 0 : _94.id) || ((_96 = (_95 = createGenRes.data) === null || _95 === void 0 ? void 0 : _95.data) === null || _96 === void 0 ? void 0 : _96.id);
        if (!generationId) {
            res.status(500).json({
                success: false,
                error: "No generation id returned from Luma",
                details: safeJson(createGenRes.data),
            });
            return;
        }
        // Poll generation status per docs (statuses: dreaming | completed | failed)
        let videoUrl = null;
        let state = "";
        for (let i = 0; i < 90; i++) {
            // up to ~7.5 minutes (90 * 5s)
            yield new Promise((r) => setTimeout(r, 5000));
            let pollRes;
            try {
                pollRes = yield axios_1.default.get(`https://api.lumalabs.ai/dream-machine/v1/generations/${generationId}`, {
                    headers: {
                        accept: "application/json",
                        authorization: `Bearer ${lumaApiKey}`,
                    },
                    timeout: 25000,
                    httpsAgent,
                    httpAgent,
                });
            }
            catch (err) {
                const e = err;
                if (isTransient(e)) {
                    console.warn("Luma poll transient error, continuing:", (e === null || e === void 0 ? void 0 : e.code) || (e === null || e === void 0 ? void 0 : e.message) || e);
                    continue; // let loop retry after delay
                }
                console.error("Luma poll error:", serializeError(e));
                res.status(500).json({
                    success: false,
                    error: "Failed to poll Luma generation",
                    provider: "Luma",
                    provider_message: e === null || e === void 0 ? void 0 : e.message,
                    details: serializeError(e),
                });
                return;
            }
            // Try to read state/status and the video URL in a robust way
            state =
                ((_97 = pollRes.data) === null || _97 === void 0 ? void 0 : _97.state) ||
                    ((_98 = pollRes.data) === null || _98 === void 0 ? void 0 : _98.status) ||
                    ((_100 = (_99 = pollRes.data) === null || _99 === void 0 ? void 0 : _99.data) === null || _100 === void 0 ? void 0 : _100.state) ||
                    "";
            if (state === "completed") {
                videoUrl =
                    ((_102 = (_101 = pollRes.data) === null || _101 === void 0 ? void 0 : _101.assets) === null || _102 === void 0 ? void 0 : _102.video) ||
                        ((_103 = pollRes.data) === null || _103 === void 0 ? void 0 : _103.video) ||
                        ((_105 = (_104 = pollRes.data) === null || _104 === void 0 ? void 0 : _104.data) === null || _105 === void 0 ? void 0 : _105.video_url) ||
                        ((_109 = (_108 = (_107 = (_106 = pollRes.data) === null || _106 === void 0 ? void 0 : _106.assets) === null || _107 === void 0 ? void 0 : _107.mp4) === null || _108 === void 0 ? void 0 : _108[0]) === null || _109 === void 0 ? void 0 : _109.url) ||
                        null;
                console.log("Luma poll response:", pollRes.data);
                break;
            }
            if (state === "failed") {
                console.error("Luma generation failed:", pollRes.data);
                const provider_message = ((_110 = pollRes.data) === null || _110 === void 0 ? void 0 : _110.failure_reason) ||
                    ((_111 = pollRes.data) === null || _111 === void 0 ? void 0 : _111.error) ||
                    ((_112 = pollRes.data) === null || _112 === void 0 ? void 0 : _112.message) ||
                    ((_113 = pollRes.data) === null || _113 === void 0 ? void 0 : _113.state);
                res.status(500).json({
                    success: false,
                    error: provider_message
                        ? `Luma generation failed: ${provider_message}`
                        : "Luma generation failed",
                    provider: "Luma",
                    provider_status: (_114 = pollRes.data) === null || _114 === void 0 ? void 0 : _114.state,
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
            videoResponse = yield axios_1.default.get(videoUrl, {
                responseType: "stream",
                timeout: 600000,
            });
        }
        catch (err) {
            const e = err;
            console.error("Error downloading Luma video:", ((_115 = e === null || e === void 0 ? void 0 : e.response) === null || _115 === void 0 ? void 0 : _115.data) || e);
            res.status(500).json({
                success: false,
                error: "Failed to download Luma video",
                provider: "Luma",
                provider_message: e === null || e === void 0 ? void 0 : e.message,
                details: serializeError(e),
            });
            return;
        }
        // Upload the video stream to S3
        let uploadedLuma;
        try {
            const variant = selectedModel.replace(/[^a-z0-9-]/gi, "-");
            uploadedLuma = yield uploadGeneratedVideo(feature, variant, videoResponse.data);
        }
        catch (e) {
            yield logAppApiCall(appId, feature, videoType, userModel, "error", "Failed to upload Luma video to S3", Date.now() - startTime);
            res.status(500).json({
                success: false,
                error: "Failed to upload Luma video to S3",
                provider: "Luma",
                details: serializeError(e),
            });
            return;
        }
        // Log successful API call
        yield logAppApiCall(appId, feature, videoType, userModel, "success", undefined, Date.now() - startTime);
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
    }
    catch (error) {
        console.error("Error generating video:", serializeError(error));
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        // Log failed API call
        yield logAppApiCall(appId, feature, videoType, userModel, "error", errorMessage, Date.now() - startTime);
        res.status(500).json({
            success: false,
            error: errorMessage && !/Failed to generate video/.test(errorMessage)
                ? errorMessage
                : "Failed to generate video",
            details: errorMessage,
        });
    }
}));
exports.default = router;
