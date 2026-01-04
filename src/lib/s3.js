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
exports.s3 = void 0;
exports.publicUrlFor = publicUrlFor;
exports.uploadBuffer = uploadBuffer;
exports.uploadStream = uploadStream;
exports.deleteObject = deleteObject;
exports.resizeTo512 = resizeTo512;
exports.makeKey = makeKey;
exports.ensure512SquareImageFromUrl = ensure512SquareImageFromUrl;
exports.ensureImageSizeFromUrl = ensureImageSizeFromUrl;
exports.downloadAndUploadImage = downloadAndUploadImage;
exports.getLatestVideosFromS3 = getLatestVideosFromS3;
exports.getVideosForFeatureFromS3 = getVideosForFeatureFromS3;
exports.getSoundsFromS3 = getSoundsFromS3;
exports.listAllImagesFromS3 = listAllImagesFromS3;
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const sharp_1 = __importDefault(require("sharp"));
const REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.AWS_S3_BUCKET || "";
const PUBLIC_PREFIX = process.env.AWS_S3_PUBLIC_URL_PREFIX; // e.g. https://cdn.example.com or https://YOUR_BUCKET.s3.REGION.amazonaws.com
if (!BUCKET) {
    console.warn("[S3] AWS_S3_BUCKET is not set; uploads will fail.");
}
exports.s3 = new client_s3_1.S3Client({ region: REGION });
function publicUrlFor(key) {
    if (PUBLIC_PREFIX) {
        const base = PUBLIC_PREFIX.endsWith("/")
            ? PUBLIC_PREFIX.slice(0, -1)
            : PUBLIC_PREFIX;
        return `${base}/${key}`;
    }
    return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}
