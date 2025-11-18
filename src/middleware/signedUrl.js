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
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAssetMiddleware = void 0;
exports.deriveKey = deriveKey;
exports.signKey = signKey;
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_1 = require("../lib/s3");
const BUCKET = process.env.AWS_S3_BUCKET || "";
const DEFAULT_TTL = parseInt(process.env.AWS_S3_SIGNED_URL_TTL || "3600", 10); // seconds
// Helper to derive key from stored URL or key
function deriveKey(raw) {
    try {
        // If it's a full URL, parse and strip leading slash
        if (/^https?:\/\//i.test(raw)) {
            const u = new URL(raw);
            return u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
        }
        return raw; // assume already a key
    }
    catch (_a) {
        return raw;
    }
}
function signKey(key_1) {
    return __awaiter(this, arguments, void 0, function* (key, ttlSeconds = DEFAULT_TTL) {
        const cmd = new client_s3_1.GetObjectCommand({ Bucket: BUCKET, Key: key });
        return (0, s3_request_presigner_1.getSignedUrl)(s3_1.s3, cmd, { expiresIn: ttlSeconds });
    });
}
// Express middleware example usage (not yet wired): attaches signedUrl to res.locals for a given req.param 'key'
const signAssetMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        if (!key)
            return res.status(400).json({ error: "Missing key param" });
        const signed = yield signKey(key);
        res.json({ key, signedUrl: signed, expiresIn: DEFAULT_TTL });
    }
    catch (e) {
        console.error("[SIGN] Error generating signed URL", e);
        res
            .status(500)
            .json({ error: "Failed to sign asset", details: e === null || e === void 0 ? void 0 : e.message });
    }
});
exports.signAssetMiddleware = signAssetMiddleware;
