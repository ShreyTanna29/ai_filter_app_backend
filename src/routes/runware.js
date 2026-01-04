"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const axios_1 = __importDefault(require("axios"));
const https_1 = __importDefault(require("https"));
const apiKey_1 = require("../middleware/apiKey");
// Optional but highly recommended: compress large seed images before upload
// This reduces payload size and avoids gateway timeouts.
let sharp = null; // use 'any' to avoid type resolution when package isn't installed
try {
    // Lazy-load to avoid hard crash if dependency missing at runtime
    sharp = require("sharp");
}
catch (e) {
    sharp = null;
}
const s3_1 = require("../lib/s3");
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const crypto_1 = require("crypto");
dotenv_1.default.config();
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const RUNWARE_API_URL = "https://api.runware.ai/v1";
// EachLabs API for Hunyuan Image V3 model
const EACHLABS_API_URL = "https://api.eachlabs.ai/v1";
// Hunyuan Image V3 - Tencent's text-to-image model via EachLabs
// Supports: prompt, negative_prompt, image_size, num_images, num_inference_steps, guidance_scale, enable_safety_checker, output_format
const HUNYUAN_IMAGE_V3_MODEL_ID = "hunyuan:1@1";
const HUNYUAN_IMAGE_V3_IMAGE_SIZES = [
    "square_hd", // 1024x1024
    "square", // 512x512
    "portrait_4_3", // 768x1024
    "portrait_16_9", // 576x1024
    "landscape_4_3", // 1024x768
    "landscape_16_9", // 1024x576
];
const HUNYUAN_IMAGE_V3_DEFAULT_SIZE = "square_hd";
// Riverflow 1.1 supports a fixed catalog of aspect ratios; enforce to avoid 4xx responses
const RIVERFLOW_MODEL_ID = "sourceful:1@1";
const RIVERFLOW_SIZES = [
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
// Riverflow 1.1 Mini - fast and cost-efficient image editing model, image-to-image with 1-10 reference images
const RIVERFLOW_MINI_MODEL_ID = "sourceful:1@0";
const RIVERFLOW_MINI_SIZES = [
    { width: 1024, height: 1024 }, // 1:1
    { width: 1152, height: 864 }, // 4:3
    { width: 864, height: 1152 }, // 3:4
    { width: 1280, height: 720 }, // 16:9
    { width: 720, height: 1280 }, // 9:16
    { width: 1248, height: 832 }, // 3:2
    { width: 832, height: 1248 }, // 2:3
    { width: 1512, height: 648 }, // 21:9
    { width: 648, height: 1512 }, // 9:21
    { width: 1152, height: 896 }, // 5:4
    { width: 896, height: 1152 }, // 4:5
];
const RIVERFLOW_MINI_DEFAULT_DIMENSION = RIVERFLOW_MINI_SIZES[0]; // 1024x1024
// Riverflow 1.1 Pro - advanced image editing with superior quality, stability, and precision for professional workflows
const RIVERFLOW_PRO_MODEL_ID = "sourceful:1@2";
const RIVERFLOW_PRO_SIZES = [
    { width: 1024, height: 1024 }, // 1:1
    { width: 1152, height: 864 }, // 4:3
    { width: 864, height: 1152 }, // 3:4
    { width: 1280, height: 720 }, // 16:9
    { width: 720, height: 1280 }, // 9:16
    { width: 1248, height: 832 }, // 3:2
    { width: 832, height: 1248 }, // 2:3
    { width: 1512, height: 648 }, // 21:9
    { width: 648, height: 1512 }, // 9:21
    { width: 1152, height: 896 }, // 5:4
    { width: 896, height: 1152 }, // 4:5
];
const RIVERFLOW_PRO_DEFAULT_DIMENSION = RIVERFLOW_PRO_SIZES[0]; // 1024x1024
const SEEDDREAM_MODEL_ID = "bytedance:5@0";
const SEEDDREAM_DIMENSIONS = [
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
// SeedEdit 3.0 - ByteDance's flagship image editing with advanced instruction-following and content preservation
// Output dimensions inherited from reference image (up to 4K), requires exactly 1 reference image
const SEEDEDIT_MODEL_ID = "bytedance:4@1";
// Imagen 4.0 Preview (Google) - text-to-image with improved textures, lighting, typography
const IMAGEN4_MODEL_ID = "google:2@1";
const IMAGEN4_DIMENSIONS = [
    { width: 1024, height: 1024 }, // 1:1
    { width: 768, height: 1408 }, // 9:16
    { width: 1408, height: 768 }, // 16:9
    { width: 896, height: 1280 }, // 3:4
    { width: 1280, height: 896 }, // 4:3
];
const IMAGEN4_DEFAULT_DIMENSION = IMAGEN4_DIMENSIONS[0]; // 1024x1024
// Imagen 4.0 Ultra (Google) - most advanced image model with exceptional detail, color accuracy
const IMAGEN4_ULTRA_MODEL_ID = "google:2@2";
const IMAGEN4_ULTRA_DIMENSIONS = [
    { width: 1024, height: 1024 }, // 1:1
    { width: 768, height: 1408 }, // 9:16
    { width: 1408, height: 768 }, // 16:9
    { width: 896, height: 1280 }, // 3:4
    { width: 1280, height: 896 }, // 4:3
];
const IMAGEN4_ULTRA_DEFAULT_DIMENSION = IMAGEN4_ULTRA_DIMENSIONS[0]; // 1024x1024
// Imagen 4.0 Fast (Google) - optimized for quicker inference with minimal quality loss
const IMAGEN4_FAST_MODEL_ID = "google:2@3";
const IMAGEN4_FAST_DIMENSIONS = [
    { width: 1024, height: 1024 }, // 1:1
    { width: 768, height: 1408 }, // 9:16
    { width: 1408, height: 768 }, // 16:9
    { width: 896, height: 1280 }, // 3:4
    { width: 1280, height: 896 }, // 4:3
];
const IMAGEN4_FAST_DEFAULT_DIMENSION = IMAGEN4_FAST_DIMENSIONS[0]; // 1024x1024
// Nano Banana (Gemini Flash Image 2.5) - multimodal AI image generation with text-to-image and image-to-image
const NANO_BANANA_MODEL_ID = "google:4@1";
const NANO_BANANA_DIMENSIONS = [
    { width: 1024, height: 1024 }, // 1:1
    { width: 1248, height: 832 }, // 3:2
    { width: 832, height: 1248 }, // 2:3
    { width: 1184, height: 864 }, // 4:3
    { width: 864, height: 1184 }, // 3:4
    { width: 1152, height: 896 }, // 5:4
    { width: 896, height: 1152 }, // 4:5
    { width: 1344, height: 768 }, // 16:9
    { width: 768, height: 1344 }, // 9:16
    { width: 1536, height: 672 }, // 21:9
];
const NANO_BANANA_DEFAULT_DIMENSION = NANO_BANANA_DIMENSIONS[0]; // 1024x1024
// Nano Banana 2 Pro (Gemini 3 Pro Image Preview) - advanced tier with professional-grade controls and high-res output
const NANO_BANANA_PRO_MODEL_ID = "google:4@2";
const NANO_BANANA_PRO_DIMENSIONS = [
    // 1K dimensions
    { width: 1024, height: 1024 }, // 1:1
    { width: 1264, height: 848 }, // 3:2
    { width: 848, height: 1264 }, // 2:3
    { width: 1200, height: 896 }, // 4:3
    { width: 896, height: 1200 }, // 3:4
    { width: 928, height: 1152 }, // 4:5
    { width: 1152, height: 928 }, // 5:4
    { width: 768, height: 1376 }, // 9:16
    { width: 1376, height: 768 }, // 16:9
    { width: 1548, height: 672 }, // 21:9
    { width: 1584, height: 672 }, // 21:9 alt
    // 2K dimensions
    { width: 2048, height: 2048 }, // 1:1
    { width: 2528, height: 1696 }, // 3:2
    { width: 1696, height: 2528 }, // 2:3
    { width: 2400, height: 1792 }, // 4:3
    { width: 1792, height: 2400 }, // 3:4
    { width: 1856, height: 2304 }, // 4:5
    { width: 2304, height: 1856 }, // 5:4
    { width: 1536, height: 2752 }, // 9:16
    { width: 2752, height: 1536 }, // 16:9
    { width: 3168, height: 1344 }, // 21:9
];
const NANO_BANANA_PRO_DEFAULT_DIMENSION = NANO_BANANA_PRO_DIMENSIONS[0]; // 1024x1024
// GPT Image 1 - OpenAI's image generation model with quality and background options
const GPT_IMAGE_1_MODEL_ID = "openai:1@1";
const GPT_IMAGE_1_DIMENSIONS = [
    { width: 1024, height: 1024 }, // 1:1
    { width: 1536, height: 1024 }, // 3:2 landscape
    { width: 1024, height: 1536 }, // 2:3 portrait
];
const GPT_IMAGE_1_DEFAULT_DIMENSION = GPT_IMAGE_1_DIMENSIONS[0]; // 1024x1024
// FLUX.1 Schnell - Black Forest Labs' fastest model
const FLUX1_SCHNELL_MODEL_ID = "bfl:2@1";
// FLUX.1 Dev - Black Forest Labs' development model
const FLUX1_DEV_MODEL_ID = "bfl:1@8";
// FLUX.1 Pro - Black Forest Labs' professional model
const FLUX1_PRO_MODEL_ID = "bfl:1@4";
// FLUX.2 [dev] - Black Forest Labs' open weights model with full architectural control
// Dimensions: 512-2048 pixels (multiples of 16), up to 4 reference images
// CFG Scale: 1-20 (default 4), Steps: 1-50, Acceleration: none/low/medium/high
const FLUX2_DEV_MODEL_ID = "runware:400@1";
// HiDream Fast - Fast image generation model via Runware
const HIDREAM_FAST_MODEL_ID = "runware:97@3";
// HiDream Dev - Development image generation model via Runware
const HIDREAM_DEV_MODEL_ID = "runware:97@2";
// HiDream Full - Full quality image generation model via Runware
const HIDREAM_FULL_MODEL_ID = "runware:97@1";
// Qwen Image - Alibaba's image generation model via Runware
const QWEN_IMAGE_MODEL_ID = "runware:108@1";
// Qwen Image Edit Plus - Alibaba's image editing model via Runware
const QWEN_IMAGE_EDIT_PLUS_MODEL_ID = "runware:108@22";
// Midjourney V7 - Next-generation Midjourney with enhanced realism and control
// Supports: text-to-image, image-to-image, 1 reference image via inputs.referenceImages
// Number of results: Must be multiple of 4 (4, 8, 12, 16, 20, Default: 4)
const MIDJOURNEY_V7_MODEL_ID = "midjourney:3@1";
const MIDJOURNEY_V7_DIMENSIONS = [
    { width: 1456, height: 816 }, // 16:9
    { width: 816, height: 1456 }, // 9:16
    { width: 1024, height: 1024 }, // 1:1
    { width: 1232, height: 928 }, // 4:3
    { width: 928, height: 1232 }, // 3:4
    { width: 1344, height: 896 }, // 3:2
    { width: 896, height: 1344 }, // 2:3
    { width: 1680, height: 720 }, // 21:9
];
const MIDJOURNEY_V7_DEFAULT_DIMENSION = MIDJOURNEY_V7_DIMENSIONS[0]; // 1456x816 (16:9)
const IDEOGRAM_MODEL_ID = "ideogram:4@1";
const IDEOGRAM_REMIX_MODEL_ID = "ideogram:4@2";
const IDEOGRAM_EDIT_MODEL_ID = "ideogram:4@3";
const IDEOGRAM_REFRAME_MODEL_ID = "ideogram:4@4";
const IDEOGRAM_BASE_DIMENSIONS = [
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
const IDEOGRAM_REMIX_BASE_DIMENSIONS = [
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
// Ideogram 3.0 Edit (Inpainting) supported dimensions
const IDEOGRAM_EDIT_BASE_DIMENSIONS = [
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
    { width: 736, height: 1312 },
    { width: 704, height: 1280 },
    { width: 704, height: 1344 },
    { width: 704, height: 1408 },
    { width: 704, height: 1472 },
    { width: 640, height: 1344 },
    { width: 640, height: 1408 },
    { width: 640, height: 1472 },
    { width: 640, height: 1536 },
    { width: 576, height: 1408 },
    { width: 576, height: 1472 },
    { width: 576, height: 1536 },
    { width: 512, height: 1536 },
];
// Ideogram 3.0 Reframe (Outpainting) supported dimensions
const IDEOGRAM_REFRAME_BASE_DIMENSIONS = [
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
    { width: 736, height: 1312 },
    { width: 704, height: 1280 },
    { width: 704, height: 1344 },
    { width: 704, height: 1408 },
    { width: 704, height: 1472 },
    { width: 640, height: 1344 },
    { width: 640, height: 1408 },
    { width: 640, height: 1472 },
    { width: 640, height: 1536 },
    { width: 576, height: 1408 },
    { width: 576, height: 1472 },
    { width: 576, height: 1536 },
    { width: 512, height: 1536 },
];
function buildDimensionCatalog(base) {
    const values = [];
    const seen = new Set();
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
const IDEOGRAM_REMIX_DIMENSIONS = buildDimensionCatalog(IDEOGRAM_REMIX_BASE_DIMENSIONS);
const IDEOGRAM_EDIT_DIMENSIONS = buildDimensionCatalog(IDEOGRAM_EDIT_BASE_DIMENSIONS);
const IDEOGRAM_REFRAME_DIMENSIONS = buildDimensionCatalog(IDEOGRAM_REFRAME_BASE_DIMENSIONS);
const IDEOGRAM_DEFAULT_DIMENSION = IDEOGRAM_DIMENSIONS.find((d) => d.width === 1024 && d.height === 1024) || { width: 1024, height: 1024 };
const IDEOGRAM_REMIX_DEFAULT_DIMENSION = IDEOGRAM_REMIX_DIMENSIONS.find((d) => d.width === 1024 && d.height === 1024) || { width: 1024, height: 1024 };
const IDEOGRAM_EDIT_DEFAULT_DIMENSION = IDEOGRAM_EDIT_DIMENSIONS.find((d) => d.width === 1024 && d.height === 1024) || { width: 1024, height: 1024 };
const IDEOGRAM_REFRAME_DEFAULT_DIMENSION = IDEOGRAM_REFRAME_DIMENSIONS.find((d) => d.width === 1024 && d.height === 1024) || { width: 1024, height: 1024 };
// Logging helper function with timestamps
function logWithTimestamp(message, data) {
    const timestamp = new Date().toISOString();
    if (data) {
        console.log(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2));
    }
    else {
        console.log(`[${timestamp}] ${message}`);
    }
}
// Reuse a keep-alive agent to improve large POST stability
const httpsAgent = new https_1.default.Agent({ keepAlive: true });
function postRunware(payload_1) {
    return __awaiter(this, arguments, void 0, function* (payload, timeoutMs = 180000) {
        return axios_1.default.post(RUNWARE_API_URL, payload, {
            headers: getRunwareHeaders(),
            timeout: timeoutMs,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            httpsAgent,
            // Follow-redirects is already used by axios in Node; agent helps keep the socket alive
        });
    });
}
function postRunwareWithRetry(payload_1) {
    return __awaiter(this, arguments, void 0, function* (payload, timeoutMs = 180000, retries = 1) {
        var _a;
        let lastErr = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return yield postRunware(payload, timeoutMs);
            }
            catch (err) {
                lastErr = err;
                const code = (err === null || err === void 0 ? void 0 : err.code) || ((_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.status);
                const isTimeout = code === "ECONNABORTED" ||
                    code === "ETIMEDOUT" ||
                    code === 408 ||
                    code === 504 ||
                    code === 524;
                if (attempt < retries && isTimeout) {
                    // brief backoff then retry
                    yield new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
                    continue;
                }
                throw err;
            }
        }
        throw lastErr;
    });
}
function resolveRiverflowSize(width, height) {
    const parsedWidth = parseInt(String(width || ""), 10);
    const parsedHeight = parseInt(String(height || ""), 10);
    if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
        const match = RIVERFLOW_SIZES.find((dim) => dim.width === parsedWidth && dim.height === parsedHeight);
        if (match) {
            return match;
        }
    }
    return RIVERFLOW_SIZES[0];
}
function resolveRiverflowMiniSize(width, height) {
    const parsedWidth = parseInt(String(width || ""), 10);
    const parsedHeight = parseInt(String(height || ""), 10);
    if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
        const match = RIVERFLOW_MINI_SIZES.find((dim) => dim.width === parsedWidth && dim.height === parsedHeight);
        if (match)
            return match;
    }
    return RIVERFLOW_MINI_DEFAULT_DIMENSION;
}
function resolveRiverflowProSize(width, height) {
    const parsedWidth = parseInt(String(width || ""), 10);
    const parsedHeight = parseInt(String(height || ""), 10);
    if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
        const match = RIVERFLOW_PRO_SIZES.find((dim) => dim.width === parsedWidth && dim.height === parsedHeight);
        if (match)
            return match;
    }
    return RIVERFLOW_PRO_DEFAULT_DIMENSION;
}
function resolveSeeddreamSize(width, height) {
    const parsedWidth = parseInt(String(width || ""), 10);
    const parsedHeight = parseInt(String(height || ""), 10);
    if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
        const match = SEEDDREAM_DIMENSIONS.find((dim) => dim.width === parsedWidth && dim.height === parsedHeight);
        if (match)
            return match;
    }
    return SEEDDREAM_DIMENSIONS[0];
}
function resolveImagen4Size(width, height) {
    const parsedWidth = parseInt(String(width || ""), 10);
    const parsedHeight = parseInt(String(height || ""), 10);
    if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
        const match = IMAGEN4_DIMENSIONS.find((dim) => dim.width === parsedWidth && dim.height === parsedHeight);
        if (match)
            return match;
    }
    return IMAGEN4_DEFAULT_DIMENSION;
}
function resolveImagen4UltraSize(width, height) {
    const parsedWidth = parseInt(String(width || ""), 10);
    const parsedHeight = parseInt(String(height || ""), 10);
    if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
        const match = IMAGEN4_ULTRA_DIMENSIONS.find((dim) => dim.width === parsedWidth && dim.height === parsedHeight);
        if (match)
            return match;
    }
    return IMAGEN4_ULTRA_DEFAULT_DIMENSION;
}
function resolveImagen4FastSize(width, height) {
    const parsedWidth = parseInt(String(width || ""), 10);
    const parsedHeight = parseInt(String(height || ""), 10);
    if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
        const match = IMAGEN4_FAST_DIMENSIONS.find((dim) => dim.width === parsedWidth && dim.height === parsedHeight);
        if (match)
            return match;
    }
    return IMAGEN4_FAST_DEFAULT_DIMENSION;
}
function resolveNanoBananaSize(width, height) {
    const parsedWidth = parseInt(String(width || ""), 10);
    const parsedHeight = parseInt(String(height || ""), 10);
    if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
        const match = NANO_BANANA_DIMENSIONS.find((dim) => dim.width === parsedWidth && dim.height === parsedHeight);
        if (match)
            return match;
    }
    return NANO_BANANA_DEFAULT_DIMENSION;
}
function resolveNanoBananaProSize(width, height) {
    const parsedWidth = parseInt(String(width || ""), 10);
    const parsedHeight = parseInt(String(height || ""), 10);
    if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
        const match = NANO_BANANA_PRO_DIMENSIONS.find((dim) => dim.width === parsedWidth && dim.height === parsedHeight);
        if (match)
            return match;
    }
    return NANO_BANANA_PRO_DEFAULT_DIMENSION;
}
function resolveGptImage1Size(width, height) {
    const parsedWidth = parseInt(String(width || ""), 10);
    const parsedHeight = parseInt(String(height || ""), 10);
    if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
        const match = GPT_IMAGE_1_DIMENSIONS.find((dim) => dim.width === parsedWidth && dim.height === parsedHeight);
        if (match)
            return match;
    }
    return GPT_IMAGE_1_DEFAULT_DIMENSION;
}
function resolveIdeogramSize(width, height) {
    const parsedWidth = parseInt(String(width || ""), 10);
    const parsedHeight = parseInt(String(height || ""), 10);
    if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
        const match = IDEOGRAM_DIMENSIONS.find((dim) => dim.width === parsedWidth && dim.height === parsedHeight);
        if (match)
            return match;
    }
    return IDEOGRAM_DEFAULT_DIMENSION;
}
function resolveIdeogramRemixSize(width, height) {
    const parsedWidth = parseInt(String(width || ""), 10);
    const parsedHeight = parseInt(String(height || ""), 10);
    if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
        const match = IDEOGRAM_REMIX_DIMENSIONS.find((dim) => dim.width === parsedWidth && dim.height === parsedHeight);
        if (match)
            return match;
    }
    return IDEOGRAM_REMIX_DEFAULT_DIMENSION;
}
function resolveIdeogramEditSize(width, height) {
    const parsedWidth = parseInt(String(width || ""), 10);
    const parsedHeight = parseInt(String(height || ""), 10);
    if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
        const match = IDEOGRAM_EDIT_DIMENSIONS.find((dim) => dim.width === parsedWidth && dim.height === parsedHeight);
        if (match)
            return match;
    }
    return IDEOGRAM_EDIT_DEFAULT_DIMENSION;
}
function resolveIdeogramReframeSize(width, height) {
    const parsedWidth = parseInt(String(width || ""), 10);
    const parsedHeight = parseInt(String(height || ""), 10);
    if (!Number.isNaN(parsedWidth) && !Number.isNaN(parsedHeight)) {
        const match = IDEOGRAM_REFRAME_DIMENSIONS.find((dim) => dim.width === parsedWidth && dim.height === parsedHeight);
        if (match)
            return match;
    }
    return IDEOGRAM_REFRAME_DEFAULT_DIMENSION;
}
function getRunwareHeaders() {
    const key = process.env.RUNWARE_API_KEY || process.env.RUNWARE_KEY;
    if (!key) {
        throw new Error("RUNWARE_API_KEY not set. Please configure your Runware API key in environment variables.");
    }
    return {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
    };
}
// POST /api/runware/upload-image
// Accepts multipart/form-data (field: image) OR JSON body { imageUrl }
router.post("/runware/upload-image", apiKey_1.requireApiKey, upload.single("image"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    const requestStartTime = Date.now();
    try {
        let imageParam;
        const urlFromBody = (_a = req.body) === null || _a === void 0 ? void 0 : _a.imageUrl;
        if (req.file && req.file.buffer) {
            // If sharp is available, resize/compress overly large images to avoid 60s gateway timeouts
            let buf = req.file.buffer;
            const isLarge = buf.length > 3 * 1024 * 1024; // >3MB
            let outMime = req.file.mimetype || "image/png";
            if (sharp && isLarge) {
                try {
                    // Convert to JPEG with max dimension 1536px to shrink payload substantially
                    const pipeline = sharp(buf).rotate();
                    const meta = yield pipeline.metadata();
                    const maxDim = 1536;
                    const needsResize = (meta.width || 0) > maxDim || (meta.height || 0) > maxDim;
                    let s = pipeline;
                    if (needsResize) {
                        s = s.resize({
                            width: meta.width && meta.width > (meta.height || 0)
                                ? maxDim
                                : undefined,
                            height: meta.height && (meta.height || 0) >= (meta.width || 0)
                                ? maxDim
                                : undefined,
                            fit: "inside",
                        });
                    }
                    buf = yield s.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
                    outMime = "image/jpeg";
                }
                catch (e) {
                    // fall back to original buffer
                }
            }
            const base64 = buf.toString("base64");
            imageParam = `data:${outMime};base64,${base64}`;
        }
        else if (urlFromBody && typeof urlFromBody === "string") {
            imageParam = urlFromBody;
        }
        else {
            res.status(400).json({
                success: false,
                error: "No image provided. Send multipart 'image' or JSON { imageUrl }.",
            });
            return;
        }
        logWithTimestamp("[UPLOAD-IMAGE] Request received", {
            hasFile: !!req.file,
            hasUrl: !!urlFromBody,
            fileSize: (_b = req.file) === null || _b === void 0 ? void 0 : _b.size,
        });
        const payload = [
            {
                taskType: "imageUpload",
                taskUUID: (0, crypto_1.randomUUID)(),
                image: imageParam,
            },
        ];
        // Longer timeout and retry to be resilient to network slowness on large payloads
        const response = yield postRunwareWithRetry(payload, 180000, 1);
        const data = response.data;
        const obj = Array.isArray(data === null || data === void 0 ? void 0 : data.data) ? data.data[0] : data === null || data === void 0 ? void 0 : data.data;
        const imageUUID = obj === null || obj === void 0 ? void 0 : obj.imageUUID;
        if (!imageUUID) {
            res.status(502).json({
                success: false,
                error: "Runware image upload did not return imageUUID",
                details: data,
            });
            return;
        }
        logWithTimestamp("[UPLOAD-IMAGE] Success", {
            imageUUID,
            processingTimeMs: Date.now() - requestStartTime,
        });
        res.json({ success: true, imageUUID });
        return;
    }
    catch (err) {
        // Avoid logging full axios config (may include secrets); surface concise message
        const msg = ((_f = (_e = (_d = (_c = err === null || err === void 0 ? void 0 : err.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.errors) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.message) ||
            (err === null || err === void 0 ? void 0 : err.message) ||
            "Unknown error";
        logWithTimestamp("[UPLOAD-IMAGE] Error", {
            error: msg,
            status: (_g = err === null || err === void 0 ? void 0 : err.response) === null || _g === void 0 ? void 0 : _g.status,
            processingTimeMs: Date.now() - requestStartTime,
        });
        res.status(500).json({
            success: false,
            error: msg || "Upload failed",
        });
        return;
    }
}));
// POST /api/runware/generate-photo
// JSON body: { feature?: string, prompt?: string, model?: string, width?: number, height?: number, seedImage?: string }
// If feature is provided, prompt and model are fetched from Photo_Features table
router.post("/runware/generate-photo", apiKey_1.requireApiKey, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    const requestStartTime = Date.now();
    try {
        const { feature, prompt, model, width, height, seedImage, maskImage, negativePrompt, steps, cfgScale, numberResults, ideogramSettings, referenceImages, referenceImage, referenceImageUUID, } = req.body || {};
        logWithTimestamp("[GENERATE-PHOTO] Request received", {
            feature,
            model,
            prompt: prompt === null || prompt === void 0 ? void 0 : prompt.substring(0, 100),
            width,
            height,
            numberResults,
            hasSeedImage: !!seedImage,
            hasReferenceImages: !!(referenceImages ||
                referenceImage ||
                referenceImageUUID),
        });
        // If feature is provided, fetch prompt and model from Photo_Features table
        let resolvedPrompt = prompt;
        let resolvedModel = model;
        if (feature && typeof feature === "string") {
            try {
                const photoFeature = yield prisma_1.default.photo_Features.findUnique({
                    where: { endpoint: feature.trim() },
                    select: { prompt: true, model: true },
                });
                if (!photoFeature) {
                    res.status(404).json({
                        success: false,
                        error: `Photo feature '${feature}' not found`,
                    });
                    return;
                }
                // Use feature's prompt if not explicitly provided
                if (!resolvedPrompt) {
                    resolvedPrompt = photoFeature.prompt;
                }
                // Use feature's model if not explicitly provided
                if (!resolvedModel && photoFeature.model) {
                    resolvedModel = photoFeature.model;
                }
            }
            catch (dbErr) {
                console.error("Failed to fetch prompt/model from Photo_Features:", (dbErr === null || dbErr === void 0 ? void 0 : dbErr.message) || dbErr);
                res.status(500).json({
                    success: false,
                    error: "Failed to fetch photo feature details",
                });
                return;
            }
        }
        // Validate prompt is available (either from request or database)
        const rawPrompt = typeof resolvedPrompt === "string" ? resolvedPrompt : "";
        const promptText = rawPrompt.trim();
        if (!promptText) {
            res.status(400).json({
                success: false,
                error: "'prompt' is required (either in request or via feature)",
            });
            return;
        }
        // Model normalization: map friendly aliases to known model IDs when possible
        const clientModel = (resolvedModel && String(resolvedModel)) || "";
        const normalizedModel = clientModel.trim().toLowerCase();
        let chosenModel = clientModel || "bfl:2@1"; // default to a stable FLUX variant
        if (/^flux[-_\s]*schnell$/i.test(clientModel)) {
            chosenModel = "bfl:2@1";
        }
        else if (/^flux[-_\s]*1[-_\s]*dev$/i.test(clientModel) ||
            /^flux\.?1[-_\s]*dev$/i.test(clientModel) ||
            normalizedModel === "flux 1 dev" ||
            normalizedModel === "flux.1 dev" ||
            normalizedModel === "flux1dev") {
            chosenModel = FLUX1_DEV_MODEL_ID;
        }
        else if (/^flux[-_\s]*1[-_\s]*pro$/i.test(clientModel) ||
            /^flux\.?1[-_\s]*pro$/i.test(clientModel) ||
            normalizedModel === "flux 1 pro" ||
            normalizedModel === "flux.1 pro" ||
            normalizedModel === "flux1pro") {
            chosenModel = FLUX1_PRO_MODEL_ID;
        }
        else if (normalizedModel === "seeddream" ||
            normalizedModel === "seeddream4" ||
            normalizedModel === "seeddream 4" ||
            normalizedModel === "seeddream 4.0") {
            chosenModel = SEEDDREAM_MODEL_ID;
        }
        else if (normalizedModel === "ideogram" ||
            normalizedModel === "ideogram 3" ||
            normalizedModel === "ideogram 3.0") {
            chosenModel = IDEOGRAM_MODEL_ID;
        }
        else if (normalizedModel === "ideogram remix" ||
            normalizedModel === "ideogram 3 remix" ||
            normalizedModel === "ideogram 3.0 remix" ||
            normalizedModel === "ideogram remix 3.0") {
            chosenModel = IDEOGRAM_REMIX_MODEL_ID;
        }
        else if (normalizedModel === "imagen" ||
            normalizedModel === "imagen 4" ||
            normalizedModel === "imagen 4.0" ||
            normalizedModel === "imagen4" ||
            normalizedModel === "imagen 4 preview" ||
            normalizedModel === "imagen 4.0 preview") {
            chosenModel = IMAGEN4_MODEL_ID;
        }
        else if (normalizedModel === "imagen ultra" ||
            normalizedModel === "imagen 4 ultra" ||
            normalizedModel === "imagen 4.0 ultra" ||
            normalizedModel === "imagen4ultra") {
            chosenModel = IMAGEN4_ULTRA_MODEL_ID;
        }
        else if (normalizedModel === "imagen fast" ||
            normalizedModel === "imagen 4 fast" ||
            normalizedModel === "imagen 4.0 fast" ||
            normalizedModel === "imagen4fast") {
            chosenModel = IMAGEN4_FAST_MODEL_ID;
        }
        else if (normalizedModel === "nano banana" ||
            normalizedModel === "nanobanana" ||
            normalizedModel === "gemini flash" ||
            normalizedModel === "gemini flash image" ||
            normalizedModel === "gemini flash image 2.5") {
            chosenModel = NANO_BANANA_MODEL_ID;
        }
        else if (normalizedModel === "nano banana 2 pro" ||
            normalizedModel === "nano banana pro" ||
            normalizedModel === "nanobanana2pro" ||
            normalizedModel === "gemini 3 pro" ||
            normalizedModel === "gemini 3 pro image" ||
            normalizedModel === "gemini 3 pro image preview") {
            chosenModel = NANO_BANANA_PRO_MODEL_ID;
        }
        else if (normalizedModel === "gpt image 1" ||
            normalizedModel === "gptimage1" ||
            normalizedModel === "gpt-image-1" ||
            normalizedModel === "gpt image" ||
            normalizedModel === "gptimage") {
            chosenModel = GPT_IMAGE_1_MODEL_ID;
        }
        else if (normalizedModel === "flux 2 dev" ||
            normalizedModel === "flux2 dev" ||
            normalizedModel === "flux.2 dev" ||
            normalizedModel === "flux.2 [dev]" ||
            normalizedModel === "flux2dev") {
            chosenModel = FLUX2_DEV_MODEL_ID;
        }
        else if (normalizedModel === "hidream fast" ||
            normalizedModel === "hidreamfast" ||
            normalizedModel === "hidream-fast" ||
            normalizedModel === "hi dream fast") {
            chosenModel = HIDREAM_FAST_MODEL_ID;
        }
        else if (normalizedModel === "hidream dev" ||
            normalizedModel === "hidreamdev" ||
            normalizedModel === "hidream-dev" ||
            normalizedModel === "hi dream dev") {
            chosenModel = HIDREAM_DEV_MODEL_ID;
        }
        else if (normalizedModel === "hidream full" ||
            normalizedModel === "hidreamfull" ||
            normalizedModel === "hidream-full" ||
            normalizedModel === "hi dream full") {
            chosenModel = HIDREAM_FULL_MODEL_ID;
        }
        else if (normalizedModel === "qwen image" ||
            normalizedModel === "qwen-image" ||
            normalizedModel === "qwenimage" ||
            normalizedModel === "qwen") {
            chosenModel = QWEN_IMAGE_MODEL_ID;
        }
        else if (normalizedModel === "qwen image edit plus" ||
            normalizedModel === "qwen-image-edit-plus" ||
            normalizedModel === "qwenimageeditplus" ||
            normalizedModel === "qwen edit plus" ||
            normalizedModel === "qwen edit") {
            chosenModel = QWEN_IMAGE_EDIT_PLUS_MODEL_ID;
        }
        else if (normalizedModel === "hunyuan" ||
            normalizedModel === "hunyuan image" ||
            normalizedModel === "hunyuan image v3" ||
            normalizedModel === "hunyuan-image-v3" ||
            normalizedModel === "hunyuanimagev3" ||
            normalizedModel === "hunyuan v3") {
            chosenModel = HUNYUAN_IMAGE_V3_MODEL_ID;
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
        if (clientModel === IMAGEN4_MODEL_ID) {
            chosenModel = IMAGEN4_MODEL_ID;
        }
        if (clientModel === IMAGEN4_ULTRA_MODEL_ID) {
            chosenModel = IMAGEN4_ULTRA_MODEL_ID;
        }
        if (clientModel === IMAGEN4_FAST_MODEL_ID) {
            chosenModel = IMAGEN4_FAST_MODEL_ID;
        }
        if (clientModel === NANO_BANANA_MODEL_ID) {
            chosenModel = NANO_BANANA_MODEL_ID;
        }
        if (clientModel === NANO_BANANA_PRO_MODEL_ID) {
            chosenModel = NANO_BANANA_PRO_MODEL_ID;
        }
        if (clientModel === GPT_IMAGE_1_MODEL_ID) {
            chosenModel = GPT_IMAGE_1_MODEL_ID;
        }
        if (clientModel === FLUX2_DEV_MODEL_ID) {
            chosenModel = FLUX2_DEV_MODEL_ID;
        }
        if (clientModel === HIDREAM_FAST_MODEL_ID) {
            chosenModel = HIDREAM_FAST_MODEL_ID;
        }
        if (clientModel === HIDREAM_DEV_MODEL_ID) {
            chosenModel = HIDREAM_DEV_MODEL_ID;
        }
        if (clientModel === HIDREAM_FULL_MODEL_ID) {
            chosenModel = HIDREAM_FULL_MODEL_ID;
        }
        if (clientModel === QWEN_IMAGE_MODEL_ID) {
            chosenModel = QWEN_IMAGE_MODEL_ID;
        }
        if (clientModel === QWEN_IMAGE_EDIT_PLUS_MODEL_ID) {
            chosenModel = QWEN_IMAGE_EDIT_PLUS_MODEL_ID;
        }
        if (clientModel === HUNYUAN_IMAGE_V3_MODEL_ID) {
            chosenModel = HUNYUAN_IMAGE_V3_MODEL_ID;
        }
        // FLUX.1 models - pass through as-is if they match the AIR format
        if (clientModel === FLUX1_SCHNELL_MODEL_ID) {
            chosenModel = FLUX1_SCHNELL_MODEL_ID;
        }
        if (clientModel === FLUX1_DEV_MODEL_ID) {
            chosenModel = FLUX1_DEV_MODEL_ID;
        }
        if (clientModel === FLUX1_PRO_MODEL_ID) {
            chosenModel = FLUX1_PRO_MODEL_ID;
        }
        // Hunyuan Image V3 uses EachLabs API - handle inline
        const isHunyuanImageV3 = chosenModel === HUNYUAN_IMAGE_V3_MODEL_ID;
        if (isHunyuanImageV3) {
            // Handle Hunyuan generation via EachLabs API
            let resolvedImageSize = HUNYUAN_IMAGE_V3_DEFAULT_SIZE;
            const w = parseInt(String(width || ""), 10);
            const h = parseInt(String(height || ""), 10);
            if (w && h) {
                const ratio = w / h;
                if (Math.abs(ratio - 1) < 0.1) {
                    resolvedImageSize = w >= 1024 ? "square_hd" : "square";
                }
                else if (ratio > 1.5) {
                    resolvedImageSize = "landscape_16_9";
                }
                else if (ratio > 1.2) {
                    resolvedImageSize = "landscape_4_3";
                }
                else if (ratio < 0.67) {
                    resolvedImageSize = "portrait_16_9";
                }
                else if (ratio < 0.85) {
                    resolvedImageSize = "portrait_4_3";
                }
                else {
                    resolvedImageSize = "square_hd";
                }
            }
            const input = {
                prompt: promptText,
                image_size: resolvedImageSize,
            };
            if (negativePrompt && typeof negativePrompt === "string") {
                input.negative_prompt = negativePrompt.trim();
            }
            if (numberResults) {
                const num = parseInt(String(numberResults), 10);
                if (!Number.isNaN(num)) {
                    input.num_images = Math.max(1, Math.min(4, num));
                }
            }
            if (steps) {
                const stepsNum = parseInt(String(steps), 10);
                if (!Number.isNaN(stepsNum)) {
                    input.num_inference_steps = Math.max(1, Math.min(100, stepsNum));
                }
            }
            if (cfgScale) {
                const scale = parseFloat(String(cfgScale));
                if (!Number.isNaN(scale)) {
                    input.guidance_scale = Math.max(0, Math.min(20, scale));
                }
            }
            const predictionPayload = {
                model: "hunyuan-image-v3-text-to-image",
                version: "0.0.1",
                input,
            };
            const headers = getEachLabsHeaders();
            let createResponse;
            try {
                createResponse = yield axios_1.default.post(`${EACHLABS_API_URL}/prediction/`, predictionPayload, { headers, timeout: 30000 });
            }
            catch (apiErr) {
                const errorData = ((_a = apiErr === null || apiErr === void 0 ? void 0 : apiErr.response) === null || _a === void 0 ? void 0 : _a.data) || {};
                const errorDetails = errorData.details ||
                    errorData.error ||
                    (apiErr === null || apiErr === void 0 ? void 0 : apiErr.message) ||
                    "Unknown error";
                console.error("EachLabs API error:", errorData);
                res.status(((_b = apiErr === null || apiErr === void 0 ? void 0 : apiErr.response) === null || _b === void 0 ? void 0 : _b.status) || 500).json({
                    success: false,
                    error: errorDetails,
                    details: errorData,
                });
                return;
            }
            const predictionId = ((_c = createResponse.data) === null || _c === void 0 ? void 0 : _c.id) || ((_d = createResponse.data) === null || _d === void 0 ? void 0 : _d.prediction_id);
            if (!predictionId) {
                res.status(502).json({
                    success: false,
                    error: "EachLabs did not return a prediction ID",
                    details: createResponse.data,
                });
                return;
            }
            const result = yield pollEachLabsPrediction(predictionId);
            const output = (result === null || result === void 0 ? void 0 : result.output) || (result === null || result === void 0 ? void 0 : result.result) || result;
            let imageURL;
            if (Array.isArray(output === null || output === void 0 ? void 0 : output.images) && output.images.length > 0) {
                imageURL = output.images[0];
            }
            else if (typeof (output === null || output === void 0 ? void 0 : output.image) === "string") {
                imageURL = output.image;
            }
            else if (typeof output === "string") {
                imageURL = output;
            }
            else if (Array.isArray(output) && output.length > 0) {
                imageURL = typeof output[0] === "string" ? output[0] : (_e = output[0]) === null || _e === void 0 ? void 0 : _e.url;
            }
            if (!imageURL) {
                res.status(502).json({
                    success: false,
                    error: "EachLabs did not return an image URL",
                    details: result,
                });
                return;
            }
            try {
                yield prisma_1.default.generated_Photo.create({
                    data: {
                        feature: String(feature || "hunyuan-image-v3"),
                        url: imageURL,
                    },
                });
            }
            catch (e) {
                console.warn("Failed to persist Hunyuan Generated_Photo:", (e === null || e === void 0 ? void 0 : e.message) || e);
            }
            res.json({
                success: true,
                image: { url: imageURL },
                predictionId,
            });
            return;
        }
        const isSeeddream = chosenModel === SEEDDREAM_MODEL_ID;
        const isImagen4 = chosenModel === IMAGEN4_MODEL_ID;
        const isImagen4Ultra = chosenModel === IMAGEN4_ULTRA_MODEL_ID;
        const isImagen4Fast = chosenModel === IMAGEN4_FAST_MODEL_ID;
        const isNanoBanana = chosenModel === NANO_BANANA_MODEL_ID;
        const isNanoBananaPro = chosenModel === NANO_BANANA_PRO_MODEL_ID;
        const isGptImage1 = chosenModel === GPT_IMAGE_1_MODEL_ID;
        const isImagen4Family = isImagen4 || isImagen4Ultra || isImagen4Fast;
        const isNanoBananaFamily = isNanoBanana || isNanoBananaPro;
        const isGoogleFamily = isImagen4Family || isNanoBananaFamily;
        const isOpenAIFamily = isGptImage1;
        const isIdeogram = chosenModel === IDEOGRAM_MODEL_ID;
        const isIdeogramRemix = chosenModel === IDEOGRAM_REMIX_MODEL_ID;
        const isIdeogramEdit = chosenModel === IDEOGRAM_EDIT_MODEL_ID;
        const isIdeogramReframe = chosenModel === IDEOGRAM_REFRAME_MODEL_ID;
        const isIdeogramFamily = isIdeogram || isIdeogramRemix || isIdeogramEdit || isIdeogramReframe;
        const isMidjourneyV7 = chosenModel === MIDJOURNEY_V7_MODEL_ID;
        const referenceImageInputs = [];
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
        if (isImagen4Family &&
            (promptText.length < 2 || promptText.length > 3000)) {
            res.status(400).json({
                success: false,
                error: "Imagen 4 prompt must be between 2 and 3000 characters.",
            });
            return;
        }
        if (isNanoBanana && (promptText.length < 2 || promptText.length > 3000)) {
            res.status(400).json({
                success: false,
                error: "Nano Banana prompt must be between 2 and 3000 characters.",
            });
            return;
        }
        if (isNanoBananaPro &&
            (promptText.length < 3 || promptText.length > 45000)) {
            res.status(400).json({
                success: false,
                error: "Nano Banana 2 Pro prompt must be between 3 and 45000 characters.",
            });
            return;
        }
        if (isGptImage1 && (promptText.length < 1 || promptText.length > 32000)) {
            res.status(400).json({
                success: false,
                error: "GPT Image 1 prompt must be between 1 and 32000 characters.",
            });
            return;
        }
        if (isIdeogramRemix && trimmedReferenceImages.length === 0) {
            res.status(400).json({
                success: false,
                error: "Ideogram Remix requires a Runware reference image. Upload a reference image first.",
            });
            return;
        }
        // Validate Ideogram Edit requirements
        if (isIdeogramEdit) {
            if (!seedImage || typeof seedImage !== "string") {
                res.status(400).json({
                    success: false,
                    error: "Ideogram Edit (inpainting) requires a seed image. Please provide a seedImage parameter.",
                });
                return;
            }
            if (!maskImage || typeof maskImage !== "string") {
                res.status(400).json({
                    success: false,
                    error: "Ideogram Edit (inpainting) requires a mask image. Please provide a maskImage parameter to indicate areas to edit.",
                });
                return;
            }
        }
        // Validate Ideogram Reframe requirements
        if (isIdeogramReframe) {
            if (!seedImage || typeof seedImage !== "string") {
                res.status(400).json({
                    success: false,
                    error: "Ideogram Reframe (outpainting) requires a seed image. Please provide a seedImage parameter.",
                });
                return;
            }
        }
        const defaultDimension = isIdeogramRemix
            ? IDEOGRAM_REMIX_DEFAULT_DIMENSION
            : isIdeogramEdit
                ? IDEOGRAM_EDIT_DEFAULT_DIMENSION
                : isIdeogramReframe
                    ? IDEOGRAM_REFRAME_DEFAULT_DIMENSION
                    : isIdeogram
                        ? IDEOGRAM_DEFAULT_DIMENSION
                        : isImagen4
                            ? IMAGEN4_DEFAULT_DIMENSION
                            : isImagen4Ultra
                                ? IMAGEN4_ULTRA_DEFAULT_DIMENSION
                                : isImagen4Fast
                                    ? IMAGEN4_FAST_DEFAULT_DIMENSION
                                    : isNanoBanana
                                        ? NANO_BANANA_DEFAULT_DIMENSION
                                        : isNanoBananaPro
                                            ? NANO_BANANA_PRO_DEFAULT_DIMENSION
                                            : isGptImage1
                                                ? GPT_IMAGE_1_DEFAULT_DIMENSION
                                                : { width: 768, height: 768 };
        const defaultSize = defaultDimension.width;
        const defaultHeight = defaultDimension.height;
        const parseDimension = (value) => Number.parseInt(String(value !== null && value !== void 0 ? value : ""), 10);
        let resolvedWidth = parseDimension(width);
        let resolvedHeight = parseDimension(height);
        if (Number.isNaN(resolvedWidth))
            resolvedWidth = defaultSize;
        if (Number.isNaN(resolvedHeight))
            resolvedHeight = defaultHeight;
        if (isSeeddream) {
            const dims = resolveSeeddreamSize(width, height);
            resolvedWidth = dims.width;
            resolvedHeight = dims.height;
        }
        else if (isImagen4) {
            const dims = resolveImagen4Size(width, height);
            resolvedWidth = dims.width;
            resolvedHeight = dims.height;
        }
        else if (isImagen4Ultra) {
            const dims = resolveImagen4UltraSize(width, height);
            resolvedWidth = dims.width;
            resolvedHeight = dims.height;
        }
        else if (isImagen4Fast) {
            const dims = resolveImagen4FastSize(width, height);
            resolvedWidth = dims.width;
            resolvedHeight = dims.height;
        }
        else if (isNanoBanana) {
            const dims = resolveNanoBananaSize(width, height);
            resolvedWidth = dims.width;
            resolvedHeight = dims.height;
        }
        else if (isNanoBananaPro) {
            const dims = resolveNanoBananaProSize(width, height);
            resolvedWidth = dims.width;
            resolvedHeight = dims.height;
        }
        else if (isGptImage1) {
            const dims = resolveGptImage1Size(width, height);
            resolvedWidth = dims.width;
            resolvedHeight = dims.height;
        }
        else if (isIdeogram) {
            const dims = resolveIdeogramSize(width, height);
            resolvedWidth = dims.width;
            resolvedHeight = dims.height;
        }
        else if (isIdeogramRemix) {
            const dims = resolveIdeogramRemixSize(width, height);
            resolvedWidth = dims.width;
            resolvedHeight = dims.height;
        }
        else if (isIdeogramEdit) {
            const dims = resolveIdeogramEditSize(width, height);
            resolvedWidth = dims.width;
            resolvedHeight = dims.height;
        }
        else if (isIdeogramReframe) {
            const dims = resolveIdeogramReframeSize(width, height);
            resolvedWidth = dims.width;
            resolvedHeight = dims.height;
        }
        const maxResultsPerRequest = isSeeddream
            ? 15
            : isIdeogramFamily
                ? 2
                : isGoogleFamily
                    ? 4
                    : isOpenAIFamily
                        ? 1
                        : isMidjourneyV7
                            ? 20
                            : 4;
        let requestedResults = Math.min(Math.max(parseInt(numberResults) || 1, 1), maxResultsPerRequest);
        // Midjourney V7 requires numberResults to be a multiple of 4 (4, 8, 12, 16, 20)
        if (isMidjourneyV7) {
            // Round to nearest multiple of 4
            const rounded = Math.round(requestedResults / 4) * 4;
            // Ensure it's at least 4 and at most 20
            requestedResults = Math.max(4, Math.min(20, rounded));
        }
        const seeddreamSequentialResults = isSeeddream
            ? requestedResults
            : undefined;
        const providerSettings = {};
        // Check if this is a Riverflow family model
        const isRiverflowFamily = chosenModel === RIVERFLOW_MODEL_ID ||
            chosenModel === RIVERFLOW_MINI_MODEL_ID ||
            chosenModel === RIVERFLOW_PRO_MODEL_ID;
        // Seed image is not supported by base Ideogram/Remix, Google (Imagen/Nano Banana), OpenAI, Riverflow, Midjourney, or Seeddream models
        // But IS required for Ideogram Edit and Reframe
        const allowsSeedImage = isIdeogramEdit ||
            isIdeogramReframe ||
            (!isIdeogramFamily &&
                !isGoogleFamily &&
                !isOpenAIFamily &&
                !isRiverflowFamily &&
                !isMidjourneyV7 &&
                !isSeeddream);
        if (isSeeddream && seeddreamSequentialResults) {
            providerSettings.bytedance = {
                maxSequentialImages: seeddreamSequentialResults,
            };
        }
        if (isIdeogramFamily) {
            const ideogramConfig = ideogramSettings && typeof ideogramSettings === "object"
                ? ideogramSettings
                : {};
            const renderingSpeed = String(ideogramConfig.renderingSpeed || "QUALITY")
                .toUpperCase()
                .includes("SPEED")
                ? "SPEED"
                : "QUALITY";
            const magicPromptRaw = typeof ideogramConfig.magicPrompt === "string"
                ? ideogramConfig.magicPrompt.trim().toUpperCase()
                : "ON";
            const magicPrompt = magicPromptRaw === "OFF"
                ? "OFF"
                : magicPromptRaw === "AUTO"
                    ? "AUTO"
                    : "ON";
            const styleType = typeof ideogramConfig.styleType === "string"
                ? ideogramConfig.styleType.trim()
                : undefined;
            const stylePreset = typeof ideogramConfig.stylePreset === "string"
                ? ideogramConfig.stylePreset.trim()
                : undefined;
            const styleCode = typeof ideogramConfig.styleCode === "string"
                ? ideogramConfig.styleCode.trim()
                : undefined;
            const providerPayload = {
                renderingSpeed,
                magicPrompt,
            };
            if (styleType)
                providerPayload.styleType = styleType;
            if (stylePreset)
                providerPayload.stylePreset = stylePreset;
            if (styleCode)
                providerPayload.styleCode = styleCode;
            // Note: remixStrength and styleReferenceImages are not supported by Runware API for Ideogram Remix
            // Only add styleReferenceImages for base Ideogram, Edit, and Reframe models
            if (!isIdeogramRemix &&
                Array.isArray(ideogramConfig.styleReferenceImages) &&
                ideogramConfig.styleReferenceImages.length) {
                providerPayload.styleReferenceImages =
                    ideogramConfig.styleReferenceImages
                        .filter((val) => typeof val === "string" && val.trim())
                        .slice(0, 4)
                        .map((val) => val.trim());
            }
            providerSettings.ideogram = providerPayload;
        }
        const task = {
            taskType: "imageInference",
            taskUUID: (0, crypto_1.randomUUID)(),
            outputType: "URL",
            model: chosenModel,
            numberResults: isSeeddream ? 1 : requestedResults,
        };
        // Ideogram Reframe uses 'prompt' instead of 'positivePrompt'
        if (isIdeogramReframe) {
            task.prompt = promptText;
        }
        else {
            task.positivePrompt = promptText;
        }
        // Only add width/height for models that support them
        // All models except Ideogram Edit use width/height
        // Ideogram Edit doesn't support width/height (dimensions inherited from seed image)
        if (!isIdeogramEdit) {
            task.width = resolvedWidth;
            task.height = resolvedHeight;
        }
        if (isIdeogramRemix && trimmedReferenceImages.length) {
            task.referenceImages = trimmedReferenceImages;
            // Ideogram Remix also requires seedImage parameter (first reference image)
            task.seedImage = trimmedReferenceImages[0];
        }
        if (chosenModel === SEEDEDIT_MODEL_ID && trimmedReferenceImages.length) {
            // SeedEdit requires exactly 1 reference image
            task.referenceImages = [trimmedReferenceImages[0]];
        }
        if (Object.keys(providerSettings).length > 0) {
            task.providerSettings = providerSettings;
        }
        if (negativePrompt && typeof negativePrompt === "string") {
            task.negativePrompt = negativePrompt;
        }
        // Handle seedImage for Riverflow models - use inputs.references structure
        if (isRiverflowFamily && seedImage && typeof seedImage === "string") {
            // Riverflow uses inputs.references, not seedImage or referenceImages
            const existingRefs = trimmedReferenceImages.length > 0 ? trimmedReferenceImages : [];
            const allRefs = [seedImage, ...existingRefs].slice(0, 10); // Riverflow supports 1-10 reference images
            task.inputs = task.inputs || {};
            task.inputs.references = allRefs;
        }
        else if (isMidjourneyV7 && seedImage && typeof seedImage === "string") {
            // Midjourney V7 uses inputs.referenceImages, not seedImage parameter
            // Supports 1 reference image for image-to-image generation
            task.inputs = task.inputs || {};
            task.inputs.referenceImages = [seedImage];
        }
        else if (allowsSeedImage &&
            seedImage &&
            typeof seedImage === "string") {
            task.seedImage = seedImage; // UUID, URL, base64, or data URI supported by Runware
        }
        // Ideogram Edit requires a mask image for inpainting
        if (isIdeogramEdit && maskImage && typeof maskImage === "string") {
            task.maskImage = maskImage;
        }
        // Only add steps for models that support it (FLUX/SD based models)
        // Google (Imagen, Nano Banana), OpenAI (GPT Image), Ideogram, Riverflow, HiDream, Qwen, Midjourney, and Seeddream models do NOT support steps
        const isHiDreamFamily = chosenModel === HIDREAM_FAST_MODEL_ID ||
            chosenModel === HIDREAM_DEV_MODEL_ID ||
            chosenModel === HIDREAM_FULL_MODEL_ID;
        const isQwenFamily = chosenModel === QWEN_IMAGE_MODEL_ID ||
            chosenModel === QWEN_IMAGE_EDIT_PLUS_MODEL_ID;
        const isMidjourney = chosenModel === MIDJOURNEY_V7_MODEL_ID;
        const isSeedEdit = chosenModel === SEEDEDIT_MODEL_ID;
        // Validate SeedEdit requirements (must have reference image)
        if (isSeedEdit && trimmedReferenceImages.length === 0) {
            res.status(400).json({
                success: false,
                error: "SeedEdit 3.0 requires exactly 1 reference image. Upload a reference image first.",
            });
            return;
        }
        const supportsSteps = !isGoogleFamily &&
            !isOpenAIFamily &&
            !isIdeogramFamily &&
            !isRiverflowFamily &&
            !isHiDreamFamily &&
            !isQwenFamily &&
            !isMidjourney &&
            !isSeedEdit &&
            !isSeeddream;
        if (supportsSteps) {
            if (steps)
                task.steps = Math.min(Math.max(parseInt(steps) || 15, 1), 100);
            else
                task.steps = 15;
        }
        // Only add CFGScale for models that support it
        if (supportsSteps && cfgScale) {
            task.CFGScale = Math.min(Math.max(parseFloat(cfgScale) || 7, 0), 50);
        }
        const payload = [task];
        let response;
        try {
            response = yield postRunwareWithRetry(payload, 180000, 1);
        }
        catch (primaryErr) {
            // Adaptive fallback on upstream timeout (e.g., 524 from Cloudflare)
            const code = (primaryErr === null || primaryErr === void 0 ? void 0 : primaryErr.code) || ((_f = primaryErr === null || primaryErr === void 0 ? void 0 : primaryErr.response) === null || _f === void 0 ? void 0 : _f.status);
            const isTimeoutLike = code === 524 ||
                code === 504 ||
                code === 408 ||
                code === "ECONNABORTED" ||
                code === "ETIMEDOUT";
            if (isTimeoutLike) {
                try {
                    const smaller = Object.assign({}, task);
                    // Reduce size and steps for fallback attempt
                    if (isSeeddream) {
                        const fallbackDims = SEEDDREAM_DIMENSIONS[0];
                        smaller.width = fallbackDims.width;
                        smaller.height = fallbackDims.height;
                    }
                    else if (isIdeogram) {
                        smaller.width = IDEOGRAM_DEFAULT_DIMENSION.width;
                        smaller.height = IDEOGRAM_DEFAULT_DIMENSION.height;
                    }
                    else if (isIdeogramRemix) {
                        smaller.width = IDEOGRAM_REMIX_DEFAULT_DIMENSION.width;
                        smaller.height = IDEOGRAM_REMIX_DEFAULT_DIMENSION.height;
                    }
                    else {
                        smaller.width = Math.min(640, task.width || defaultSize);
                        smaller.height = Math.min(640, task.height || defaultSize);
                    }
                    // Only reduce steps for models that support it
                    if (supportsSteps) {
                        smaller.steps = Math.min(12, task.steps || 12);
                    }
                    const fallbackPayload = [smaller];
                    response = yield postRunwareWithRetry(fallbackPayload, 180000, 0);
                }
                catch (fallbackErr) {
                    throw primaryErr; // surface original error context
                }
            }
            else {
                throw primaryErr;
            }
        }
        const data = response.data;
        const resultItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
            ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "imageInference") ||
                data.data[0]
            : data === null || data === void 0 ? void 0 : data.data;
        const imageURL = (resultItem === null || resultItem === void 0 ? void 0 : resultItem.imageURL) || (resultItem === null || resultItem === void 0 ? void 0 : resultItem.url) || (resultItem === null || resultItem === void 0 ? void 0 : resultItem.imageDataURI);
        const imageUUID = resultItem === null || resultItem === void 0 ? void 0 : resultItem.imageUUID;
        if (!imageURL) {
            res.status(502).json({
                success: false,
                error: "Runware did not return an image URL",
                details: data,
            });
            return;
        }
        // Upload to S3
        let finalImageURL = imageURL;
        try {
            finalImageURL = yield (0, s3_1.downloadAndUploadImage)(imageURL, String(feature || chosenModel || "photo"));
        }
        catch (uploadErr) {
            console.error("Failed to upload generated image to S3, using original URL:", uploadErr);
        }
        // Persist generated image URL (S3 URL) for history
        try {
            yield prisma_1.default.generated_Photo.create({
                data: {
                    feature: String(feature || chosenModel || "photo"),
                    url: finalImageURL,
                },
            });
        }
        catch (e) {
            // Non-fatal
            console.warn("Failed to persist Generated_Photo:", (e === null || e === void 0 ? void 0 : e.message) || e);
        }
        logWithTimestamp("[GENERATE-PHOTO] Success", {
            model: chosenModel,
            imageURL: finalImageURL,
            imageUUID,
            processingTimeMs: Date.now() - requestStartTime,
        });
        res.json({ success: true, image: { url: finalImageURL, imageUUID } });
        return;
    }
    catch (err) {
        const msg = ((_k = (_j = (_h = (_g = err === null || err === void 0 ? void 0 : err.response) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h.errors) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.message) ||
            (err === null || err === void 0 ? void 0 : err.message) ||
            "Unknown error";
        // Extract responseContent for more detailed error information (e.g., content moderation)
        const responseContent = (_p = (_o = (_m = (_l = err === null || err === void 0 ? void 0 : err.response) === null || _l === void 0 ? void 0 : _l.data) === null || _m === void 0 ? void 0 : _m.errors) === null || _o === void 0 ? void 0 : _o[0]) === null || _p === void 0 ? void 0 : _p.responseContent;
        logWithTimestamp("[GENERATE-PHOTO] Error", {
            error: msg + (responseContent ? `: ${responseContent}` : ""),
            status: (_q = err === null || err === void 0 ? void 0 : err.response) === null || _q === void 0 ? void 0 : _q.status,
            details: (_r = err === null || err === void 0 ? void 0 : err.response) === null || _r === void 0 ? void 0 : _r.data,
            processingTimeMs: Date.now() - requestStartTime,
        });
        const errorResponse = {
            success: false,
            error: msg || "Generation failed",
        };
        // Include responseContent in the response if available
        if (responseContent) {
            errorResponse.responseContent = responseContent;
        }
        res.status(500).json(errorResponse);
        return;
    }
}));
// POST /api/runware/riverflow/edit
// JSON body: { prompt: string, references: string[], width?: number, height?: number, negativePrompt?: string, numberResults?: number, feature?: string }
router.post("/runware/riverflow/edit", apiKey_1.requireApiKey, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { prompt, references, width, height, negativePrompt, numberResults, feature, } = req.body || {};
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
        const { width: resolvedWidth, height: resolvedHeight } = resolveRiverflowSize(width, height);
        const task = {
            taskType: "imageInference",
            taskUUID: (0, crypto_1.randomUUID)(),
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
        const response = yield postRunwareWithRetry(payload, 180000, 1);
        const data = response.data;
        const resultItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
            ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "imageInference") ||
                data.data[0]
            : data === null || data === void 0 ? void 0 : data.data;
        const imageURL = (resultItem === null || resultItem === void 0 ? void 0 : resultItem.imageURL) || (resultItem === null || resultItem === void 0 ? void 0 : resultItem.url) || (resultItem === null || resultItem === void 0 ? void 0 : resultItem.imageDataURI);
        const imageUUID = resultItem === null || resultItem === void 0 ? void 0 : resultItem.imageUUID;
        if (!imageURL) {
            res.status(502).json({
                success: false,
                error: "Runware did not return an image URL",
                details: data,
            });
            return;
        }
        try {
            yield prisma_1.default.generated_Photo.create({
                data: {
                    feature: String(feature || "riverflow-edit"),
                    url: imageURL,
                },
            });
        }
        catch (e) {
            console.warn("Failed to persist Riverflow Generated_Photo:", (e === null || e === void 0 ? void 0 : e.message) || e);
        }
        res.json({ success: true, image: { url: imageURL, imageUUID } });
        return;
    }
    catch (err) {
        const msg = ((_d = (_c = (_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.errors) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.message) ||
            (err === null || err === void 0 ? void 0 : err.message) ||
            "Unknown error";
        console.error("Runware riverflow-edit error:", msg);
        res.status(500).json({
            success: false,
            error: msg || "Riverflow edit failed",
        });
        return;
    }
}));
// POST /api/runware/riverflow-mini/edit
// Riverflow 1.1 Mini - fast and cost-efficient image-to-image editing
// JSON body: { prompt: string, references: string[], width?: number, height?: number, negativePrompt?: string, numberResults?: number, feature?: string }
router.post("/runware/riverflow-mini/edit", apiKey_1.requireApiKey, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const { prompt, references, width, height, negativePrompt, numberResults, feature, } = req.body || {};
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
        const { width: resolvedWidth, height: resolvedHeight } = resolveRiverflowMiniSize(width, height);
        const task = {
            taskType: "imageInference",
            taskUUID: (0, crypto_1.randomUUID)(),
            model: RIVERFLOW_MINI_MODEL_ID,
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
        const response = yield postRunwareWithRetry([task], 180000, 1);
        const data = (_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.data;
        if (!Array.isArray(data) || !data[0]) {
            throw new Error("Runware returned empty or malformed result");
        }
        const { imageURL, imageUUID } = data[0];
        if (!imageURL) {
            throw new Error("No imageURL in Runware response");
        }
        // Persist to Generated_Photo
        try {
            yield prisma_1.default.generated_Photo.create({
                data: {
                    feature: typeof feature === "string" ? feature : "riverflow-mini-edit",
                    url: imageURL,
                },
            });
        }
        catch (e) {
            console.warn("Failed to persist Riverflow Mini Generated_Photo:", (e === null || e === void 0 ? void 0 : e.message) || e);
        }
        res.json({ success: true, image: { url: imageURL, imageUUID } });
        return;
    }
    catch (err) {
        const msg = ((_e = (_d = (_c = (_b = err === null || err === void 0 ? void 0 : err.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.errors) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.message) ||
            (err === null || err === void 0 ? void 0 : err.message) ||
            "Unknown error";
        console.error("Runware riverflow-mini-edit error:", msg);
        res.status(500).json({
            success: false,
            error: msg || "Riverflow Mini edit failed",
        });
        return;
    }
}));
// POST /api/runware/riverflow-pro/edit
// Riverflow 1.1 Pro - advanced image-to-image editing with superior quality and precision
// JSON body: { prompt: string, references: string[], width?: number, height?: number, negativePrompt?: string, numberResults?: number, feature?: string }
router.post("/runware/riverflow-pro/edit", apiKey_1.requireApiKey, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const { prompt, references, width, height, negativePrompt, numberResults, feature, } = req.body || {};
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
        const { width: resolvedWidth, height: resolvedHeight } = resolveRiverflowProSize(width, height);
        const task = {
            taskType: "imageInference",
            taskUUID: (0, crypto_1.randomUUID)(),
            model: RIVERFLOW_PRO_MODEL_ID,
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
        const response = yield postRunwareWithRetry([task], 180000, 1);
        const data = (_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.data;
        if (!Array.isArray(data) || !data[0]) {
            throw new Error("Runware returned empty or malformed result");
        }
        const { imageURL, imageUUID } = data[0];
        if (!imageURL) {
            throw new Error("No imageURL in Runware response");
        }
        // Persist to Generated_Photo
        try {
            const s3Url = yield (0, s3_1.downloadAndUploadImage)(imageURL, typeof feature === "string" ? feature : "riverflow-pro-edit");
            yield prisma_1.default.generated_Photo.create({
                data: {
                    feature: typeof feature === "string" ? feature : "riverflow-pro-edit",
                    url: s3Url,
                },
            });
        }
        catch (e) {
            console.warn("Failed to persist Riverflow Pro Generated_Photo:", (e === null || e === void 0 ? void 0 : e.message) || e);
        }
        res.json({ success: true, image: { url: imageURL, imageUUID } });
        return;
    }
    catch (err) {
        const msg = ((_e = (_d = (_c = (_b = err === null || err === void 0 ? void 0 : err.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.errors) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.message) ||
            (err === null || err === void 0 ? void 0 : err.message) ||
            "Unknown error";
        console.error("Runware riverflow-pro-edit error:", msg);
        res.status(500).json({
            success: false,
            error: msg || "Riverflow Pro edit failed",
        });
        return;
    }
}));
// POST /api/runware/seededit/edit
// SeedEdit 3.0 - ByteDance's flagship image editing with advanced instruction-following
// JSON body: { prompt: string, referenceImage: string, cfgScale?: number, feature?: string }
router.post("/runware/seededit/edit", apiKey_1.requireApiKey, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const { prompt, referenceImage, referenceImages, cfgScale, feature } = req.body || {};
        // Validate prompt (2-500 characters required)
        const promptText = typeof prompt === "string" ? prompt.trim() : "";
        if (!promptText) {
            res.status(400).json({ success: false, error: "'prompt' is required" });
            return;
        }
        if (promptText.length < 2 || promptText.length > 500) {
            res.status(400).json({
                success: false,
                error: "SeedEdit 3.0 prompt must be between 2 and 500 characters.",
            });
            return;
        }
        // Get reference image (exactly 1 required)
        let refImage;
        if (typeof referenceImage === "string" && referenceImage.trim()) {
            refImage = referenceImage.trim();
        }
        else if (Array.isArray(referenceImages) && referenceImages.length > 0) {
            refImage =
                typeof referenceImages[0] === "string"
                    ? referenceImages[0].trim()
                    : undefined;
        }
        if (!refImage) {
            res.status(400).json({
                success: false,
                error: "SeedEdit 3.0 requires exactly 1 reference image.",
            });
            return;
        }
        // CFG Scale: 1-10, default 5.5
        let resolvedCfgScale = 5.5;
        if (cfgScale !== undefined && cfgScale !== null) {
            const parsed = parseFloat(String(cfgScale));
            if (!Number.isNaN(parsed)) {
                resolvedCfgScale = Math.max(1, Math.min(10, parsed));
            }
        }
        const task = {
            taskType: "imageInference",
            taskUUID: (0, crypto_1.randomUUID)(),
            model: SEEDEDIT_MODEL_ID,
            outputType: "URL",
            positivePrompt: promptText,
            referenceImages: [refImage],
            CFGScale: resolvedCfgScale,
        };
        const response = yield postRunwareWithRetry([task], 180000, 1);
        const data = (_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.data;
        if (!Array.isArray(data) || !data[0]) {
            throw new Error("Runware returned empty or malformed result");
        }
        const { imageURL, imageUUID } = data[0];
        if (!imageURL) {
            throw new Error("No imageURL in Runware response");
        }
        // Persist to Generated_Photo
        try {
            const s3Url = yield (0, s3_1.downloadAndUploadImage)(imageURL, typeof feature === "string" ? feature : "seededit-edit");
            yield prisma_1.default.generated_Photo.create({
                data: {
                    feature: typeof feature === "string" ? feature : "seededit-edit",
                    url: s3Url,
                },
            });
        }
        catch (e) {
            console.warn("Failed to persist SeedEdit Generated_Photo:", (e === null || e === void 0 ? void 0 : e.message) || e);
        }
        res.json({ success: true, image: { url: imageURL, imageUUID } });
        return;
    }
    catch (err) {
        const msg = ((_e = (_d = (_c = (_b = err === null || err === void 0 ? void 0 : err.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.errors) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.message) ||
            (err === null || err === void 0 ? void 0 : err.message) ||
            "Unknown error";
        console.error("Runware seededit-edit error:", msg);
        res.status(500).json({
            success: false,
            error: msg || "SeedEdit edit failed",
        });
        return;
    }
}));
// POST /api/runware/ideogram/edit
// Ideogram 3.0 Edit (Inpainting) - surgically edit or replace parts of an image
// JSON body: { prompt: string, seedImage: string, maskImage: string, width?: number, height?: number, ideogramSettings?: object, feature?: string }
router.post("/runware/ideogram/edit", apiKey_1.requireApiKey, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const { prompt, seedImage, maskImage, width, height, ideogramSettings, feature, } = req.body || {};
        // Validate prompt (1-2000 characters required)
        const promptText = typeof prompt === "string" ? prompt.trim() : "";
        if (!promptText) {
            res.status(400).json({ success: false, error: "'prompt' is required" });
            return;
        }
        if (promptText.length > 2000) {
            res.status(400).json({
                success: false,
                error: "Ideogram Edit prompt must be between 1 and 2000 characters.",
            });
            return;
        }
        // Validate seed image (required)
        if (!seedImage || typeof seedImage !== "string") {
            res.status(400).json({
                success: false,
                error: "'seedImage' is required. Provide a Runware image UUID, URL, or base64 data URI.",
            });
            return;
        }
        // Validate mask image (required for inpainting)
        if (!maskImage || typeof maskImage !== "string") {
            res.status(400).json({
                success: false,
                error: "'maskImage' is required. Provide a Runware image UUID, URL, or base64 data URI of the mask.",
            });
            return;
        }
        // Resolve dimensions to supported catalog
        const { width: resolvedWidth, height: resolvedHeight } = resolveIdeogramEditSize(width, height);
        // Build provider settings for Ideogram Edit
        const ideogramConfig = ideogramSettings && typeof ideogramSettings === "object"
            ? ideogramSettings
            : {};
        const renderingSpeed = String(ideogramConfig.renderingSpeed || "QUALITY")
            .toUpperCase()
            .includes("SPEED")
            ? "SPEED"
            : "QUALITY";
        const magicPromptRaw = typeof ideogramConfig.magicPrompt === "string"
            ? ideogramConfig.magicPrompt.trim().toUpperCase()
            : "ON";
        const magicPrompt = magicPromptRaw === "OFF"
            ? "OFF"
            : magicPromptRaw === "AUTO"
                ? "AUTO"
                : "ON";
        const providerPayload = {
            renderingSpeed,
            magicPrompt,
        };
        // Optional style settings
        const styleType = typeof ideogramConfig.styleType === "string"
            ? ideogramConfig.styleType.trim()
            : undefined;
        const stylePreset = typeof ideogramConfig.stylePreset === "string"
            ? ideogramConfig.stylePreset.trim()
            : undefined;
        const styleCode = typeof ideogramConfig.styleCode === "string"
            ? ideogramConfig.styleCode.trim()
            : undefined;
        if (styleType)
            providerPayload.styleType = styleType;
        if (stylePreset)
            providerPayload.stylePreset = stylePreset;
        if (styleCode)
            providerPayload.styleCode = styleCode;
        // Optional style reference images (up to 4)
        if (Array.isArray(ideogramConfig.styleReferenceImages) &&
            ideogramConfig.styleReferenceImages.length) {
            providerPayload.styleReferenceImages =
                ideogramConfig.styleReferenceImages
                    .filter((val) => typeof val === "string" && val.trim())
                    .slice(0, 4)
                    .map((val) => val.trim());
        }
        const task = {
            taskType: "imageInference",
            taskUUID: (0, crypto_1.randomUUID)(),
            model: IDEOGRAM_EDIT_MODEL_ID,
            outputType: "URL",
            positivePrompt: promptText,
            seedImage: seedImage.trim(),
            maskImage: maskImage.trim(),
            providerSettings: {
                ideogram: providerPayload,
            },
        };
        const payload = [task];
        const response = yield postRunwareWithRetry(payload, 180000, 1);
        const data = response.data;
        const resultItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
            ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "imageInference") ||
                data.data[0]
            : data === null || data === void 0 ? void 0 : data.data;
        const imageURL = (resultItem === null || resultItem === void 0 ? void 0 : resultItem.imageURL) || (resultItem === null || resultItem === void 0 ? void 0 : resultItem.url) || (resultItem === null || resultItem === void 0 ? void 0 : resultItem.imageDataURI);
        const imageUUID = resultItem === null || resultItem === void 0 ? void 0 : resultItem.imageUUID;
        if (!imageURL) {
            res.status(502).json({
                success: false,
                error: "Runware did not return an image URL",
                details: data,
            });
            return;
        }
        // Persist generated image for history
        try {
            const s3Url = yield (0, s3_1.downloadAndUploadImage)(imageURL, String(feature || "ideogram-edit"));
            yield prisma_1.default.generated_Photo.create({
                data: {
                    feature: String(feature || "ideogram-edit"),
                    url: s3Url,
                },
            });
        }
        catch (e) {
            console.warn("Failed to persist Ideogram Edit Generated_Photo:", (e === null || e === void 0 ? void 0 : e.message) || e);
        }
        res.json({ success: true, image: { url: imageURL, imageUUID } });
        return;
    }
    catch (err) {
        const msg = ((_d = (_c = (_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.errors) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.message) ||
            (err === null || err === void 0 ? void 0 : err.message) ||
            "Unknown error";
        const responseContent = (_h = (_g = (_f = (_e = err === null || err === void 0 ? void 0 : err.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.errors) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.responseContent;
        console.error("Runware ideogram-edit error:", msg);
        res.status(500).json({
            success: false,
            error: msg + (responseContent ? `: ${responseContent}` : "") ||
                "Ideogram Edit failed",
        });
        return;
    }
}));
// POST /api/runware/ideogram/reframe
// Ideogram 3.0 Reframe (Outpainting) - expand visuals beyond original borders
// JSON body: { prompt: string, seedImage: string, width?: number, height?: number, ideogramSettings?: object, feature?: string }
router.post("/runware/ideogram/reframe", apiKey_1.requireApiKey, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { prompt, seedImage, width, height, ideogramSettings, feature } = req.body || {};
        // Validate prompt (1-2000 characters required)
        const promptText = typeof prompt === "string" ? prompt.trim() : "";
        if (!promptText) {
            res.status(400).json({ success: false, error: "'prompt' is required" });
            return;
        }
        if (promptText.length > 2000) {
            res.status(400).json({
                success: false,
                error: "Ideogram Reframe prompt must be between 1 and 2000 characters.",
            });
            return;
        }
        // Validate seed image (required)
        if (!seedImage || typeof seedImage !== "string") {
            res.status(400).json({
                success: false,
                error: "'seedImage' is required. Provide a Runware image UUID, URL, or base64 data URI.",
            });
            return;
        }
        // Resolve dimensions to supported catalog
        const { width: resolvedWidth, height: resolvedHeight } = resolveIdeogramReframeSize(width, height);
        // Build provider settings for Ideogram Reframe
        const ideogramConfig = ideogramSettings && typeof ideogramSettings === "object"
            ? ideogramSettings
            : {};
        const renderingSpeed = String(ideogramConfig.renderingSpeed || "QUALITY")
            .toUpperCase()
            .includes("SPEED")
            ? "SPEED"
            : "QUALITY";
        const magicPromptRaw = typeof ideogramConfig.magicPrompt === "string"
            ? ideogramConfig.magicPrompt.trim().toUpperCase()
            : "AUTO";
        const magicPrompt = magicPromptRaw === "OFF"
            ? "OFF"
            : magicPromptRaw === "ON"
                ? "ON"
                : "AUTO";
        const providerPayload = {
            renderingSpeed,
            magicPrompt,
        };
        // Optional style settings
        const styleType = typeof ideogramConfig.styleType === "string"
            ? ideogramConfig.styleType.trim()
            : undefined;
        const stylePreset = typeof ideogramConfig.stylePreset === "string"
            ? ideogramConfig.stylePreset.trim()
            : undefined;
        const styleCode = typeof ideogramConfig.styleCode === "string"
            ? ideogramConfig.styleCode.trim()
            : undefined;
        if (styleType)
            providerPayload.styleType = styleType;
        if (stylePreset)
            providerPayload.stylePreset = stylePreset;
        if (styleCode)
            providerPayload.styleCode = styleCode;
        // Optional style reference images (up to 4)
        if (Array.isArray(ideogramConfig.styleReferenceImages) &&
            ideogramConfig.styleReferenceImages.length) {
            providerPayload.styleReferenceImages =
                ideogramConfig.styleReferenceImages
                    .filter((val) => typeof val === "string" && val.trim())
                    .slice(0, 4)
                    .map((val) => val.trim());
        }
        const task = {
            taskType: "imageInference",
            taskUUID: (0, crypto_1.randomUUID)(),
            model: IDEOGRAM_REFRAME_MODEL_ID,
            outputType: "URL",
            prompt: promptText, // Ideogram Reframe uses 'prompt' instead of 'positivePrompt'
            seedImage: seedImage.trim(),
            width: resolvedWidth,
            height: resolvedHeight,
            providerSettings: {
                ideogram: providerPayload,
            },
        };
        const payload = [task];
        const response = yield postRunwareWithRetry(payload, 180000, 1);
        const data = response.data;
        const resultItem = Array.isArray(data === null || data === void 0 ? void 0 : data.data)
            ? data.data.find((d) => (d === null || d === void 0 ? void 0 : d.taskType) === "imageInference") ||
                data.data[0]
            : data === null || data === void 0 ? void 0 : data.data;
        const imageURL = (resultItem === null || resultItem === void 0 ? void 0 : resultItem.imageURL) || (resultItem === null || resultItem === void 0 ? void 0 : resultItem.url) || (resultItem === null || resultItem === void 0 ? void 0 : resultItem.imageDataURI);
        const imageUUID = resultItem === null || resultItem === void 0 ? void 0 : resultItem.imageUUID;
        if (!imageURL) {
            res.status(502).json({
                success: false,
                error: "Runware did not return an image URL",
                details: data,
            });
            return;
        }
        // Persist generated image for history
        try {
            const s3Url = yield (0, s3_1.downloadAndUploadImage)(imageURL, String(feature || "ideogram-reframe"));
            yield prisma_1.default.generated_Photo.create({
                data: {
                    feature: String(feature || "ideogram-reframe"),
                    url: s3Url,
                },
            });
        }
        catch (e) {
            console.warn("Failed to persist Ideogram Reframe Generated_Photo:", (e === null || e === void 0 ? void 0 : e.message) || e);
        }
        res.json({ success: true, image: { url: imageURL, imageUUID } });
        return;
    }
    catch (err) {
        const msg = ((_d = (_c = (_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.errors) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.message) ||
            (err === null || err === void 0 ? void 0 : err.message) ||
            "Unknown error";
        console.error("Runware ideogram-reframe error:", msg);
        res.status(500).json({
            success: false,
            error: msg || "Ideogram Reframe failed",
        });
        return;
    }
}));
// Helper to get EachLabs API headers
function getEachLabsHeaders() {
    const key = process.env.EACHLABS_API_KEY;
    if (!key) {
        throw new Error("EACHLABS_API_KEY not set. Please configure your EachLabs API key in environment variables.");
    }
    return {
        "X-API-Key": key,
        "Content-Type": "application/json",
    };
}
// Helper to poll EachLabs prediction until complete
function pollEachLabsPrediction(predictionId_1) {
    return __awaiter(this, arguments, void 0, function* (predictionId, maxAttempts = 60, intervalMs = 2000) {
        var _a;
        const headers = getEachLabsHeaders();
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const response = yield axios_1.default.get(`${EACHLABS_API_URL}/prediction/${predictionId}`, { headers, timeout: 30000 });
            const data = response.data;
            const status = (_a = data === null || data === void 0 ? void 0 : data.status) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            if (status === "success" ||
                status === "succeeded" ||
                status === "completed") {
                return data;
            }
            if (status === "failed" || status === "error" || status === "cancelled") {
                throw new Error((data === null || data === void 0 ? void 0 : data.error) ||
                    (data === null || data === void 0 ? void 0 : data.message) ||
                    `Prediction ${predictionId} failed with status: ${status}`);
            }
            // Still processing, wait and retry
            yield new Promise((r) => setTimeout(r, intervalMs));
        }
        throw new Error(`Prediction ${predictionId} timed out after ${(maxAttempts * intervalMs) / 1000} seconds`);
    });
}
// POST /api/runware/hunyuan/generate
// Hunyuan Image V3 - Tencent's text-to-image model via EachLabs
// JSON body: { prompt: string, negativePrompt?: string, imageSize?: string, numImages?: number, numInferenceSteps?: number, guidanceScale?: number, enableSafetyChecker?: boolean, outputFormat?: string, feature?: string }
router.post("/runware/hunyuan/generate", apiKey_1.requireApiKey, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const { prompt, negativePrompt, imageSize, numImages, numInferenceSteps, guidanceScale, enableSafetyChecker, outputFormat, feature, 
        // Also support width/height and map to image_size
        width, height, } = req.body || {};
        // Validate prompt
        const promptText = typeof prompt === "string" ? prompt.trim() : "";
        if (!promptText) {
            res.status(400).json({ success: false, error: "'prompt' is required" });
            return;
        }
        // Map width/height to image_size if provided
        let resolvedImageSize = imageSize;
        if (!resolvedImageSize && (width || height)) {
            const w = parseInt(String(width || ""), 10);
            const h = parseInt(String(height || ""), 10);
            if (w && h) {
                const ratio = w / h;
                if (Math.abs(ratio - 1) < 0.1) {
                    resolvedImageSize = w >= 1024 ? "square_hd" : "square";
                }
                else if (ratio > 1.5) {
                    resolvedImageSize = "landscape_16_9";
                }
                else if (ratio > 1.2) {
                    resolvedImageSize = "landscape_4_3";
                }
                else if (ratio < 0.67) {
                    resolvedImageSize = "portrait_16_9";
                }
                else if (ratio < 0.85) {
                    resolvedImageSize = "portrait_4_3";
                }
                else {
                    resolvedImageSize = "square_hd";
                }
            }
        }
        if (!resolvedImageSize ||
            !HUNYUAN_IMAGE_V3_IMAGE_SIZES.includes(resolvedImageSize)) {
            resolvedImageSize = HUNYUAN_IMAGE_V3_DEFAULT_SIZE;
        }
        // Build EachLabs prediction request
        const input = {
            prompt: promptText,
            image_size: resolvedImageSize,
        };
        if (negativePrompt && typeof negativePrompt === "string") {
            input.negative_prompt = negativePrompt.trim();
        }
        // num_images: 1-4, default 1
        if (numImages !== undefined) {
            const num = parseInt(String(numImages), 10);
            if (!Number.isNaN(num)) {
                input.num_images = Math.max(1, Math.min(4, num));
            }
        }
        // num_inference_steps: typically 20-50, default 28
        if (numInferenceSteps !== undefined) {
            const steps = parseInt(String(numInferenceSteps), 10);
            if (!Number.isNaN(steps)) {
                input.num_inference_steps = Math.max(1, Math.min(100, steps));
            }
        }
        // guidance_scale: typically 1-20, default 3.5
        if (guidanceScale !== undefined) {
            const scale = parseFloat(String(guidanceScale));
            if (!Number.isNaN(scale)) {
                input.guidance_scale = Math.max(0, Math.min(20, scale));
            }
        }
        // enable_safety_checker: boolean, default true
        if (enableSafetyChecker !== undefined) {
            input.enable_safety_checker = Boolean(enableSafetyChecker);
        }
        // output_format: "png" or "jpeg", default "png"
        if (outputFormat && typeof outputFormat === "string") {
            const fmt = outputFormat.toLowerCase();
            if (fmt === "jpeg" || fmt === "jpg") {
                input.output_format = "jpeg";
            }
            else {
                input.output_format = "png";
            }
        }
        const predictionPayload = {
            model: "hunyuan-image-v3-text-to-image",
            version: "0.0.1",
            input,
            webhook_url: "",
        };
        const headers = getEachLabsHeaders();
        // Create prediction
        const createResponse = yield axios_1.default.post(`${EACHLABS_API_URL}/prediction/`, predictionPayload, { headers, timeout: 30000 });
        const predictionId = ((_a = createResponse.data) === null || _a === void 0 ? void 0 : _a.id) || ((_b = createResponse.data) === null || _b === void 0 ? void 0 : _b.prediction_id);
        if (!predictionId) {
            res.status(502).json({
                success: false,
                error: "EachLabs did not return a prediction ID",
                details: createResponse.data,
            });
            return;
        }
        // Poll for result
        const result = yield pollEachLabsPrediction(predictionId);
        // Extract image URL from result
        // EachLabs typically returns output.images array or output.image
        const output = (result === null || result === void 0 ? void 0 : result.output) || (result === null || result === void 0 ? void 0 : result.result) || result;
        let imageURL;
        if (Array.isArray(output === null || output === void 0 ? void 0 : output.images) && output.images.length > 0) {
            imageURL = output.images[0];
        }
        else if (typeof (output === null || output === void 0 ? void 0 : output.image) === "string") {
            imageURL = output.image;
        }
        else if (typeof output === "string") {
            imageURL = output;
        }
        else if (Array.isArray(output) && output.length > 0) {
            imageURL = typeof output[0] === "string" ? output[0] : (_c = output[0]) === null || _c === void 0 ? void 0 : _c.url;
        }
        if (!imageURL) {
            res.status(502).json({
                success: false,
                error: "EachLabs did not return an image URL",
                details: result,
            });
            return;
        }
        // Persist generated image for history
        try {
            const s3Url = yield (0, s3_1.downloadAndUploadImage)(imageURL, String(feature || "hunyuan-image-v3"));
            yield prisma_1.default.generated_Photo.create({
                data: {
                    feature: String(feature || "hunyuan-image-v3"),
                    url: s3Url,
                },
            });
        }
        catch (e) {
            console.warn("Failed to persist Hunyuan Image V3 Generated_Photo:", (e === null || e === void 0 ? void 0 : e.message) || e);
        }
        res.json({
            success: true,
            image: { url: imageURL },
            predictionId,
        });
        return;
    }
    catch (err) {
        const msg = ((_e = (_d = err === null || err === void 0 ? void 0 : err.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.error) ||
            ((_g = (_f = err === null || err === void 0 ? void 0 : err.response) === null || _f === void 0 ? void 0 : _f.data) === null || _g === void 0 ? void 0 : _g.message) ||
            (err === null || err === void 0 ? void 0 : err.message) ||
            "Unknown error";
        console.error("EachLabs hunyuan-generate error:", msg);
        res.status(500).json({
            success: false,
            error: msg || "Hunyuan Image V3 generation failed",
        });
        return;
    }
}));
// GET /api/runware/generated-photos
// Query params: limit (default 20), cursor (optional, for pagination)
router.get("/runware/generated-photos", apiKey_1.requireApiKey, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
        const cursor = req.query.cursor
            ? parseInt(req.query.cursor)
            : undefined;
        const photos = yield prisma_1.default.generated_Photo.findMany({
            take: limit,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                url: true,
                feature: true,
                createdAt: true,
            },
        });
        const nextCursor = photos.length === limit ? photos[photos.length - 1].id : undefined;
        res.json({
            success: true,
            photos,
            nextCursor,
        });
    }
    catch (error) {
        console.error("Error fetching generated photos:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch generated photos",
        });
    }
}));
// POST /api/runware/sync-s3-images
// Syncs images from S3 to the Generated_Photo database table
router.post("/runware/sync-s3-images", apiKey_1.requireApiKey, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { listAllImagesFromS3 } = yield Promise.resolve().then(() => __importStar(require("../lib/s3")));
        const s3Images = yield listAllImagesFromS3();
        let addedCount = 0;
        let skippedCount = 0;
        for (const img of s3Images) {
            // Check if URL already exists
            const existing = yield prisma_1.default.generated_Photo.findFirst({
                where: { url: img.url },
            });
            if (!existing) {
                yield prisma_1.default.generated_Photo.create({
                    data: {
                        feature: img.feature,
                        url: img.url,
                    },
                });
                addedCount++;
            }
            else {
                skippedCount++;
            }
        }
        res.json({
            success: true,
            message: `Synced ${addedCount} new images from S3. ${skippedCount} already existed.`,
            added: addedCount,
            skipped: skippedCount,
            total: s3Images.length,
        });
    }
    catch (error) {
        console.error("Error syncing S3 images:", error);
        res.status(500).json({
            success: false,
            error: "Failed to sync S3 images",
        });
    }
}));
exports.default = router;
