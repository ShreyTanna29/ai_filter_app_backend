import { Router, Request, Response } from "express";
import { PrismaClient } from "../generated/prisma";
import { features } from "../filters/features";
import axios from "axios";

// Cloudinary config (assume env vars set)

const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = Router();

// In-memory map to track registered template routes
const templateRouteMap: Record<string, any> = {};

// Helper to register a dynamic endpoint for a template
async function registerTemplateEndpoint(template: any) {
  const endpoint = `/template-endpoint/${encodeURIComponent(template.name)}`;
  // Remove existing route if present
  if (templateRouteMap[endpoint]) {
    router.stack = router.stack.filter(
      (layer: any) => !(layer.route && layer.route.path === endpoint)
    );
    delete templateRouteMap[endpoint];
  }
  // Register new route
  const handler = async (req: Request, res: Response) => {
    try {
      // Always fetch latest template data
      const dbTemplate = await prisma.template.findUnique({
        where: { id: template.id },
        include: {
          steps: { orderBy: { order: "asc" } },
        },
      });
      if (!dbTemplate)
        return res.status(404).json({ error: "Template not found" });
      const stepVideos = await prisma.templateStepVideo.findMany({
        where: { templateId: template.id },
        orderBy: { stepIndex: "asc" },
      });
      res.json({
        id: dbTemplate.id,
        name: dbTemplate.name,
        description: dbTemplate.description,
        steps: dbTemplate.steps,
        stepVideos,
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch template data" });
    }
  };
  router.get(endpoint, handler as any);
  templateRouteMap[endpoint] = handler;
}

// Helper to unregister a template endpoint
function unregisterTemplateEndpoint(template: any) {
  const endpoint = `/template-endpoint/${encodeURIComponent(template.name)}`;
  if (templateRouteMap[endpoint]) {
    router.stack = router.stack.filter(
      (layer: any) => !(layer.route && layer.route.path === endpoint)
    );
    delete templateRouteMap[endpoint];
  }
}
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

      // Register dynamic endpoint for this template
      await registerTemplateEndpoint(template);

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

      // Get old template for route removal
      const oldTemplate = await prisma.template.findUnique({
        where: { id: parseInt(id) },
      });

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

      // Remove old endpoint if name changed
      if (oldTemplate && oldTemplate.name !== name) {
        unregisterTemplateEndpoint(oldTemplate);
      }
      // Register/replace endpoint for updated template
      await registerTemplateEndpoint(template);

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

      // Get template for route removal
      const template = await prisma.template.findUnique({
        where: { id: parseInt(id) },
      });

      // Delete all step videos for this template (and from Cloudinary)
      const stepVideos = await prisma.templateStepVideo.findMany({
        where: { templateId: parseInt(id) },
      });
      for (const vid of stepVideos) {
        // Extract public_id from videoUrl
        const match = vid.videoUrl.match(/\/upload\/v\d+\/([^\.]+)\.mp4/);
        if (match) {
          try {
            await cloudinary.v2.uploader.destroy(
              `generated-videos/${match[1]}`,
              { resource_type: "video" }
            );
          } catch {}
        }
      }
      await prisma.templateStepVideo.deleteMany({
        where: { templateId: parseInt(id) },
      });

      await prisma.template.delete({
        where: { id: parseInt(id) },
      });

      // Unregister dynamic endpoint for this template
      if (template) unregisterTemplateEndpoint(template);

      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  }
);
// On server start, register endpoints for all templates
async function registerAllTemplateEndpoints() {
  const allTemplates = await prisma.template.findMany();
  for (const t of allTemplates) {
    await registerTemplateEndpoint(t);
  }
}
registerAllTemplateEndpoints();

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

      // Fetch template and steps
      const template = await prisma.template.findUnique({
        where: { id: parseInt(id) },
        include: {
          steps: { orderBy: { order: "asc" } },
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

// Upload and persist a template step video

router.post("/templates/:templateId/step-video", function (req, res) {
  (async () => {
    try {
      const { templateId } = req.params;
      let { stepIndex, endpoint, videoUrl } = req.body;
      if (typeof stepIndex === "string") stepIndex = parseInt(stepIndex);
      if (typeof stepIndex !== "number" || isNaN(stepIndex)) {
        return res.status(400).json({ error: "stepIndex required" });
      }
      if (!endpoint || !videoUrl) {
        return res
          .status(400)
          .json({ error: "endpoint and videoUrl required" });
      }
      // Save to DB
      const saved = await prisma.templateStepVideo.create({
        data: {
          templateId: parseInt(templateId),
          stepIndex,
          endpoint,
          videoUrl,
        },
      });
      res.json(saved);
    } catch (e) {
      res.status(500).json({ error: "Failed to save step video" });
    }
  })();
});

// Get all step videos for a template

router.get("/templates/:templateId/step-videos", function (req, res) {
  (async () => {
    try {
      const { templateId } = req.params;
      const vids = await prisma.templateStepVideo.findMany({
        where: { templateId: parseInt(templateId) },
        orderBy: { stepIndex: "asc" },
      });
      res.json(vids);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch step videos" });
    }
  })();
});

// Delete a single step video (and from Cloudinary)

router.delete(
  "/templates/:templateId/step-video/:stepIndex",
  function (req, res) {
    (async () => {
      try {
        const { templateId, stepIndex } = req.params;
        const vid = await prisma.templateStepVideo.findFirst({
          where: {
            templateId: parseInt(templateId),
            stepIndex: parseInt(stepIndex),
          },
        });
        if (vid) {
          const match = vid.videoUrl.match(/\/upload\/v\d+\/([^\.]+)\.mp4/);
          if (match) {
            try {
              await cloudinary.uploader.destroy(
                `generated-videos/${match[1]}`,
                { resource_type: "video" }
              );
            } catch {}
          }
          await prisma.templateStepVideo.delete({ where: { id: vid.id } });
        }
        res.json({ success: true });
      } catch (e) {
        res.status(500).json({ error: "Failed to delete step video" });
      }
    })();
  }
);

export default router;
