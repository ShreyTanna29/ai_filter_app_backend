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
exports.getLatestVideosFromS3 = getLatestVideosFromS3;
exports.getVideosForFeatureFromS3 = getVideosForFeatureFromS3;
exports.getSoundsFromS3 = getSoundsFromS3;
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
                            // Extract feature from key: "videos/{feature}/{feature}-{timestamp}-{random}.mp4"
                            // or "generated-videos/{feature}/{feature}-{timestamp}-{random}.mp4"
                            const parts = obj.Key.split("/");
                            if (parts.length >= 2) {
                                const feature = parts[1]; // The folder name is the feature/endpoint
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
        // Fetch from both 'videos/' and 'generated-videos/' prefixes
        const prefixes = [
            `videos/${normalizedFeature}/`,
            `generated-videos/${normalizedFeature}/`,
        ];
        for (const featurePrefix of prefixes) {
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
