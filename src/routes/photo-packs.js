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
const signedUrl_1 = require("../middleware/signedUrl");
const s3_1 = require("../lib/s3");
const router = (0, express_1.Router)();
// Get all photo packs
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const packs = yield prisma_1.default.photo_Pack.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                prompts: {
                    orderBy: { order: "asc" },
                },
                images: {
                    orderBy: { createdAt: "desc" },
                    take: 6, // Only get first 6 images for preview
                },
                _count: {
                    select: { images: true },
                },
            },
        });
        // Sign image URLs for access
        const packsWithSignedUrls = yield Promise.all(packs.map((pack) => __awaiter(void 0, void 0, void 0, function* () {
            const signedImages = yield Promise.all(pack.images.map((img) => __awaiter(void 0, void 0, void 0, function* () {
                let signedUrl = img.url;
                try {
                    if (img.url && /amazonaws\.com\//.test(img.url)) {
                        signedUrl = yield (0, signedUrl_1.signKey)((0, signedUrl_1.deriveKey)(img.url));
                    }
                }
                catch (_a) { }
                return Object.assign(Object.assign({}, img), { signedUrl });
            })));
            return Object.assign(Object.assign({}, pack), { images: signedImages, imageCount: pack._count.images });
        })));
        res.json({
            success: true,
            packs: packsWithSignedUrls,
        });
    }
    catch (error) {
        console.error("Error fetching photo packs:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch photo packs",
        });
    }
}));
// Get a single photo pack with all images
router.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid pack ID",
            });
            return;
        }
        const pack = yield prisma_1.default.photo_Pack.findUnique({
            where: { id },
            include: {
                prompts: {
                    orderBy: { order: "asc" },
                },
                images: {
                    orderBy: { createdAt: "desc" },
                },
            },
        });
        if (!pack) {
            res.status(404).json({
                success: false,
                message: "Photo pack not found",
            });
            return;
        }
        // Sign image URLs for access
        const signedImages = yield Promise.all(pack.images.map((img) => __awaiter(void 0, void 0, void 0, function* () {
            let signedUrl = img.url;
            try {
                if (img.url && /amazonaws\.com\//.test(img.url)) {
                    signedUrl = yield (0, signedUrl_1.signKey)((0, signedUrl_1.deriveKey)(img.url));
                }
            }
            catch (_a) { }
            return Object.assign(Object.assign({}, img), { signedUrl });
        })));
        res.json({
            success: true,
            pack: Object.assign(Object.assign({}, pack), { images: signedImages }),
        });
    }
    catch (error) {
        console.error("Error fetching photo pack:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch photo pack",
        });
    }
}));
// Create a new photo pack
router.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, emoji, photoCount, prompts } = req.body;
        if (!name) {
            res.status(400).json({
                success: false,
                message: "Name is required",
            });
            return;
        }
        if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
            res.status(400).json({
                success: false,
                message: "At least one prompt is required",
            });
            return;
        }
        const pack = yield prisma_1.default.photo_Pack.create({
            data: {
                name,
                description: description || null,
                emoji: emoji || "📸",
                photoCount: photoCount || 15,
                isActive: true,
                prompts: {
                    create: prompts.map((prompt, index) => ({
                        prompt,
                        order: index,
                    })),
                },
            },
            include: {
                prompts: {
                    orderBy: { order: "asc" },
                },
            },
        });
        res.status(201).json({
            success: true,
            pack,
        });
    }
    catch (error) {
        console.error("Error creating photo pack:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create photo pack",
        });
    }
}));
// Update a photo pack
router.put("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid pack ID",
            });
            return;
        }
        const { name, description, emoji, photoCount, isActive, prompts } = req.body;
        // Update the pack and optionally replace prompts
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (description !== undefined)
            updateData.description = description;
        if (emoji !== undefined)
            updateData.emoji = emoji;
        if (photoCount !== undefined)
            updateData.photoCount = photoCount;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        // If prompts are provided, replace all existing prompts
        if (prompts && Array.isArray(prompts)) {
            // Delete existing prompts
            yield prisma_1.default.photo_Pack_Prompt.deleteMany({
                where: { packId: id },
            });
            // Create new prompts
            yield prisma_1.default.photo_Pack_Prompt.createMany({
                data: prompts.map((prompt, index) => ({
                    packId: id,
                    prompt,
                    order: index,
                })),
            });
        }
        const pack = yield prisma_1.default.photo_Pack.update({
            where: { id },
            data: updateData,
            include: {
                prompts: {
                    orderBy: { order: "asc" },
                },
                images: {
                    orderBy: { createdAt: "desc" },
                    take: 6,
                },
            },
        });
        res.json({
            success: true,
            pack,
        });
    }
    catch (error) {
        console.error("Error updating photo pack:", error);
        if (error.code === "P2025") {
            res.status(404).json({
                success: false,
                message: "Photo pack not found",
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Failed to update photo pack",
        });
    }
}));
// Delete a photo pack
router.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid pack ID",
            });
            return;
        }
        yield prisma_1.default.photo_Pack.delete({
            where: { id },
        });
        res.json({
            success: true,
            message: "Photo pack deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting photo pack:", error);
        if (error.code === "P2025") {
            res.status(404).json({
                success: false,
                message: "Photo pack not found",
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Failed to delete photo pack",
        });
    }
}));
// Add generated images to a photo pack
router.post("/:id/images", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid pack ID",
            });
            return;
        }
        const { urls } = req.body;
        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            res.status(400).json({
                success: false,
                message: "Image URLs array is required",
            });
            return;
        }
        // Verify pack exists
        const pack = yield prisma_1.default.photo_Pack.findUnique({
            where: { id },
        });
        if (!pack) {
            res.status(404).json({
                success: false,
                message: "Photo pack not found",
            });
            return;
        }
        // Download images and upload to S3
        const s3Urls = [];
        for (const url of urls) {
            try {
                // Download the image
                const response = yield fetch(url);
                if (!response.ok) {
                    console.error(`Failed to download image: ${url}`);
                    continue;
                }
                const buffer = Buffer.from(yield response.arrayBuffer());
                const contentType = response.headers.get("content-type") || "image/png";
                // Generate S3 key
                const key = (0, s3_1.makeKey)({
                    type: "image",
                    feature: `photo-pack-${id}`,
                });
                // Upload to S3
                const result = yield (0, s3_1.uploadBuffer)(key, buffer, contentType);
                s3Urls.push(result.url);
            }
            catch (err) {
                console.error("Error uploading image to S3:", err);
            }
        }
        if (s3Urls.length === 0) {
            res.status(500).json({
                success: false,
                message: "Failed to upload any images to storage",
            });
            return;
        }
        // Create image records with S3 URLs
        const images = yield prisma_1.default.photo_Pack_Image.createMany({
            data: s3Urls.map((url) => ({
                packId: id,
                url,
            })),
        });
        res.status(201).json({
            success: true,
            message: `Added ${images.count} images to pack`,
            count: images.count,
        });
    }
    catch (error) {
        console.error("Error adding images to pack:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add images to pack",
        });
    }
}));
// Delete an image from a photo pack
router.delete("/:id/images/:imageId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const packId = parseInt(req.params.id);
        const imageId = parseInt(req.params.imageId);
        if (isNaN(packId) || isNaN(imageId)) {
            res.status(400).json({
                success: false,
                message: "Invalid pack or image ID",
            });
            return;
        }
        yield prisma_1.default.photo_Pack_Image.delete({
            where: {
                id: imageId,
                packId: packId,
            },
        });
        res.json({
            success: true,
            message: "Image deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting image:", error);
        if (error.code === "P2025") {
            res.status(404).json({
                success: false,
                message: "Image not found",
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Failed to delete image",
        });
    }
}));
exports.default = router;
