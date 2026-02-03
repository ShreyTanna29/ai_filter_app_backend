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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = __importDefault(require("./lib/prisma"));
const filter_endpoints_1 = __importDefault(require("./routes/filter_endpoints"));
const templates_1 = __importDefault(require("./routes/templates"));
const photo_templates_1 = __importDefault(require("./routes/photo-templates"));
const generate_video_1 = __importDefault(require("./routes/generate-video"));
const runware_1 = __importDefault(require("./routes/runware"));
const simple_auth_1 = __importDefault(require("./routes/simple-auth"));
const categories_1 = __importDefault(require("./routes/categories"));
const apps_1 = __importDefault(require("./routes/apps"));
const workflows_1 = __importDefault(require("./routes/workflows"));
const photo_packs_1 = __importDefault(require("./routes/photo-packs"));
const sub_admins_1 = __importDefault(require("./routes/sub-admins"));
const multer_1 = __importDefault(require("multer"));
const s3_1 = require("./lib/s3");
const signedUrl_1 = require("./middleware/signedUrl");
const cache_1 = require("./lib/cache");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.static("public")); // Serve static files from public directory
// Global debug middleware
app.use((req, res, next) => {
    if (req.originalUrl.includes("sub-admins")) {
        console.log(`[GLOBAL DEBUG] ${req.method} ${req.originalUrl}`);
    }
    next();
});
// Feature management routes
// Get all features without pagination (with optional status filter)
// If ADMIN_API_KEY is provided, returns all features
// Otherwise, returns only features allowed for the app
app.get("/api/features/all", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.query;
        // Extract API key from request
        const apiKey = req.header("x-api-key") ||
            req.header("x-apikey") ||
            (req.header("authorization") || "").replace(/^bearer\s+/i, "").trim() ||
            req.query.api_key ||
            req.query.apiKey;
        if (!apiKey) {
            return res.status(401).json({
                success: false,
                message: "API key is required",
            });
        }
        // Ensure cache is fresh
        yield (0, cache_1.ensureFeaturesCache)();
        // Check if it's admin API key
        const adminKeys = [
            process.env.ADMIN_API_KEY,
            process.env["admin_api_key"],
            process.env.ADMIN_KEY,
        ].filter(Boolean);
        const isAdmin = adminKeys.includes(apiKey);
        if (isAdmin) {
            // Return all features for admin from cache
            const whereClause = status && typeof status === "string" && status !== "all"
                ? { status }
                : {};
            const featuresCache = (0, cache_1.getFeaturesCache)();
            const list = whereClause.status
                ? featuresCache.filter((f) => f.status === whereClause.status)
                : featuresCache;
            return res.json({
                success: true,
                features: list,
            });
        }
        // For non-admin, find app in cache
        const appsWithPermissionsCache = (0, cache_1.getAppsWithPermissionsCache)();
        const app = appsWithPermissionsCache.find((a) => a.apiKey === apiKey && a.isActive);
        if (!app) {
            return res.status(401).json({
                success: false,
                message: "Invalid or inactive API key",
            });
        }
        // Get only allowed features for this app
        const allowedFeatures = app.allowedFeatures.map((af) => af.feature);
        // Apply status filter if provided
        const filteredFeatures = status && typeof status === "string" && status !== "all"
            ? allowedFeatures.filter((f) => f.status === status)
            : allowedFeatures;
        res.json({
            success: true,
            features: filteredFeatures,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Paginated features list
app.get("/api/features", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;
        const whereClause = search && typeof search === "string"
            ? {
                OR: [
                    { endpoint: { contains: search, mode: "insensitive" } },
                    { prompt: { contains: search, mode: "insensitive" } },
                ],
            }
            : {};
        const [list, total] = yield Promise.all([
            prisma_1.default.features.findMany({
                where: whereClause,
                skip,
                take: limitNumber,
                orderBy: { createdAt: "asc" },
            }),
            prisma_1.default.features.count({ where: whereClause }),
        ]);
        res.json({
            success: true,
            features: list,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages: Math.ceil(total / limitNumber),
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Update a feature's status
app.patch("/api/features/:endpoint/status", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { endpoint } = req.params;
    const { status } = req.body;
    const validStatuses = ["completed", "not-completed", "needs-more-videos"];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Status must be one of: ${validStatuses.join(", ")}`,
        });
    }
    try {
        const feature = yield prisma_1.default.features.update({
            where: { endpoint },
            data: { status },
        });
        // Invalidate cache
        (0, cache_1.invalidateFeaturesCache)();
        res.json({
            success: true,
            message: "Feature status updated successfully",
            feature,
        });
    }
    catch (error) {
        console.error(error);
        if (error.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Feature not found",
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Update a feature's prompt (no auth required)
app.put("/api/features/:endpoint", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { endpoint } = req.params;
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({
            success: false,
            message: "Prompt is required",
        });
    }
    try {
        const feature = yield prisma_1.default.features.update({
            where: { endpoint },
            data: { prompt },
        });
        // Invalidate cache
        (0, cache_1.invalidateFeaturesCache)();
        res.json({
            success: true,
            message: "Feature updated successfully",
            feature,
        });
    }
    catch (error) {
        console.error(error);
        if (error.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Feature not found",
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Create a new feature (admin only)
app.post("/api/features", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { endpoint, prompt } = req.body;
    if (!endpoint || !prompt) {
        return res.status(400).json({
            success: false,
            message: "Endpoint and prompt are required",
        });
    }
    try {
        const feature = yield prisma_1.default.features.create({
            data: {
                endpoint,
                prompt,
                isActive: true,
            },
        });
        // Invalidate cache
        (0, cache_1.invalidateFeaturesCache)();
        res.status(201).json({
            success: true,
            message: "Feature created successfully",
            feature,
        });
    }
    catch (error) {
        console.error(error);
        if (error.code === "P2002") {
            return res.status(400).json({
                success: false,
                message: "Feature with this endpoint already exists",
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Rename a feature endpoint (admin only)
app.put("/api/features/:endpoint/rename", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { endpoint } = req.params;
    const { newEndpoint } = req.body;
    if (!newEndpoint) {
        return res.status(400).json({
            success: false,
            message: "New endpoint is required",
        });
    }
    try {
        // Check if new endpoint already exists
        const existingFeature = yield prisma_1.default.features.findUnique({
            where: { endpoint: newEndpoint },
        });
        if (existingFeature) {
            return res.status(400).json({
                success: false,
                message: "Feature with this endpoint already exists",
            });
        }
        // Update the endpoint
        const feature = yield prisma_1.default.features.update({
            where: { endpoint },
            data: { endpoint: newEndpoint },
        });
        // Invalidate cache
        (0, cache_1.invalidateFeaturesCache)();
        res.json({
            success: true,
            message: "Feature renamed successfully",
            feature,
        });
    }
    catch (error) {
        console.error(error);
        if (error.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Feature not found",
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Delete a feature (admin only)
app.delete("/api/features/:endpoint", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { endpoint } = req.params;
    try {
        yield prisma_1.default.features.delete({
            where: { endpoint },
        });
        // Invalidate cache
        (0, cache_1.invalidateFeaturesCache)();
        res.json({
            success: true,
            message: "Feature deleted successfully",
        });
    }
    catch (error) {
        console.error(error);
        if (error.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Feature not found",
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Photo Feature management routes
// Get all photo features without pagination
// If ADMIN_API_KEY is provided, returns all photo features
// Otherwise, returns only photo features allowed for the app
app.get("/api/photo-features/all", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract API key from request
        const apiKey = req.header("x-api-key") ||
            req.header("x-apikey") ||
            (req.header("authorization") || "").replace(/^bearer\s+/i, "").trim() ||
            req.query.api_key ||
            req.query.apiKey;
        if (!apiKey) {
            return res.status(401).json({
                success: false,
                message: "API key is required",
            });
        }
        // Check if it's admin API key
        const adminKeys = [
            process.env.ADMIN_API_KEY,
            process.env["admin_api_key"],
            process.env.ADMIN_KEY,
        ].filter(Boolean);
        const isAdmin = adminKeys.includes(apiKey);
        if (isAdmin) {
            // Return all photo features for admin
            const list = yield prisma_1.default.photo_Features.findMany({
                orderBy: { createdAt: "asc" },
            });
            return res.json({
                success: true,
                features: list,
            });
        }
        // For non-admin, find app and return only allowed photo features
        const app = yield prisma_1.default.app.findUnique({
            where: { apiKey },
            include: {
                allowedPhotoFeatures: {
                    include: {
                        photoFeature: true,
                    },
                },
            },
        });
        if (!app) {
            return res.status(401).json({
                success: false,
                message: "Invalid API key",
            });
        }
        if (!app.isActive) {
            return res.status(403).json({
                success: false,
                message: "App is not active",
            });
        }
        // Extract only the photo features from the allowed list
        const allowedFeatures = app.allowedPhotoFeatures
            .map((af) => af.photoFeature)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        res.json({
            success: true,
            features: allowedFeatures,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Paginated photo features list
app.get("/api/photo-features", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;
        const whereClause = search && typeof search === "string"
            ? {
                OR: [
                    { endpoint: { contains: search, mode: "insensitive" } },
                    { prompt: { contains: search, mode: "insensitive" } },
                ],
            }
            : {};
        const [list, total] = yield Promise.all([
            prisma_1.default.photo_Features.findMany({
                where: whereClause,
                skip,
                take: limitNumber,
                orderBy: { createdAt: "asc" },
            }),
            prisma_1.default.photo_Features.count({ where: whereClause }),
        ]);
        res.json({
            success: true,
            features: list,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages: Math.ceil(total / limitNumber),
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Update a photo feature (admin only)
app.put("/api/photo-features/:endpoint", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { endpoint } = req.params;
    const { prompt, isActive } = req.body;
    try {
        const updated = yield prisma_1.default.photo_Features.update({
            where: { endpoint },
            data: {
                prompt,
                isActive,
            },
        });
        res.json({
            success: true,
            feature: updated,
        });
    }
    catch (error) {
        console.error(error);
        if (error.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Photo feature not found",
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Create a new photo feature (admin only)
app.post("/api/photo-features", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { endpoint, prompt } = req.body;
    if (!endpoint || !prompt) {
        return res.status(400).json({
            success: false,
            message: "Endpoint and prompt are required",
        });
    }
    try {
        const created = yield prisma_1.default.photo_Features.create({
            data: {
                endpoint,
                prompt,
                isActive: true,
            },
        });
        res.json({
            success: true,
            feature: created,
        });
    }
    catch (error) {
        console.error(error);
        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "Photo feature with this endpoint already exists",
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Rename a photo feature endpoint (admin only)
app.put("/api/photo-features/:endpoint/rename", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { endpoint } = req.params;
    const { newEndpoint } = req.body;
    if (!newEndpoint) {
        return res.status(400).json({
            success: false,
            message: "New endpoint name is required",
        });
    }
    try {
        const updated = yield prisma_1.default.photo_Features.update({
            where: { endpoint },
            data: { endpoint: newEndpoint },
        });
        res.json({
            success: true,
            feature: updated,
        });
    }
    catch (error) {
        console.error(error);
        if (error.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Photo feature not found",
            });
        }
        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "A photo feature with this endpoint already exists",
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Delete a photo feature (admin only)
app.delete("/api/photo-features/:endpoint", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { endpoint } = req.params;
    try {
        yield prisma_1.default.photo_Features.delete({
            where: { endpoint },
        });
        res.json({
            success: true,
            message: "Photo feature deleted successfully",
        });
    }
    catch (error) {
        console.error(error);
        if (error.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Photo feature not found",
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// ============================================
// === CARTOON CHARACTERS API ENDPOINTS ===
// ============================================
// Get all cartoon characters without pagination
app.get("/api/cartoon-characters/all", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const list = yield prisma_1.default.cartoon_Characters.findMany({
            orderBy: { createdAt: "asc" },
        });
        res.json({
            success: true,
            features: list,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Paginated cartoon characters list with search
app.get("/api/cartoon-characters", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;
        const whereClause = search && typeof search === "string"
            ? {
                OR: [
                    { endpoint: { contains: search, mode: "insensitive" } },
                    { prompt: { contains: search, mode: "insensitive" } },
                ],
            }
            : {};
        const [list, total] = yield Promise.all([
            prisma_1.default.cartoon_Characters.findMany({
                where: whereClause,
                skip,
                take: limitNumber,
                orderBy: { createdAt: "asc" },
            }),
            prisma_1.default.cartoon_Characters.count({ where: whereClause }),
        ]);
        res.json({
            success: true,
            features: list,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages: Math.ceil(total / limitNumber),
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Update a cartoon character's prompt
app.put("/api/cartoon-characters/:endpoint", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { endpoint } = req.params;
    const { prompt, isActive } = req.body;
    try {
        const updated = yield prisma_1.default.cartoon_Characters.update({
            where: { endpoint },
            data: {
                prompt,
                isActive,
            },
        });
        res.json({
            success: true,
            feature: updated,
        });
    }
    catch (error) {
        console.error(error);
        if (error.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Cartoon character not found",
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Create a new cartoon character
app.post("/api/cartoon-characters", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { endpoint, prompt } = req.body;
    if (!endpoint || !prompt) {
        return res.status(400).json({
            success: false,
            message: "Endpoint and prompt are required",
        });
    }
    try {
        const created = yield prisma_1.default.cartoon_Characters.create({
            data: {
                endpoint,
                prompt,
                isActive: true,
            },
        });
        res.json({
            success: true,
            feature: created,
        });
    }
    catch (error) {
        console.error(error);
        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "Cartoon character with this endpoint already exists",
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Rename a cartoon character endpoint
app.put("/api/cartoon-characters/:endpoint/rename", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { endpoint } = req.params;
    const { newEndpoint } = req.body;
    if (!newEndpoint) {
        return res.status(400).json({
            success: false,
            message: "New endpoint name is required",
        });
    }
    try {
        const updated = yield prisma_1.default.cartoon_Characters.update({
            where: { endpoint },
            data: { endpoint: newEndpoint },
        });
        res.json({
            success: true,
            feature: updated,
        });
    }
    catch (error) {
        console.error(error);
        if (error.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Cartoon character not found",
            });
        }
        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "A cartoon character with this endpoint already exists",
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Delete a cartoon character
app.delete("/api/cartoon-characters/:endpoint", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { endpoint } = req.params;
    try {
        yield prisma_1.default.cartoon_Characters.delete({
            where: { endpoint },
        });
        res.json({
            success: true,
            message: "Cartoon character deleted successfully",
        });
    }
    catch (error) {
        console.error(error);
        if (error.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Cartoon character not found",
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}));
// Get cartoon character graphics (latest video per endpoint)
app.get("/api/cartoon-character-graphic", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const latestVideos = yield prisma_1.default.generated_Cartoon_Video.findMany({
            distinct: ["feature"],
            orderBy: [{ feature: "asc" }, { createdAt: "desc" }],
            select: {
                feature: true,
                url: true,
            },
        });
        const result = yield Promise.all(latestVideos.map((v) => __awaiter(void 0, void 0, void 0, function* () {
            let signed = v.url;
            try {
                if (v.url && /amazonaws\.com\//.test(v.url)) {
                    signed = yield (0, signedUrl_1.signKey)((0, signedUrl_1.deriveKey)(v.url));
                }
            }
            catch (_a) { }
            return { endpoint: v.feature, graphicUrl: signed };
        })));
        res.json(result);
    }
    catch (error) {
        console.error("Error computing cartoon character graphics:", error);
        res.status(500).json({ error: "Failed to get cartoon character graphics" });
    }
}));
// Mount specific routes BEFORE catch-all routes to avoid routing conflicts
app.use("/api/sub-admins", sub_admins_1.default);
app.use("/api/generate-video", generate_video_1.default);
app.use("/api/auth", simple_auth_1.default);
app.use("/api/categories", categories_1.default);
app.use("/api/apps", apps_1.default);
app.use("/api/photo-packs", photo_packs_1.default);
// These routers have catch-all routes like /:endpoint, so mount them last
app.use("/api", filter_endpoints_1.default);
app.use("/api", photo_templates_1.default);
app.use("/api", templates_1.default);
app.use("/api", runware_1.default);
app.use("/api", workflows_1.default);
// Get all sounds organized by category from S3
app.get("/api/sounds", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sounds = yield (0, s3_1.getSoundsFromS3)();
        // Sign URLs for all sounds
        const signedSounds = {};
        for (const category in sounds) {
            signedSounds[category] = yield Promise.all(sounds[category].map((sound) => __awaiter(void 0, void 0, void 0, function* () {
                let signedUrl = sound.url;
                try {
                    if (sound.key) {
                        signedUrl = yield (0, signedUrl_1.signKey)(sound.key);
                    }
                }
                catch (err) {
                    console.error(`Failed to sign URL for ${sound.key}:`, err);
                }
                return Object.assign(Object.assign({}, sound), { signedUrl });
            })));
        }
        res.json({
            success: true,
            sounds: signedSounds,
        });
    }
    catch (error) {
        console.error("Error fetching sounds:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch sounds",
        });
    }
}));
// Update audio for a specific video
app.put("/api/videos/:videoId/audio", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const videoId = parseInt(req.params.videoId);
        const { audioUrl } = req.body;
        if (isNaN(videoId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video ID",
            });
        }
        const updatedVideo = yield prisma_1.default.generatedVideo.update({
            where: { id: videoId },
            data: { audioUrl: audioUrl || null },
        });
        res.json({
            success: true,
            video: updatedVideo,
        });
    }
    catch (error) {
        console.error("Error updating video audio:", error);
        if (error.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Video not found",
            });
        }
        res.status(500).json({
            success: false,
            message: "Failed to update video audio",
        });
    }
}));
// S3-based image upload replacing legacy Cloudinary upload.
// Supports multipart file under field 'file' OR JSON body with { image_url }.
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
});
app.post("/api/upload-image", upload.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
]), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // If multipart file provided (accept both 'file' and 'image' field names)
        const files = req.files || {};
        const uploaded = (files["file"] && files["file"][0]) ||
            (files["image"] && files["image"][0]);
        if (uploaded) {
            const key = (0, s3_1.makeKey)({ type: "image", feature: "uploaded" });
            const result = yield (0, s3_1.uploadBuffer)(key, uploaded.buffer, uploaded.mimetype);
            const signedUrl = yield (0, signedUrl_1.signKey)(key);
            res.json({
                success: true,
                key: result.key,
                url: result.url,
                signedUrl,
            });
            return;
        }
        // If JSON body with remote image_url provided
        const { image_url, resize512 } = req.body;
        if (image_url && typeof image_url === "string") {
            let buffer;
            let contentType = "image/png";
            if (resize512) {
                // Normalize & resize
                const ensured = yield (0, s3_1.ensure512SquareImageFromUrl)(image_url);
                buffer = ensured.buffer;
                contentType = ensured.contentType;
            }
            else {
                const resp = yield fetch(image_url);
                if (!resp.ok) {
                    res
                        .status(400)
                        .json({ success: false, message: "Failed to fetch image_url" });
                    return;
                }
                const arr = yield resp.arrayBuffer();
                buffer = Buffer.from(arr);
                const ct = resp.headers.get("content-type");
                if (ct)
                    contentType = ct;
            }
            const key = (0, s3_1.makeKey)({ type: "image", feature: "uploaded" });
            const result = yield (0, s3_1.uploadBuffer)(key, buffer, contentType);
            const signedUrl = yield (0, signedUrl_1.signKey)(key);
            res.json({
                success: true,
                key: result.key,
                url: result.url,
                signedUrl,
            });
            return;
        }
        res
            .status(400)
            .json({ success: false, message: "No file or image_url provided" });
        return;
    }
    catch (e) {
        console.error("[UPLOAD-IMAGE] Error", e);
        res.status(500).json({
            success: false,
            message: "Upload failed",
            details: e === null || e === void 0 ? void 0 : e.message,
        });
        return;
    }
}));
// Backwards compatible path for former Cloudinary route if clients still call /api/cloudinary/upload
app.post("/api/cloudinary/upload", upload.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
]), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const files = req.files || {};
        const uploaded = (files["file"] && files["file"][0]) ||
            (files["image"] && files["image"][0]);
        if (uploaded) {
            const key = (0, s3_1.makeKey)({ type: "image", feature: "uploaded" });
            const result = yield (0, s3_1.uploadBuffer)(key, uploaded.buffer, uploaded.mimetype);
            const signedUrl = yield (0, signedUrl_1.signKey)(key);
            res.json({
                success: true,
                key: result.key,
                url: result.url,
                signedUrl,
                migrated: true,
            });
            return;
        }
        const { image_url } = req.body;
        if (image_url) {
            const ensured = yield (0, s3_1.ensure512SquareImageFromUrl)(image_url);
            const key = (0, s3_1.makeKey)({ type: "image", feature: "uploaded" });
            const result = yield (0, s3_1.uploadBuffer)(key, ensured.buffer, ensured.contentType);
            const signedUrl = yield (0, signedUrl_1.signKey)(key);
            res.json({
                success: true,
                key: result.key,
                url: result.url,
                signedUrl,
                migrated: true,
            });
            return;
        }
        res
            .status(400)
            .json({ success: false, message: "No file or image_url provided" });
        return;
    }
    catch (e) {
        console.error("[LEGACY-CLOUDINARY-UPLOAD] Error", e);
        res.status(500).json({
            success: false,
            message: "Upload failed",
            details: e === null || e === void 0 ? void 0 : e.message,
        });
        return;
    }
}));
// Serve admin panel HTML
app.get("/", (req, res) => {
    res.sendFile("index.html", { root: "./public" });
});
// Catch JSON parsing errors
app.use(function (err, req, res, next) {
    if (err instanceof SyntaxError && "body" in err) {
        return res.status(400).json({ message: "Invalid JSON body" });
    }
    next(err);
});
// Global error handler (fallback)
app.use(function (err, req, res, next) {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Internal server error" });
});
app.listen(PORT, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Server is running on http://localhost:${PORT}`);
    // Initialize cache on server start
    yield (0, cache_1.initializeFeaturesCache)();
}));