function uploadBuffer(key, buffer, contentType, acl) {
    return __awaiter(this, void 0, void 0, function* () {
        const cmd = new client_s3_1.PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            ACL: acl,
        });
        yield exports.s3.send(cmd);
        return { key, url: publicUrlFor(key) };
    });
}
function uploadStream(key, stream, contentType, acl) {
    return __awaiter(this, void 0, void 0, function* () {
        const uploader = new lib_storage_1.Upload({
            client: exports.s3,
            params: {
                Bucket: BUCKET,
                Key: key,
                Body: stream,
                ContentType: contentType,
                ACL: acl,
            },
            queueSize: 4,
            partSize: 8 * 1024 * 1024,
            leavePartsOnError: false,
        });
        yield uploader.done();
        return { key, url: publicUrlFor(key) };
    });
}
function deleteObject(key) {
    return __awaiter(this, void 0, void 0, function* () {
        yield exports.s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    });
}
// Resize to 512x512 (cover) similar to Cloudinary fill crop center; returns Buffer
function resizeTo512(buffer) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, sharp_1.default)(buffer)
            .resize(512, 512, { fit: "cover", position: "centre" })
            .toFormat("png")
            .toBuffer();
    });
}
// Derive a reasonable key path for images/videos
function makeKey(opts) {
    const ts = Date.now();
    const base = opts.feature
        ? opts.feature.replace(/[^a-zA-Z0-9_-]/g, "-")
        : "generic";
    const ext = opts.ext ||
        (opts.type === "image" ? "png" : opts.type === "audio" ? "mp3" : "mp4");
    const rand = Math.random().toString(36).slice(2, 8);
    return `${opts.type}s/${base}/${base}-${ts}-${rand}.${ext}`;
}
function ensure512SquareImageFromUrl(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const resp = yield fetch(url);
        if (!resp.ok)
            throw new Error(`Failed to fetch image: ${resp.status}`);
        const arrayBuf = yield resp.arrayBuffer();
        const inputBuf = Buffer.from(arrayBuf);
        const resized = yield resizeTo512(inputBuf);
        return { buffer: resized, contentType: "image/png" };
    });
}
function ensureImageSizeFromUrl(url, width, height) {
    return __awaiter(this, void 0, void 0, function* () {
        const resp = yield fetch(url);
        if (!resp.ok)
            throw new Error(`Failed to fetch image: ${resp.status}`);
        const arrayBuf = yield resp.arrayBuffer();
        const inputBuf = Buffer.from(arrayBuf);
        const resized = yield (0, sharp_1.default)(inputBuf)
            .resize(width, height, { fit: "cover", position: "centre" })
            .toFormat("png")
            .toBuffer();
        return { buffer: resized, contentType: "image/png" };
    });
}
function downloadAndUploadImage(url, feature) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const resp = yield fetch(url);
            if (!resp.ok)
                throw new Error(`Failed to fetch image: ${resp.status}`);
            const arrayBuf = yield resp.arrayBuffer();
            const buffer = Buffer.from(arrayBuf);
            const contentType = resp.headers.get("content-type") || "image/png";
            const ext = contentType.split("/")[1] || "png";
            const key = makeKey({ type: "image", feature, ext });
            const { url: s3Url } = yield uploadBuffer(key, buffer, contentType);
            return s3Url;
        }
        catch (error) {
            console.error("Error in downloadAndUploadImage:", error);
            // Fallback to original URL if upload fails
            return url;
        }
    });
}
// Get the latest video for each feature directly from S3 (from both videos/ and generated-videos/)
function getLatestVideosFromS3() {
    return __awaiter(this, void 0, void 0, function* () {
        const videosByFeature = new Map();
        // Fetch from both 'videos/' and 'generated-videos/' prefixes
        const prefixes = ["videos/", "generated-videos/"];
        for (const prefix of prefixes) {
            let continuationToken;
            do {
                const command = new client_s3_1.ListObjectsV2Command({
                    Bucket: BUCKET,
                    Prefix: prefix,
                    ContinuationToken: continuationToken,
                });
                const response = yield exports.s3.send(command);
                if (response.Contents) {
                    for (const obj of response.Contents) {
                        if (obj.Key && obj.Key.endsWith(".mp4") && obj.LastModified) {
                            let feature = null;
                            // Extract feature from key
                            const parts = obj.Key.split("/");
                            if (prefix === "generated-videos/") {
                                // For generated-videos/, files can be:
                                // 1. Directly in folder: "generated-videos/ai-360-turn-minimax-1762142023305.mp4"
                                // 2. In subfolder: "generated-videos/{feature}/{feature}-{timestamp}-{random}.mp4"
                                if (parts.length === 2) {
                                    // Direct file: extract feature from filename
                                    const filename = parts[1];
                                    // Extract feature name from filename (everything before the optional provider and timestamp)
                                    // Pattern can be:
                                    // 1. {feature}-{provider}-{timestamp}.mp4 (e.g., ai-360-turn-minimax-1762142023305.mp4)
                                    // 2. {feature}-{timestamp}.mp4 (e.g., ai-angel-1758127820861.mp4)
                                    // Common providers: minimax, pixverse, runway, luma, kling, etc.
                                    const knownProviders = [
                                        "minimax",
                                        "pixverse",
                                        "runway",
                                        "luma",
                                        "kling",
                                        "veo512v",
                                        "veo5i2v",
                                    ];
                                    // First try to match with provider: {feature}-{provider}-{timestamp}.mp4
                                    let matched = false;
                                    for (const provider of knownProviders) {
                                        const pattern = new RegExp(`^(.+)-${provider}-\\d{10,}\\.mp4$`, "i");
                                        const match = filename.match(pattern);
                                        if (match) {
                                            feature = match[1];
                                            console.log(`[S3] Extracted feature "${feature}" from filename "${filename}" (provider: ${provider})`);
                                            matched = true;
                                            break;
                                        }
                                    }
                                    // If no provider match, try simple pattern: {feature}-{timestamp}.mp4
                                    if (!matched) {
                                        const match = filename.match(/^(.+)-\d{10,}\.mp4$/i);
                                        if (match) {
                                            feature = match[1];
                                            console.log(`[S3] Extracted feature "${feature}" from filename "${filename}" (no provider)`);
                                        }
                                        else {
                                            console.log(`[S3] Failed to match pattern for filename: ${filename}`);
                                        }
                                    }
                                }
                                else if (parts.length >= 3) {
                                    // Subfolder structure
                                    feature = parts[1];
                                }
                            }
                            else if (prefix === "videos/") {
                                // For videos/, structure is: "videos/{feature}/{feature}-{timestamp}-{random}.mp4"
                                if (parts.length >= 2) {
                                    feature = parts[1];
                                }
                            }
                            if (feature) {
                                const existing = videosByFeature.get(feature);
                                if (!existing || obj.LastModified > existing.lastModified) {
                                    videosByFeature.set(feature, {
                                        key: obj.Key,
                                        lastModified: obj.LastModified,
                                    });
                                }
                            }
                        }
                    }
                }
                continuationToken = response.NextContinuationToken;
            } while (continuationToken);
        }
        console.log(`[S3] Found ${videosByFeature.size} features with videos`);
        // Convert map to array of results
        const results = [];
        for (const [endpoint, data] of videosByFeature) {
            results.push({
                endpoint,
                key: data.key,
                url: publicUrlFor(data.key),
                lastModified: data.lastModified,
            });
        }
        return results;
    });
}
// Get all videos for a specific feature from S3 (from both videos/ and generated-videos/)
function getVideosForFeatureFromS3(feature) {
    return __awaiter(this, void 0, void 0, function* () {
        const videos = [];
        const normalizedFeature = feature.replace(/[^a-zA-Z0-9_-]/g, "-");
        // 1. Fetch from subfolder structure: videos/{feature}/ and generated-videos/{feature}/
        const subfolderPrefixes = [
            `videos/${normalizedFeature}/`,
            `generated-videos/${normalizedFeature}/`,
        ];
        for (const featurePrefix of subfolderPrefixes) {
            let continuationToken;
            do {
                const command = new client_s3_1.ListObjectsV2Command({
                    Bucket: BUCKET,
                    Prefix: featurePrefix,
                    ContinuationToken: continuationToken,
                });
                const response = yield exports.s3.send(command);
                if (response.Contents) {
                    for (const obj of response.Contents) {
                        if (obj.Key && obj.Key.endsWith(".mp4") && obj.LastModified) {
                            videos.push({
                                key: obj.Key,
                                url: publicUrlFor(obj.Key),
                                lastModified: obj.LastModified,
                            });
                        }
                    }
                }
                continuationToken = response.NextContinuationToken;
            } while (continuationToken);
        }
        // 2. Also fetch from generated-videos/ root for files matching the feature name pattern
        // Pattern: generated-videos/{feature}-{timestamp}-{random}.mp4
        let continuationToken;
        do {
            const command = new client_s3_1.ListObjectsV2Command({
                Bucket: BUCKET,
                Prefix: "generated-videos/",
                ContinuationToken: continuationToken,
            });
            const response = yield exports.s3.send(command);
            if (response.Contents) {
                for (const obj of response.Contents) {
                    if (obj.Key && obj.Key.endsWith(".mp4") && obj.LastModified) {
                        const parts = obj.Key.split("/");
                        // Check if file is directly in generated-videos/ (not in a subfolder)
                        if (parts.length === 2) {
                            const filename = parts[1];
                            // Check if filename starts with the feature name
                            // Pattern can be:
                            // 1. {feature}-{provider}-{timestamp}.mp4 (e.g., ai-360-turn-minimax-1762142023305.mp4)
                            // 2. {feature}-{timestamp}.mp4 (e.g., ai-angel-1758127820861.mp4)
                            const knownProviders = [
                                "minimax",
                                "pixverse",
                                "runway",
                                "luma",
                                "kling",
                                "veo512v",
                                "veo5i2v",
                            ];
                            // Try matching with provider first
                            let isMatch = false;
                            for (const provider of knownProviders) {
                                const pattern = new RegExp(`^${normalizedFeature}-${provider}-\\d+\\.mp4$`, "i");
                                if (pattern.test(filename)) {
                                    isMatch = true;
                                    break;
                                }
                            }
                            // If no provider match, try simple pattern without provider
                            if (!isMatch) {
                                const pattern = new RegExp(`^${normalizedFeature}-\\d+\\.mp4$`, "i");
                                isMatch = pattern.test(filename);
                            }
                            if (isMatch) {
                                videos.push({
                                    key: obj.Key,
                                    url: publicUrlFor(obj.Key),
                                    lastModified: obj.LastModified,
                                });
                            }
                        }
                    }
                }
            }
            continuationToken = response.NextContinuationToken;
        } while (continuationToken);
        // Sort by lastModified descending (newest first)
        videos.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
        return videos;
    });
}
// Get all sounds organized by category from S3
function getSoundsFromS3() {
    return __awaiter(this, void 0, void 0, function* () {
        const soundsByCategory = {};
        const soundsPrefix = "Sounds/";
        let continuationToken;
        do {
            const command = new client_s3_1.ListObjectsV2Command({
                Bucket: BUCKET,
                Prefix: soundsPrefix,
                ContinuationToken: continuationToken,
            });
            const response = yield exports.s3.send(command);
            if (response.Contents) {
                for (const obj of response.Contents) {
                    if (obj.Key && obj.Key.endsWith(".mp3")) {
                        // Extract category and file name from key: "Sounds/{category}/{filename}.mp3"
                        const parts = obj.Key.split("/");
                        if (parts.length >= 3) {
                            const category = parts[1]; // The folder name is the category
                            const fileName = parts[parts.length - 1]; // The actual file name
                            if (!soundsByCategory[category]) {
                                soundsByCategory[category] = [];
                            }
                            soundsByCategory[category].push({
                                key: obj.Key,
                                url: publicUrlFor(obj.Key),
                                name: fileName.replace(".mp3", ""), // Remove extension for display
                            });
                        }
                    }
                }
            }
            continuationToken = response.NextContinuationToken;
        } while (continuationToken);
        // Sort sounds within each category by name
        for (const category in soundsByCategory) {
            soundsByCategory[category].sort((a, b) => a.name.localeCompare(b.name));
        }
        return soundsByCategory;
    });
}
function listAllImagesFromS3() {
    return __awaiter(this, void 0, void 0, function* () {
        const images = [];
        const prefix = "images/";
        let continuationToken;
        do {
            const command = new client_s3_1.ListObjectsV2Command({
                Bucket: BUCKET,
                Prefix: prefix,
                ContinuationToken: continuationToken,
            });
            const response = yield exports.s3.send(command);
            if (response.Contents) {
                for (const obj of response.Contents) {
                    if (obj.Key && obj.LastModified) {
                        // Extract feature from key: images/{feature}/{filename}
                        const parts = obj.Key.split("/");
                        if (parts.length >= 3) {
                            const feature = parts[1];
                            // Check if it's an image file
                            const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(obj.Key);
                            if (isImage) {
                                images.push({
                                    key: obj.Key,
                                    url: publicUrlFor(obj.Key),
                                    feature,
                                    lastModified: obj.LastModified,
                                });
                            }
                        }
                    }
                }
            }
            continuationToken = response.NextContinuationToken;
        } while (continuationToken);
        // Sort by lastModified descending (newest first)
        images.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
        return images;
    });
}
