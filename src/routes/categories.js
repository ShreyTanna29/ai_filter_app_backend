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
// Get all categories with subcategories and templates
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield prisma_1.default.category.findMany({
            include: {
                subcategories: true,
                templates: true,
            },
            orderBy: { name: "asc" },
        });
        res.json(categories);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch categories", error });
    }
}));
// Create a new category
router.post("/", (0, roles_1.requirePermission)("categories", "CREATE"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        const category = yield prisma_1.default.category.create({
            data: { name },
        });
        res.status(201).json(category);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to create category", error });
    }
}));
// Update a category
router.put("/:id", (0, roles_1.requirePermission)("categories", "UPDATE"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const category = yield prisma_1.default.category.update({
            where: { id: Number(id) },
            data: { name },
        });
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update category", error });
    }
}));
// Delete a category (and all its subcategories)
router.delete("/:id", (0, roles_1.requirePermission)("categories", "DELETE"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Delete all subcategories for this category
        yield prisma_1.default.subcategory.deleteMany({
            where: { categoryId: Number(id) },
        });
        // Delete the category
        yield prisma_1.default.category.delete({ where: { id: Number(id) } });
        res.json({ message: "Category deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete category", error });
    }
}));
// Create a new subcategory for a category
router.post("/:categoryId/subcategories", (0, roles_1.requirePermission)("categories", "CREATE"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { categoryId } = req.params;
        const { name, templateId } = req.body;
        const subcategory = yield prisma_1.default.subcategory.create({
            data: {
                name,
                category: { connect: { id: Number(categoryId) } },
                template: { connect: { id: Number(templateId) } },
            },
        });
        res.status(201).json(subcategory);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to create subcategory", error });
    }
}));
exports.default = router;
