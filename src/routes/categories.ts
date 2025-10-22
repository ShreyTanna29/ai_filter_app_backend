import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

// Get all categories with subcategories and templates
router.get("/", async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        subcategories: true,
        templates: true,
      },
      orderBy: { name: "asc" },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch categories", error });
  }
});

// Create a new category
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const category = await prisma.category.create({
      data: { name },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: "Failed to create category", error });
  }
});

// Update a category
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const category = await prisma.category.update({
      where: { id: Number(id) },
      data: { name },
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: "Failed to update category", error });
  }
});

// Delete a category (and all its subcategories)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Delete all subcategories for this category
    await prisma.subcategory.deleteMany({ where: { categoryId: Number(id) } });
    // Delete the category
    await prisma.category.delete({ where: { id: Number(id) } });
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete category", error });
  }
});

// Create a new subcategory for a category
router.post(
  "/:categoryId/subcategories",
  async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      const { name, templateId } = req.body;
      const subcategory = await prisma.subcategory.create({
        data: {
          name,
          category: { connect: { id: Number(categoryId) } },
          template: { connect: { id: Number(templateId) } },
        },
      });
      res.status(201).json(subcategory);
    } catch (error) {
      res.status(500).json({ message: "Failed to create subcategory", error });
    }
  }
);

export default router;
