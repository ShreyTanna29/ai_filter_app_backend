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
const prisma_1 = __importDefault(require("../lib/prisma"));
const crypto_1 = __importDefault(require("crypto"));
const signedUrl_1 = require("../middleware/signedUrl");
const router = (0, express_1.Router)();
function generateApiKey() {
    return crypto_1.default.randomBytes(32).toString("hex");
}
// List apps (requires API key)
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const apps = yield prisma_1.default.app.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ success: true, apps });
}));
// Get all available resources for app permissions
// IMPORTANT: This route must be defined BEFORE /:id to avoid conflicts
router.get("/resources/all", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [features, photoFeatures, generatedVideos, generatedPhotos] = yield Promise.all([
            prisma_1.default.features.findMany({ orderBy: { endpoint: "asc" } }),
            prisma_1.default.photo_Features.findMany({ orderBy: { endpoint: "asc" } }),
            prisma_1.default.generatedVideo.findMany({ orderBy: { createdAt: "desc" } }),
            prisma_1.default.generated_Photo.findMany({ orderBy: { createdAt: "desc" } }),
        ]);
        const S3_BUCKET = process.env.AWS_S3_BUCKET || "";
        // Helper to check if URL is from our S3 bucket
        const isS3Url = (url) => {
            if (!url || !S3_BUCKET)
                return false;
            return (url.includes(S3_BUCKET) ||
                url.includes("s3.") ||
                url.includes("amazonaws.com"));
        };
        // Sign URLs for generated videos (stored in S3)
        const signedVideos = yield Promise.all(generatedVideos.map((v) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                if (isS3Url(v.url)) {
                    const key = (0, signedUrl_1.deriveKey)(v.url);
                    const signedUrl = yield (0, signedUrl_1.signKey)(key);
                    return Object.assign(Object.assign({}, v), { signedUrl });
                }
                // Not an S3 URL, use as-is
                return Object.assign(Object.assign({}, v), { signedUrl: v.url });
            }
            catch (_a) {
                return Object.assign(Object.assign({}, v), { signedUrl: v.url });
            }
        })));
        // Photos are stored as external URLs (Runware), not S3 - use directly
        const signedPhotos = yield Promise.all(generatedPhotos.map((p) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                if (isS3Url(p.url)) {
                    const key = (0, signedUrl_1.deriveKey)(p.url);
                    const signedUrl = yield (0, signedUrl_1.signKey)(key);
                    return Object.assign(Object.assign({}, p), { signedUrl });
                }
                // Not an S3 URL (e.g., Runware CDN), use as-is
                return Object.assign(Object.assign({}, p), { signedUrl: p.url });
            }
            catch (_a) {
                return Object.assign(Object.assign({}, p), { signedUrl: p.url });
            }
        })));
        res.json({
            success: true,
            features,
            photoFeatures,
            generatedVideos: signedVideos,
            generatedPhotos: signedPhotos,
        });
    }
    catch (e) {
        res
            .status(500)
            .json({ success: false, message: "Failed to get resources" });
    }
}));
// Get app details with permissions
router.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const idNum = Number(req.params.id);
    if (Number.isNaN(idNum) || idNum <= 0) {
        res.status(400).json({ success: false, message: "invalid id" });
        return;
    }
    try {
        const app = yield prisma_1.default.app.findUnique({
            where: { id: idNum },
            include: {
                allowedFeatures: {
                    include: { feature: true },
                },
                allowedPhotoFeatures: {
                    include: { photoFeature: true },
                },
                allowedVideos: {
                    include: { generatedVideo: true },
                },
                allowedPhotos: {
                    include: { generatedPhoto: true },
                },
            },
        });
        if (!app) {
            res.status(404).json({ success: false, message: "App not found" });
            return;
        }
        res.json({ success: true, app });
    }
    catch (e) {
        res.status(500).json({ success: false, message: "Failed to get app" });
    }
}));
// Update app permissions
router.put("/:id/permissions", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const idNum = Number(req.params.id);
    if (Number.isNaN(idNum) || idNum <= 0) {
        res.status(400).json({ success: false, message: "invalid id" });
        return;
    }
    const body = req.body;
    try {
        // Use transaction to update all permissions atomically
        yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Update Features permissions
            if (Array.isArray(body.featureIds)) {
                yield tx.appFeature.deleteMany({ where: { appId: idNum } });
                if (body.featureIds.length > 0) {
                    yield tx.appFeature.createMany({
                        data: body.featureIds.map((featureId) => ({
                            appId: idNum,
                            featureId,
                        })),
                    });
                }
            }
            // Update Photo Features permissions
            if (Array.isArray(body.photoFeatureIds)) {
                yield tx.appPhotoFeature.deleteMany({ where: { appId: idNum } });
                if (body.photoFeatureIds.length > 0) {
                    yield tx.appPhotoFeature.createMany({
                        data: body.photoFeatureIds.map((photoFeatureId) => ({
                            appId: idNum,
                            photoFeatureId,
                        })),
                    });
                }
            }
            // Update Generated Videos permissions
            if (Array.isArray(body.generatedVideoIds)) {
                yield tx.appGeneratedVideo.deleteMany({ where: { appId: idNum } });
                if (body.generatedVideoIds.length > 0) {
                    yield tx.appGeneratedVideo.createMany({
                        data: body.generatedVideoIds.map((generatedVideoId) => ({
                            appId: idNum,
                            generatedVideoId,
                        })),
                    });
                }
            }
            // Update Generated Photos permissions
            if (Array.isArray(body.generatedPhotoIds)) {
                yield tx.appGeneratedPhoto.deleteMany({ where: { appId: idNum } });
                if (body.generatedPhotoIds.length > 0) {
                    yield tx.appGeneratedPhoto.createMany({
                        data: body.generatedPhotoIds.map((generatedPhotoId) => ({
                            appId: idNum,
                            generatedPhotoId,
                        })),
                    });
                }
            }
        }));
        // Fetch updated app with permissions
        const app = yield prisma_1.default.app.findUnique({
            where: { id: idNum },
            include: {
                allowedFeatures: {
                    include: { feature: true },
                },
                allowedPhotoFeatures: {
                    include: { photoFeature: true },
                },
                allowedVideos: {
                    include: { generatedVideo: true },
                },
                allowedPhotos: {
                    include: { generatedPhoto: true },
                },
            },
        });
        res.json({ success: true, app });
    }
    catch (e) {
        console.error("Error updating app permissions:", e);
        res
            .status(500)
            .json({ success: false, message: "Failed to update permissions" });
    }
}));
// Create app (requires API key or ADMIN_API_KEY)
router.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
        res.status(400).json({ success: false, message: "name is required" });
        return;
    }
    try {
        const apiKey = generateApiKey();
        const app = yield prisma_1.default.app.create({ data: { name, apiKey } });
        res.status(201).json({ success: true, app });
    }
    catch (e) {
        const err = e;
        if ((err === null || err === void 0 ? void 0 : err.code) === "P2002") {
            res
                .status(409)
                .json({ success: false, message: "App name already exists" });
            return;
        }
        res.status(500).json({ success: false, message: "Failed to create app" });
    }
}));
// Rotate key (requires API key)
router.post("/:id/rotate", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const idNum = Number(req.params.id);
    if (Number.isNaN(idNum) || idNum <= 0) {
        res.status(400).json({ success: false, message: "invalid id" });
        return;
    }
    const apiKey = generateApiKey();
    try {
        const app = yield prisma_1.default.app.update({
            where: { id: idNum },
            data: { apiKey },
        });
        res.json({ success: true, app });
    }
    catch (e) {
        res.status(404).json({ success: false, message: "App not found" });
    }
}));
// Delete app (requires API key)
router.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const idNum = Number(req.params.id);
    if (Number.isNaN(idNum) || idNum <= 0) {
        res.status(400).json({ success: false, message: "invalid id" });
        return;
    }
    try {
        yield prisma_1.default.app.delete({ where: { id: idNum } });
        res.json({ success: true });
    }
    catch (e) {
        res.status(404).json({ success: false, message: "App not found" });
    }
}));
exports.default = router;
