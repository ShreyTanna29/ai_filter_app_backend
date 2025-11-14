import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import axios from "axios";
import { requireAdmin } from "../middleware/roles";
import { uploadStream, publicUrlFor, makeKey, deleteObject } from "../lib/s3";
import { deriveKey, signKey } from "../middleware/signedUrl";
import { Readable } from "stream";
import { GetObjectCommand } from "@aws-sdk/client-s3";

// This route previously used Cloudinary. All video assets now stored in private S3.
// We keep DB column `videoUrl` but store canonical S3 public-style URL (not presigned).
// Responses enrich with `signedUrl` so clients can access private objects.

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
          subcategories: {
            include: {
              steps: { orderBy: { order: "asc" } },
            },
          },
        },
      });
      if (!dbTemplate)
        return res.status(404).json({ error: "Template not found" });
      const stepVideos = await prisma.templateStepVideo.findMany({
        where: { templateId: template.id },
        orderBy: { stepIndex: "asc" },
      });
      // Enrich each video with a signed URL when possible
      const enriched = await Promise.all(
        stepVideos.map(async (v) => {
          let signedUrl: string | undefined;
          try {
            const key = deriveKey(v.videoUrl);
            signedUrl = await signKey(key);
          } catch {}
          return { ...v, signedUrl };
        })
      );
      res.json({
        id: dbTemplate.id,
        name: dbTemplate.name,
        description: dbTemplate.description,
        subcategories: dbTemplate.subcategories,
        stepVideos: enriched,
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

// Helper to get or create a main category for a template
async function getOrCreateMainCategory(name: string) {
  let category = await prisma.category.findFirst({ where: { name } });
  if (!category) {
    category = await prisma.category.create({ data: { name } });
  }
  return category;
}

// Create a new template (admin only)
router.post(
  "/templates",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description, subcategories } = req.body;
      if (!name || !subcategories || !Array.isArray(subcategories)) {
        res
          .status(400)
          .json({ error: "Name and subcategories array are required" });
        return;
      }
      // Get or create main category
      const mainCategory = await getOrCreateMainCategory(name);
      // Create the template
      const template = await prisma.template.create({
        data: {
          name,
          description,
          category: { connect: { id: mainCategory.id } },
          subcategories: {
            create: await Promise.all(
              subcategories.map(async (subcat: any) => {
                const steps = await Promise.all(
                  (subcat.steps || []).map(async (step: any, idx: number) => {
                    const feat = await prisma.features.findUnique({
                      where: { endpoint: step.endpoint },
                    });
                    return {
                      endpoint: step.endpoint,
                      prompt: feat?.prompt || "",
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
      // Register dynamic endpoint for this template
      await registerTemplateEndpoint(template);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  }
);

// Get all templates (with subcategories and steps)
router.get("/templates", async (req: Request, res: Response): Promise<void> => {
  try {
    const templates = await prisma.template.findMany({
      include: {
        subcategories: {
          include: { steps: { orderBy: { order: "asc" } } },
        },
        category: true,
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
      const allFeatures = await prisma.features.findMany({
        orderBy: { endpoint: "asc" },
      });
      res.json(allFeatures);
    } catch (error) {
      console.error("Error fetching endpoints:", error);
      res.status(500).json({ error: "Failed to fetch endpoints" });
    }
  }
);

// Update a template (admin only)
router.put(
  "/templates/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
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
      const oldTemplate = await prisma.template.findUnique({
        where: { id: parseInt(id) },
      });
      // Get or create main category (in case name changed)
      let mainCategoryId = oldTemplate?.categoryId;
      if (!mainCategoryId) {
        // If not present, create or find by new name
        let mainCategory = await prisma.category.findFirst({ where: { name } });
        if (!mainCategory) {
          mainCategory = await prisma.category.create({ data: { name } });
        }
        mainCategoryId = mainCategory.id;
      }
      // Delete all subcategories and steps for this template
      const oldSubcats = await prisma.subcategory.findMany({
        where: { templateId: parseInt(id) },
      });
      for (const subcat of oldSubcats) {
        await prisma.templateStep.deleteMany({
          where: { subcategoryId: subcat.id },
        });
      }
      await prisma.subcategory.deleteMany({
        where: { templateId: parseInt(id) },
      });
      // Update template and create new subcategories/steps
      const template = await prisma.template.update({
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
                    const feat = await prisma.features.findUnique({
                      where: { endpoint: step.endpoint },
                    });
                    return {
                      endpoint: step.endpoint,
                      prompt: feat?.prompt || "",
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

// Delete a template (admin only)
router.delete(
  "/templates/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      // Get template for route removal
      const template = await prisma.template.findUnique({
        where: { id: parseInt(id) },
      });
      // Delete all step videos for this template (and from S3)
      const stepVideos = await prisma.templateStepVideo.findMany({
        where: { templateId: parseInt(id) },
      });
      for (const vid of stepVideos) {
        // Extract S3 key and delete
        try {
          const key = deriveKey(vid.videoUrl);
          await deleteObject(key);
        } catch (e) {
          console.warn("[TEMPLATE DELETE] Failed to delete S3 object", e);
        }
      }
      await prisma.templateStepVideo.deleteMany({
        where: { templateId: parseInt(id) },
      });
      // Delete all subcategories and steps for this template
      const oldSubcats = await prisma.subcategory.findMany({
        where: { templateId: parseInt(id) },
      });
      for (const subcat of oldSubcats) {
        await prisma.templateStep.deleteMany({
          where: { subcategoryId: subcat.id },
        });
      }
      await prisma.subcategory.deleteMany({
        where: { templateId: parseInt(id) },
      });
      await prisma.template.delete({ where: { id: parseInt(id) } });
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
          const feature = await prisma.features.findUnique({
            where: { endpoint: step.endpoint },
          });
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
          // Augment result.video with signedUrl if we have key
          try {
            if (result?.video?.url) {
              const key = deriveKey(result.video.url);
              const signedUrl = await signKey(key);
              result.video.signedUrl = signedUrl;
            }
          } catch {}
          results.push({ step: step.endpoint, result });
          // Use the generated video canonical URL for chaining
          currentImageUrl = result.video.url;
        }
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

// Upload and persist a template step video (admin only)
router.post(
  "/templates/:templateId/step-video",
  requireAdmin,
  function (req, res) {
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
        // If provided videoUrl is not already an S3 URL to our bucket, ingest & upload to S3
        let finalUrl = videoUrl;
        const bucketName = process.env.AWS_S3_BUCKET || "";
        const isS3Already =
          /https?:\/\/[^/]*s3[^/]*\.amazonaws\.com\//i.test(videoUrl) ||
          (process.env.AWS_S3_PUBLIC_URL_PREFIX &&
            videoUrl.startsWith(process.env.AWS_S3_PUBLIC_URL_PREFIX));
        if (!isS3Already) {
          try {
            const response = await axios.get(videoUrl, {
              responseType: "stream",
            });
            const key = `templates/${templateId}/steps/${stepIndex}-${Date.now()}.mp4`;
            const uploadRes = await uploadStream(
              key,
              response.data as Readable,
              "video/mp4"
            );
            finalUrl = uploadRes.url;
          } catch (e) {
            console.error("[STEP-VIDEO] Failed to ingest remote video", e);
            return res.status(400).json({ error: "Failed to ingest videoUrl" });
          }
        }
        const saved = await prisma.templateStepVideo.create({
          data: {
            templateId: parseInt(templateId),
            stepIndex,
            endpoint,
            videoUrl: finalUrl,
          },
        });
        // Attach signedUrl for convenience
        let signedUrl: string | undefined;
        try {
          const key = deriveKey(saved.videoUrl);
          signedUrl = await signKey(key);
        } catch {}
        res.json({ ...saved, signedUrl });
      } catch (e) {
        res.status(500).json({ error: "Failed to save step video" });
      }
    })();
  }
);

// Get all step videos for a template

router.get("/templates/:templateId/step-videos", function (req, res) {
  (async () => {
    try {
      const { templateId } = req.params;
      const vids = await prisma.templateStepVideo.findMany({
        where: { templateId: parseInt(templateId) },
        orderBy: { stepIndex: "asc" },
      });
      const enriched = await Promise.all(
        vids.map(async (v) => {
          let signedUrl: string | undefined;
          try {
            const key = deriveKey(v.videoUrl);
            signedUrl = await signKey(key);
          } catch {}
          return { ...v, signedUrl };
        })
      );
      res.json(enriched);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch step videos" });
    }
  })();
});

// Delete a single step video (and from Cloudinary)

// Delete a single step video (admin only)
router.delete(
  "/templates/:templateId/step-video/:stepIndex",
  requireAdmin,
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
          try {
            const key = deriveKey(vid.videoUrl);
            await deleteObject(key);
          } catch (e) {
            console.warn("[STEP-VIDEO DELETE] Failed to delete S3 object", e);
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
