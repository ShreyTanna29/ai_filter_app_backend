import { Router, Request, Response } from "express";
import { PrismaClient } from "../generated/prisma";
import { features } from "../filters/features";
import axios from "axios";

const router = Router();
const prisma = new PrismaClient();

// Get all templates
router.get("/templates", async (req: Request, res: Response): Promise<void> => {
  try {
    const templates = await prisma.template.findMany({
      include: {
        steps: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });
    res.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// Get available endpoints for template creation
router.get(
  "/templates/endpoints",
  async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(features);
    } catch (error) {
      console.error("Error fetching endpoints:", error);
      res.status(500).json({ error: "Failed to fetch endpoints" });
    }
  }
);

// Create a new template
router.post(
  "/templates",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description, steps } = req.body;

      if (!name || !steps || !Array.isArray(steps)) {
        res.status(400).json({ error: "Name and steps array are required" });
        return;
      }

      const template = await prisma.template.create({
        data: {
          name,
          description,
          steps: {
            create: steps.map((step: any, index: number) => ({
              endpoint: step.endpoint,
              prompt: step.prompt,
              order: index,
            })),
          },
        },
        include: {
          steps: {
            orderBy: {
              order: "asc",
            },
          },
        },
      });

      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  }
);

// Update a template
router.put(
  "/templates/:id",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, description, steps } = req.body;

      if (!name || !steps || !Array.isArray(steps)) {
        res.status(400).json({ error: "Name and steps array are required" });
        return;
      }

      // Delete existing steps
      await prisma.templateStep.deleteMany({
        where: { templateId: parseInt(id) },
      });

      // Update template and create new steps
      const template = await prisma.template.update({
        where: { id: parseInt(id) },
        data: {
          name,
          description,
          steps: {
            create: steps.map((step: any, index: number) => ({
              endpoint: step.endpoint,
              prompt: step.prompt,
              order: index,
            })),
          },
        },
        include: {
          steps: {
            orderBy: {
              order: "asc",
            },
          },
        },
      });

      res.json(template);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  }
);

// Delete a template
router.delete(
  "/templates/:id",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      await prisma.template.delete({
        where: { id: parseInt(id) },
      });

      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  }
);

// Execute a template
router.post(
  "/templates/:id/execute",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { image_url } = req.body;

      if (!image_url) {
        res.status(400).json({ error: "image_url is required" });
        return;
      }

      const template = await prisma.template.findUnique({
        where: { id: parseInt(id) },
        include: {
          steps: {
            orderBy: {
              order: "asc",
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

      for (const step of template.steps) {
        // Find the feature to get the default prompt
        const feature = features.find((f) => f.endpoint === step.endpoint);
        const prompt = step.prompt || feature?.prompt || "";

        // Call the video generation API for this step using axios
        const response = await axios.post(
          `${req.protocol}://${req.get("host")}/api/${step.endpoint}`,
          {
            image_url: currentImageUrl,
            prompt: prompt,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const result = response.data;
        results.push({
          step: step.endpoint,
          result: result,
        });

        // Use the generated video URL as input for the next step
        currentImageUrl = result.video.url;
      }

      res.json({
        template: template.name,
        results: results,
        final_video: results[results.length - 1]?.result.video,
      });
    } catch (error) {
      console.error("Error executing template:", error);

      // Handle axios errors more gracefully
      if (axios.isAxiosError(error)) {
        res.status(error.response?.status || 500).json({
          error: "Failed to execute template",
          details: error.response?.data || error.message,
        });
      } else {
        res.status(500).json({ error: "Failed to execute template" });
      }
    }
  }
);

export default router;
