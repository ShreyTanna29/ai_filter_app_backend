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
const roles_1 = require("../middleware/roles");
const router = (0, express_1.Router)();
// Get all photo templates
router.get("/photo-templates", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const photoTemplates = yield prisma_1.default.photo_Template.findMany({
            include: {
                subcategories: {
                    include: { steps: { orderBy: { order: "asc" } } },
                },
                category: true,
            },
        });
        res.json(photoTemplates);
    }
    catch (error) {
        console.error("Error fetching photo templates:", error);
        res.status(500).json({ error: "Failed to fetch photo templates" });
    }
}));
// Create a new photo template
router.post("/photo-templates", (0, roles_1.requirePermission)("photo_templates", "CREATE"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, subcategories } = req.body;
        if (!name || !subcategories || !Array.isArray(subcategories)) {
            res
                .status(400)
                .json({ error: "Name and subcategories array are required" });
            return;
        }
        // Get or create main category
        let mainCategory = yield prisma_1.default.photo_Category.findFirst({
            where: { name },
        });
        if (!mainCategory) {
            mainCategory = yield prisma_1.default.photo_Category.create({ data: { name } });
        }
        // Create the photo template
        const photoTemplate = yield prisma_1.default.photo_Template.create({
            data: {
                name,
                description,
                category: { connect: { id: mainCategory.id } },
                subcategories: {
                    create: yield Promise.all(subcategories.map((subcat) => __awaiter(void 0, void 0, void 0, function* () {
                        const steps = yield Promise.all((subcat.steps || []).map((step, idx) => __awaiter(void 0, void 0, void 0, function* () {
                            const photoFeature = yield prisma_1.default.photo_Features.findUnique({
                                where: { endpoint: step.endpoint },
                            });
                            return {
                                endpoint: step.endpoint,
                                prompt: (photoFeature === null || photoFeature === void 0 ? void 0 : photoFeature.prompt) || "",
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
        res.status(201).json(photoTemplate);
    }
    catch (error) {
        console.error("Error creating photo template:", error);
        res.status(500).json({ error: "Failed to create photo template" });
    }
}));
// Update a photo template
router.put("/photo-templates/:id", (0, roles_1.requirePermission)("photo_templates", "UPDATE"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description, subcategories } = req.body;
        if (!name || !subcategories || !Array.isArray(subcategories)) {
            res
                .status(400)
                .json({ error: "Name and subcategories array are required" });
            return;
        }
        const oldTemplate = yield prisma_1.default.photo_Template.findUnique({
            where: { id: parseInt(id) },
        });
        let mainCategoryId = oldTemplate === null || oldTemplate === void 0 ? void 0 : oldTemplate.categoryId;
        if (!mainCategoryId) {
            let mainCategory = yield prisma_1.default.photo_Category.findFirst({
                where: { name },
            });
            if (!mainCategory) {
                mainCategory = yield prisma_1.default.photo_Category.create({ data: { name } });
            }
            mainCategoryId = mainCategory.id;
        }
        // Delete old subcategories and steps
        const oldSubcats = yield prisma_1.default.photo_Template_Subcategory.findMany({
            where: { templateId: parseInt(id) },
        });
        for (const subcat of oldSubcats) {
            yield prisma_1.default.photo_Template_Step.deleteMany({
                where: { subcategoryId: subcat.id },
            });
        }
        yield prisma_1.default.photo_Template_Subcategory.deleteMany({
            where: { templateId: parseInt(id) },
        });
        // Update template with new data
        const photoTemplate = yield prisma_1.default.photo_Template.update({
            where: { id: parseInt(id) },
            data: {
                name,
                description,
                category: { connect: { id: mainCategoryId } },
                subcategories: {
                    create: yield Promise.all(subcategories.map((subcat) => __awaiter(void 0, void 0, void 0, function* () {
                        const steps = yield Promise.all((subcat.steps || []).map((step, idx) => __awaiter(void 0, void 0, void 0, function* () {
                            const photoFeature = yield prisma_1.default.photo_Features.findUnique({
                                where: { endpoint: step.endpoint },
                            });
                            return {
                                endpoint: step.endpoint,
                                prompt: (photoFeature === null || photoFeature === void 0 ? void 0 : photoFeature.prompt) || "",
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
        res.json(photoTemplate);
    }
    catch (error) {
        console.error("Error updating photo template:", error);
        res.status(500).json({ error: "Failed to update photo template" });
    }
}));
// Delete a photo template
router.delete("/photo-templates/:id", (0, roles_1.requirePermission)("photo_templates", "DELETE"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Delete all step photos for this template
        yield prisma_1.default.photo_Template_Step_Photo.deleteMany({
            where: { templateId: parseInt(id) },
        });
        // Delete all subcategories and steps
        const oldSubcats = yield prisma_1.default.photo_Template_Subcategory.findMany({
            where: { templateId: parseInt(id) },
        });
        for (const subcat of oldSubcats) {
            yield prisma_1.default.photo_Template_Step.deleteMany({
                where: { subcategoryId: subcat.id },
            });
        }
        yield prisma_1.default.photo_Template_Subcategory.deleteMany({
            where: { templateId: parseInt(id) },
        });
        // Delete the template
        yield prisma_1.default.photo_Template.delete({ where: { id: parseInt(id) } });
        res.json({ message: "Photo template deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting photo template:", error);
        res.status(500).json({ error: "Failed to delete photo template" });
    }
}));
exports.default = router;
