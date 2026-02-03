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
exports.invalidateEndpointsCache = invalidateEndpointsCache;
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const axios_1 = __importDefault(require("axios"));
const s3_1 = require("../lib/s3");
const signedUrl_1 = require("../middleware/signedUrl");
const roles_1 = require("../middleware/roles");
// This route previously used Cloudinary. All video assets now stored in private S3.
// We keep DB column `videoUrl` but store canonical S3 public-style URL (not presigned).
// Responses enrich with `signedUrl` so clients can access private objects.
const router = (0, express_1.Router)();
// Cache for endpoints
let endpointsCache = [];
let endpointsCacheTimestamp = 0;
const ENDPOINTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
// Initialize endpoints cache
function initializeEndpointsCache() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("[CACHE] Initializing endpoints cache...");
            const allFeatures = yield prisma_1.default.features.findMany({
                orderBy: { endpoint: "asc" },
            });
            endpointsCache = allFeatures;
            endpointsCacheTimestamp = Date.now();
            console.log(`[CACHE] Cached ${allFeatures.length} endpoints`);
        }
        catch (error) {
            console.error("[CACHE] Error initializing endpoints cache:", error);
        }
    });
}
// Refresh cache if expired
function ensureEndpointsCache() {
    return __awaiter(this, void 0, void 0, function* () {
        if (Date.now() - endpointsCacheTimestamp > ENDPOINTS_CACHE_TTL) {
            yield initializeEndpointsCache();
        }
    });
}
// Invalidate cache (export for use when features are modified)
function invalidateEndpointsCache() {
    endpointsCacheTimestamp = 0;
    console.log("[CACHE] Endpoints cache invalidated");
}
// Initialize cache when module loads
initializeEndpointsCache();
// In-memory map to track registered template routes
const templateRouteMap = {};
// Helper to sanitize template name for use in route path
// Replaces special characters with hyphens, keeps only alphanumeric and hyphens
function sanitizeTemplateNameForRoute(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}
// Helper to register a dynamic endpoint for a template
function registerTemplateEndpoint(template) {
    return __awaiter(this, void 0, void 0, function* () {
        const sanitizedName = sanitizeTemplateNameForRoute(template.name);
        const endpoint = `/template-endpoint/${sanitizedName}`;
        // Remove existing route if present
        if (templateRouteMap[endpoint]) {
            router.stack = router.stack.filter((layer) => !(layer.route && layer.route.path === endpoint));
            delete templateRouteMap[endpoint];
        }
        // Register new route
        const handler = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Always fetch latest template data
                const dbTemplate = yield prisma_1.default.template.findUnique({
                    where: { id: template.id },
                    include: {
                        subcategories: {
                            include: {
                                steps: { orderBy: { order: "asc" } },
                            },
                        },
                    },
                });
                if (!dbTemplate)
                    return res.status(404).json({ error: "Template not found" });
                const stepVideos = yield prisma_1.default.templateStepVideo.findMany({
                    where: { templateId: template.id },
                    orderBy: { stepIndex: "asc" },
                });
                // Enrich each video with a signed URL when possible
                const enriched = yield Promise.all(stepVideos.map((v) => __awaiter(this, void 0, void 0, function* () {
                    let signedUrl;
                    try {
                        const key = (0, signedUrl_1.deriveKey)(v.videoUrl);
                        signedUrl = yield (0, signedUrl_1.signKey)(key);
                    }
                    catch (_a) { }
                    return Object.assign(Object.assign({}, v), { signedUrl });
                })));
                res.json({
                    id: dbTemplate.id,
                    name: dbTemplate.name,
                    description: dbTemplate.description,
                    subcategories: dbTemplate.subcategories,
                    stepVideos: enriched,
                });
            }
            catch (e) {
                res.status(500).json({ error: "Failed to fetch template data" });
            }
        });
        router.get(endpoint, handler);
        templateRouteMap[endpoint] = handler;
    });
}
// Helper to unregister a template endpoint
function unregisterTemplateEndpoint(template) {
    const sanitizedName = sanitizeTemplateNameForRoute(template.name);
    const endpoint = `/template-endpoint/${sanitizedName}`;
    if (templateRouteMap[endpoint]) {
        router.stack = router.stack.filter((layer) => !(layer.route && layer.route.path === endpoint));
        delete templateRouteMap[endpoint];
    }
}
// Helper to get or create a main category for a template
function getOrCreateMainCategory(name) {
    return __awaiter(this, void 0, void 0, function* () {
        let category = yield prisma_1.default.category.findFirst({ where: { name } });
        if (!category) {
            category = yield prisma_1.default.category.create({ data: { name } });
        }
        return category;
    });
}
// Create a new template (admin only)
router.post("/templates", (0, roles_1.requirePermission)("templates", "CREATE"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, subcategories } = req.body;
        if (!name || !subcategories || !Array.isArray(subcategories)) {
            res
                .status(400)
                .json({ error: "Name and subcategories array are required" });
            return;
        }
        // Get or create main category
        const mainCategory = yield getOrCreateMainCategory(name);
        // Create the template
        const template = yield prisma_1.default.template.create({
            data: {
                name,
                description,
                category: { connect: { id: mainCategory.id } },
                subcategories: {
                    create: yield Promise.all(subcategories.map((subcat) => __awaiter(void 0, void 0, void 0, function* () {
                        const steps = yield Promise.all((subcat.steps || []).map((step, idx) => __awaiter(void 0, void 0, void 0, function* () {
                            const feat = yield prisma_1.default.features.findUnique({
                                where: { endpoint: step.endpoint },
                            });
                            return {
                                endpoint: step.endpoint,
                                prompt: (feat === null || feat === void 0 ? void 0 : feat.prompt) || "",
                                order: idx,
                            };
                        })));
                        return {
                            name: subcat.name,
                            category: { connect: { id: mainCategory.id } },
                            steps: {
                                create: steps,
                            },
                        };
                    }))),
                },
            },
            include: {
                subcategories: {
                    include: { steps: { orderBy: { order: "asc" } } },
                },
                category: true,
            },
        });
        // Register dynamic endpoint for this template
        yield registerTemplateEndpoint(template);
        res.status(201).json(template);
    }
    catch (error) {
        console.error("Error creating template:", error);
        res.status(500).json({ error: "Failed to create template" });
    }
}));
// Get all templates (with subcategories and steps)
router.get("/templates", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const templates = yield prisma_1.default.template.findMany({
            include: {
                subcategories: {
                    include: { steps: { orderBy: { order: "asc" } } },
                },
                category: true,
            },
        });
        res.json(templates);
    }
    catch (error) {
        console.error("Error fetching templates:", error);
        res.status(500).json({ error: "Failed to fetch templates" });
    }
}));
// Get available endpoints for template creation
router.get("/templates/endpoints", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Ensure cache is fresh
        yield ensureEndpointsCache();
        // Return cached endpoints
        res.json(endpointsCache);
    }
    catch (error) {
        console.error("Error fetching endpoints:", error);
        res.status(500).json({ error: "Failed to fetch endpoints" });
    }
}));
// Update a template (admin only)
router.put("/templates/:id", (0, roles_1.requirePermission)("templates", "UPDATE"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description, subcategories } = req.body;
        if (!name || !subcategories || !Array.isArray(subcategories)) {
            res
                .status(400)
                .json({ error: "Name and subcategories array are required" });
            return;
        }
        // Get old template for route removal
        const oldTemplate = yield prisma_1.default.template.findUnique({
            where: { id: parseInt(id) },
        });
        // Get or create main category (in case name changed)
        let mainCategoryId = oldTemplate === null || oldTemplate === void 0 ? void 0 : oldTemplate.categoryId;
        if (!mainCategoryId) {
            // If not present, create or find by new name
            let mainCategory = yield prisma_1.default.category.findFirst({ where: { name } });
            if (!mainCategory) {
                mainCategory = yield prisma_1.default.category.create({ data: { name } });
            }
            mainCategoryId = mainCategory.id;
        }
        // Delete all subcategories and steps for this template
        const oldSubcats = yield prisma_1.default.subcategory.findMany({
            where: { templateId: parseInt(id) },
        });
        for (const subcat of oldSubcats) {
            yield prisma_1.default.templateStep.deleteMany({
                where: { subcategoryId: subcat.id },
            });
        }
        yield prisma_1.default.subcategory.deleteMany({
            where: { templateId: parseInt(id) },
        });
        // Update template and create new subcategories/steps
        const template = yield prisma_1.default.template.update({
            where: { id: parseInt(id) },
            data: {
                name,
                description,
                category: { connect: { id: mainCategoryId } },
                subcategories: {
                    create: yield Promise.all(subcategories.map((subcat) => __awaiter(void 0, void 0, void 0, function* () {
                        const steps = yield Promise.all((subcat.steps || []).map((step, idx) => __awaiter(void 0, void 0, void 0, function* () {
                            const feat = yield prisma_1.default.features.findUnique({
                                where: { endpoint: step.endpoint },
                            });
                            return {
                                endpoint: step.endpoint,
                                prompt: (feat === null || feat === void 0 ? void 0 : feat.prompt) || "",
                                order: idx,
                            };
                        })));
                        return {
                            name: subcat.name,
                            category: { connect: { id: mainCategoryId } },
                            steps: {
                                create: steps,
                            },
                        };
                    }))),
                },
            },
            include: {
                subcategories: {
                    include: { steps: { orderBy: { order: "asc" } } },
                },
                category: true,
            },
        });
        // Remove old endpoint if name changed
        if (oldTemplate && oldTemplate.name !== name) {
            unregisterTemplateEndpoint(oldTemplate);
        }
        // Register/replace endpoint for updated template
        yield registerTemplateEndpoint(template);
        res.json(template);
    }
    catch (error) {
        console.error("Error updating template:", error);
        res.status(500).json({ error: "Failed to update template" });
    }
}));
// Delete a template (admin only)
router.delete("/templates/:id", (0, roles_1.requirePermission)("templates", "DELETE"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Get template for route removal
        const template = yield prisma_1.default.template.findUnique({
            where: { id: parseInt(id) },
        });
        // Delete all step videos for this template (and from S3)
        const stepVideos = yield prisma_1.default.templateStepVideo.findMany({
            where: { templateId: parseInt(id) },
        });
        for (const vid of stepVideos) {
            // Extract S3 key and delete
            try {
                const key = (0, signedUrl_1.deriveKey)(vid.videoUrl);
                yield (0, s3_1.deleteObject)(key);
            }
            catch (e) {
                console.warn("[TEMPLATE DELETE] Failed to delete S3 object", e);
            }
        }
        yield prisma_1.default.templateStepVideo.deleteMany({
            where: { templateId: parseInt(id) },
        });
        // Delete all subcategories and steps for this template
        const oldSubcats = yield prisma_1.default.subcategory.findMany({
            where: { templateId: parseInt(id) },
        });
        for (const subcat of oldSubcats) {
            yield prisma_1.default.templateStep.deleteMany({
                where: { subcategoryId: subcat.id },
            });
        }
        yield prisma_1.default.subcategory.deleteMany({
            where: { templateId: parseInt(id) },
        });
        yield prisma_1.default.template.delete({ where: { id: parseInt(id) } });
        // Unregister dynamic endpoint for this template
        if (template)
            unregisterTemplateEndpoint(template);
        res.json({ message: "Template deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting template:", error);
        res.status(500).json({ error: "Failed to delete template" });
    }
}));
// On server start, register endpoints for all templates
function registerAllTemplateEndpoints() {
    return __awaiter(this, void 0, void 0, function* () {
        const allTemplates = yield prisma_1.default.template.findMany();
        for (const t of allTemplates) {
            yield registerTemplateEndpoint(t);
        }
    });
}
registerAllTemplateEndpoints();
// Execute a template
router.post("/templates/:id/execute", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { id } = req.params;
        const { image_url } = req.body;
        if (!image_url) {
            res.status(400).json({ error: "image_url is required" });
            return;
        }
        // Fetch template and steps
        const template = yield prisma_1.default.template.findUnique({
            where: { id: parseInt(id) },
            include: {
                subcategories: {
                    include: {
                        steps: { orderBy: { order: "asc" } },
                    },
                },
            },
        });
        if (!template) {
            res.status(404).json({ error: "Template not found" });
            return;
        }
        // Execute each step in order
        const results = [];
        let currentImageUrl = image_url;
        for (const subcategory of template.subcategories) {
            for (const step of subcategory.steps) {
                // Find the feature to get the default prompt
                const feature = yield prisma_1.default.features.findUnique({
                    where: { endpoint: step.endpoint },
                });
                const prompt = step.prompt || (feature === null || feature === void 0 ? void 0 : feature.prompt) || "";
                // Call the video generation API for this step using axios
                const response = yield axios_1.default.post(`${req.protocol}://${req.get("host")}/api/${step.endpoint}`, {
                    image_url: currentImageUrl,
                    prompt: prompt,
                }, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
                const result = response.data;
                // Augment result.video with signedUrl if we have key
                try {
                    if ((_a = result === null || result === void 0 ? void 0 : result.video) === null || _a === void 0 ? void 0 : _a.url) {
                        const key = (0, signedUrl_1.deriveKey)(result.video.url);
                        const signedUrl = yield (0, signedUrl_1.signKey)(key);
                        result.video.signedUrl = signedUrl;
                    }
                }
                catch (_e) { }
                results.push({ step: step.endpoint, result });
                // Use the generated video canonical URL for chaining
                currentImageUrl = result.video.url;
            }
        }
        res.json({
            template: template.name,
            results: results,
            final_video: (_b = results[results.length - 1]) === null || _b === void 0 ? void 0 : _b.result.video,
        });
    }
    catch (error) {
        console.error("Error executing template:", error);
        // Handle axios errors more gracefully
        if (axios_1.default.isAxiosError(error)) {
            res.status(((_c = error.response) === null || _c === void 0 ? void 0 : _c.status) || 500).json({
                error: "Failed to execute template",
                details: ((_d = error.response) === null || _d === void 0 ? void 0 : _d.data) || error.message,
            });
        }
        else {
            res.status(500).json({ error: "Failed to execute template" });
        }
    }
}));
// Upload and persist a template step video
// Upload and persist a template step video (admin only)
router.post("/templates/:templateId/step-video", function (req, res) {
    (() => __awaiter(this, void 0, void 0, function* () {
        try {
            const { templateId } = req.params;
            let { stepIndex, endpoint, videoUrl } = req.body;
            if (typeof stepIndex === "string")
                stepIndex = parseInt(stepIndex);
            if (typeof stepIndex !== "number" || isNaN(stepIndex)) {
                return res.status(400).json({ error: "stepIndex required" });
            }
            if (!endpoint || !videoUrl) {
                return res
                    .status(400)
                    .json({ error: "endpoint and videoUrl required" });
            }
            // If provided videoUrl is not already an S3 URL to our bucket, ingest & upload to S3
            let finalUrl = videoUrl;
            const bucketName = process.env.AWS_S3_BUCKET || "";
            const isS3Already = /https?:\/\/[^/]*s3[^/]*\.amazonaws\.com\//i.test(videoUrl) ||
                (process.env.AWS_S3_PUBLIC_URL_PREFIX &&
                    videoUrl.startsWith(process.env.AWS_S3_PUBLIC_URL_PREFIX));
            if (!isS3Already) {
                try {
                    const response = yield axios_1.default.get(videoUrl, {
                        responseType: "stream",
                    });
                    const key = `templates/${templateId}/steps/${stepIndex}-${Date.now()}.mp4`;
                    const uploadRes = yield (0, s3_1.uploadStream)(key, response.data, "video/mp4");
                    finalUrl = uploadRes.url;
                }
                catch (e) {
                    console.error("[STEP-VIDEO] Failed to ingest remote video", e);
                    return res.status(400).json({ error: "Failed to ingest videoUrl" });
                }
            }
            const saved = yield prisma_1.default.templateStepVideo.create({
                data: {
                    templateId: parseInt(templateId),
                    stepIndex,
                    endpoint,
                    videoUrl: finalUrl,
                },
            });
            // Attach signedUrl for convenience
            let signedUrl;
            try {
                const key = (0, signedUrl_1.deriveKey)(saved.videoUrl);
                signedUrl = yield (0, signedUrl_1.signKey)(key);
            }
            catch (_a) { }
            res.json(Object.assign(Object.assign({}, saved), { signedUrl }));
        }
        catch (e) {
            res.status(500).json({ error: "Failed to save step video" });
        }
    }))();
});
// Get all step videos for a template
router.get("/templates/:templateId/step-videos", function (req, res) {
    (() => __awaiter(this, void 0, void 0, function* () {
        try {
            const { templateId } = req.params;
            const vids = yield prisma_1.default.templateStepVideo.findMany({
                where: { templateId: parseInt(templateId) },
                orderBy: { stepIndex: "asc" },
            });
            const enriched = yield Promise.all(vids.map((v) => __awaiter(this, void 0, void 0, function* () {
                let signedUrl;
                try {
                    const key = (0, signedUrl_1.deriveKey)(v.videoUrl);
                    signedUrl = yield (0, signedUrl_1.signKey)(key);
                }
                catch (_a) { }
                return Object.assign(Object.assign({}, v), { signedUrl });
            })));
            res.json(enriched);
        }
        catch (e) {
            res.status(500).json({ error: "Failed to fetch step videos" });
        }
    }))();
});
// Delete a single step video (and from Cloudinary)
// Delete a single step video (admin only)
router.delete("/templates/:templateId/step-video/:stepIndex", function (req, res) {
    (() => __awaiter(this, void 0, void 0, function* () {
        try {
            const { templateId, stepIndex } = req.params;
            const vid = yield prisma_1.default.templateStepVideo.findFirst({
                where: {
                    templateId: parseInt(templateId),
                    stepIndex: parseInt(stepIndex),
                },
            });
            if (vid) {
                try {
                    const key = (0, signedUrl_1.deriveKey)(vid.videoUrl);
                    yield (0, s3_1.deleteObject)(key);
                }
                catch (e) {
                    console.warn("[STEP-VIDEO DELETE] Failed to delete S3 object", e);
                }
                yield prisma_1.default.templateStepVideo.delete({ where: { id: vid.id } });
            }
            res.json({ success: true });
        }
        catch (e) {
            res.status(500).json({ error: "Failed to delete step video" });
        }
    }))();
});
exports.default = router;
