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
