import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

// Get all photo templates
router.get("/photo-templates", async (req: Request, res: Response): Promise<void> => {
  try {
    const photoTemplates = await prisma.photo_Template.findMany({
      include: {
        subcategories: {
          include: { steps: { orderBy: { order: "asc" } } },
        },
        category: true,
      },
    });
    res.json(photoTemplates);
  } catch (error) {
    console.error("Error fetching photo templates:", error);
    res.status(500).json({ error: "Failed to fetch photo templates" });
  }
});

// Create a new photo template
router.post("/photo-templates", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, subcategories } = req.body;
    if (!name || !subcategories || !Array.isArray(subcategories)) {
      res.status(400).json({ error: "Name and subcategories array are required" });
      return;
    }

    // Get or create main category
    let mainCategory = await prisma.photo_Category.findFirst({ where: { name } });
    if (!mainCategory) {
      mainCategory = await prisma.photo_Category.create({ data: { name } });
    }

    // Create the photo template
    const photoTemplate = await prisma.photo_Template.create({
      data: {
        name,
        description,
        category: { connect: { id: mainCategory.id } },
        subcategories: {
          create: await Promise.all(
            subcategories.map(async (subcat: any) => {
              const steps = await Promise.all(
                (subcat.steps || []).map(async (step: any, idx: number) => {
                  const photoFeature = await prisma.photo_Features.findUnique({
                    where: { endpoint: step.endpoint },
                  });
                  return {
                    endpoint: step.endpoint,
                    prompt: photoFeature?.prompt || "",
                    order: idx,
                  };
                })
              );
              return {
                name: subcat.name,
                category: { connect: { id: mainCategory.id } },
                steps: {
                  create: steps,
                },
              };
            })
          ),
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
  } catch (error) {
    console.error("Error creating photo template:", error);
    res.status(500).json({ error: "Failed to create photo template" });
  }
});

// Update a photo template
router.put("/photo-templates/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, subcategories } = req.body;
    
    if (!name || !subcategories || !Array.isArray(subcategories)) {
      res.status(400).json({ error: "Name and subcategories array are required" });
      return;
    }

    const oldTemplate = await prisma.photo_Template.findUnique({
      where: { id: parseInt(id) },
    });

    let mainCategoryId = oldTemplate?.categoryId;
    if (!mainCategoryId) {
      let mainCategory = await prisma.photo_Category.findFirst({ where: { name } });
      if (!mainCategory) {
        mainCategory = await prisma.photo_Category.create({ data: { name } });
      }
      mainCategoryId = mainCategory.id;
    }

    // Delete old subcategories and steps
    const oldSubcats = await prisma.photo_Template_Subcategory.findMany({
      where: { templateId: parseInt(id) },
    });
    for (const subcat of oldSubcats) {
      await prisma.photo_Template_Step.deleteMany({
        where: { subcategoryId: subcat.id },
      });
    }
    await prisma.photo_Template_Subcategory.deleteMany({
      where: { templateId: parseInt(id) },
    });

    // Update template with new data
    const photoTemplate = await prisma.photo_Template.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        category: { connect: { id: mainCategoryId } },
        subcategories: {
          create: await Promise.all(
            subcategories.map(async (subcat: any) => {
              const steps = await Promise.all(
                (subcat.steps || []).map(async (step: any, idx: number) => {
                  const photoFeature = await prisma.photo_Features.findUnique({
                    where: { endpoint: step.endpoint },
                  });
                  return {
                    endpoint: step.endpoint,
                    prompt: photoFeature?.prompt || "",
                    order: idx,
                  };
                })
              );
              return {
                name: subcat.name,
                category: { connect: { id: mainCategoryId } },
                steps: {
                  create: steps,
                },
              };
            })
          ),
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
  } catch (error) {
    console.error("Error updating photo template:", error);
    res.status(500).json({ error: "Failed to update photo template" });
  }
});

// Delete a photo template
router.delete("/photo-templates/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Delete all step photos for this template
    await prisma.photo_Template_Step_Photo.deleteMany({
      where: { templateId: parseInt(id) },
    });

    // Delete all subcategories and steps
    const oldSubcats = await prisma.photo_Template_Subcategory.findMany({
      where: { templateId: parseInt(id) },
    });
    for (const subcat of oldSubcats) {
      await prisma.photo_Template_Step.deleteMany({
        where: { subcategoryId: subcat.id },
      });
    }
    await prisma.photo_Template_Subcategory.deleteMany({
      where: { templateId: parseInt(id) },
    });

    // Delete the template
    await prisma.photo_Template.delete({ where: { id: parseInt(id) } });

    res.json({ message: "Photo template deleted successfully" });
  } catch (error) {
    console.error("Error deleting photo template:", error);
    res.status(500).json({ error: "Failed to delete photo template" });
  }
});

export default router;
