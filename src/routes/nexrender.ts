import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

// Nexrender Cloud API configuration
const NEXRENDER_API_URL =
  process.env.NEXRENDER_API_URL || "https://api.nexrender.com/api/v2";
const NEXRENDER_API_KEY = process.env.NEXRENDER_API_KEY;

// Webhook URL for receiving render completion notifications
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || process.env.BASE_URL;

// Helper to get authorization header
function getAuthHeader() {
  if (!NEXRENDER_API_KEY) {
    throw new Error("NEXRENDER_API_KEY environment variable is not set");
  }
  return {
    Authorization: `Bearer ${NEXRENDER_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// Asset types for Nexrender
interface NexrenderAsset {
  type: "text" | "image" | "video" | "audio" | "data" | "script";
  layerName: string;
  value?: string;
  src?: string;
  composition?: string;
}

// Request body for submitting a render job
interface SubmitJobBody {
  templateId: string;
  composition?: string;
  assets: NexrenderAsset[];
  preview?: boolean;
  fonts?: string[];
  settings?: {
    outputModule?: string;
    outputFormat?: string;
    startFrame?: number;
    endFrame?: number;
    incrementFrame?: number;
  };
  webhook?: {
    url?: string;
    secret?: string;
  };
}

/**
 * POST /nexrender/jobs
 * Submit a new render job to Nexrender Cloud
 *
 * Request body:
 * {
 *   "templateId": "01JTGM9GCR71JV7EJYDF45QAFD",
 *   "composition": "main",
 *   "assets": [
 *     { "type": "text", "layerName": "title", "value": "Hello World!" },
 *     { "type": "image", "layerName": "logo", "src": "https://..." }
 *   ],
 *   "settings": { "outputModule": "H.264" },
 *   "webhook": { "url": "https://yoursite.com/api/nexrender/webhook" }
 * }
 */
router.post("/jobs", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      templateId,
      composition = "main",
      assets = [],
      preview = false,
      fonts = [],
      settings = {},
      webhook,
    } = req.body as SubmitJobBody;

    // Validate required fields
    if (!templateId) {
      res.status(400).json({
        success: false,
        error: "templateId is required",
      });
      return;
    }

    // Build the Nexrender job payload
    const jobPayload: any = {
      template: {
        id: templateId,
        composition,
      },
      preview,
      fonts,
      assets,
      settings,
    };

    // Add webhook configuration if provided or use default
    if (webhook?.url || WEBHOOK_BASE_URL) {
      jobPayload.webhook = {
        url: webhook?.url || `${WEBHOOK_BASE_URL}/api/nexrender/webhook`,
        ...(webhook?.secret && { secret: webhook.secret }),
      };
    }

    console.log(
      "[NEXRENDER] Submitting job:",
      JSON.stringify(jobPayload, null, 2),
    );

    // Submit job to Nexrender Cloud
    const response = await axios.post(`${NEXRENDER_API_URL}/jobs`, jobPayload, {
      headers: getAuthHeader(),
    });

    const nexrenderJob = response.data;

    console.log("[NEXRENDER] Job submitted:", nexrenderJob);

    // Store job in database
    const dbJob = await prisma.nexrenderJob.create({
      data: {
        nexrenderId: nexrenderJob.id,
        templateId,
        composition,
        status: nexrenderJob.status || "queued",
        progress: nexrenderJob.progress || 0,
        outputUrl: nexrenderJob.outputUrl || null,
        assets: assets as any,
      },
    });

    res.status(201).json({
      success: true,
      job: {
        id: dbJob.id,
        nexrenderId: dbJob.nexrenderId,
        templateId: dbJob.templateId,
        composition: dbJob.composition,
        status: dbJob.status,
        progress: dbJob.progress,
        outputUrl: nexrenderJob.outputUrl || null,
        createdAt: dbJob.createdAt,
      },
    });
  } catch (error) {
    console.error("[NEXRENDER] Error submitting job:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      res.status(axiosError.response?.status || 500).json({
        success: false,
        error: "Failed to submit render job",
        details: axiosError.response?.data || axiosError.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /nexrender/templates
 * Get all available templates from Nexrender Cloud
 *
 * Query params:
 * - status: Filter by status (e.g., "ready", "processing", "error")
 */
router.get("/templates", async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;

    console.log("[NEXRENDER] Fetching all templates...");

    // Fetch templates from Nexrender Cloud
    const response = await axios.get(`${NEXRENDER_API_URL}/templates`, {
      headers: getAuthHeader(),
    });

    let templates = response.data;

    // Filter by status if provided
    if (status && typeof status === "string") {
      templates = templates.filter((t: any) => t.status === status);
    }

    console.log(`[NEXRENDER] Found ${templates.length} templates`);

    res.json({
      success: true,
      templates: templates.map((template: any) => ({
        id: template.id,
        type: template.type,
        displayName: template.displayName,
        status: template.status,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        compositions: template.compositions || [],
        layers: template.layers || [],
        mogrt: template.mogrt || {},
        error: template.error || null,
      })),
      total: templates.length,
    });
  } catch (error) {
    console.error("[NEXRENDER] Error fetching templates:", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      res.status(axiosError.response?.status || 500).json({
        success: false,
        error: "Failed to fetch templates from Nexrender Cloud",
        details: axiosError.response?.data || axiosError.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /nexrender/templates/:id
 * Get a specific template by ID from Nexrender Cloud
 *
 * Returns detailed template information including:
 * - compositions: Available compositions in the template
 * - layers: All layers that can be modified
 * - mogrt: Motion graphics template settings
 * - uploadInfo: Upload URL info (if still available)
 */
router.get(
  "/templates/:id",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      console.log(`[NEXRENDER] Fetching template: ${id}`);

      // Fetch template from Nexrender Cloud
      const response = await axios.get(`${NEXRENDER_API_URL}/templates/${id}`, {
        headers: getAuthHeader(),
      });

      const template = response.data;

      console.log(`[NEXRENDER] Template found: ${template.displayName || id}`);

      res.json({
        success: true,
        template: {
          id: template.id,
          type: template.type,
          displayName: template.displayName,
          status: template.status,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
          compositions: template.compositions || [],
          layers: template.layers || [],
          mogrt: template.mogrt || {},
          error: template.error || null,
          uploadInfo: template.uploadInfo || null,
        },
      });
    } catch (error) {
      console.error("[NEXRENDER] Error fetching template:", error);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 404) {
          res.status(404).json({
            success: false,
            error: "Template not found",
          });
          return;
        }
        res.status(axiosError.response?.status || 500).json({
          success: false,
          error: "Failed to fetch template from Nexrender Cloud",
          details: axiosError.response?.data || axiosError.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  },
);

/**
 * GET /nexrender/jobs/:id
 * Get the status of a render job
 * Supports both internal database ID and Nexrender job ID
 */
router.get("/jobs/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Try to find by internal ID first, then by Nexrender ID
    let dbJob = await prisma.nexrenderJob.findFirst({
      where: {
        OR: [
          { id: isNaN(parseInt(id)) ? undefined : parseInt(id) },
          { nexrenderId: id },
        ],
      },
    });

    if (!dbJob) {
      res.status(404).json({
        success: false,
        error: "Job not found",
      });
      return;
    }

    // If job is not finished, poll Nexrender for latest status
    if (dbJob.status !== "finished" && dbJob.status !== "error") {
      try {
        const response = await axios.get(
          `${NEXRENDER_API_URL}/jobs/${dbJob.nexrenderId}`,
          {
            headers: getAuthHeader(),
          },
        );

        const nexrenderJob = response.data;

        // Update local database with latest status
        dbJob = await prisma.nexrenderJob.update({
          where: { id: dbJob.id },
          data: {
            status: nexrenderJob.status,
            progress: nexrenderJob.progress || dbJob.progress,
            outputUrl: nexrenderJob.outputUrl || dbJob.outputUrl,
            error: nexrenderJob.error || dbJob.error,
            renderDuration:
              nexrenderJob.stats?.renderDuration || dbJob.renderDuration,
            startedAt: nexrenderJob.stats?.startedAt
              ? new Date(nexrenderJob.stats.startedAt)
              : dbJob.startedAt,
            finishedAt: nexrenderJob.stats?.finishedAt
              ? new Date(nexrenderJob.stats.finishedAt)
              : dbJob.finishedAt,
          },
        });
      } catch (pollError) {
        console.error("[NEXRENDER] Error polling job status:", pollError);
        // Continue with cached data if polling fails
      }
    }

    res.json({
      success: true,
      job: {
        id: dbJob.id,
        nexrenderId: dbJob.nexrenderId,
        templateId: dbJob.templateId,
        composition: dbJob.composition,
        status: dbJob.status,
        progress: dbJob.progress,
        outputUrl: dbJob.outputUrl,
        error: dbJob.error,
        renderDuration: dbJob.renderDuration,
        createdAt: dbJob.createdAt,
        startedAt: dbJob.startedAt,
        finishedAt: dbJob.finishedAt,
      },
    });
  } catch (error) {
    console.error("[NEXRENDER] Error getting job:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /nexrender/jobs
 * List all render jobs with optional filters
 *
 * Query params:
 * - status: Filter by status (queued, render:dorender, finished, error)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 */
router.get("/jobs", async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = "1", limit = "20" } = req.query;

    const pageNumber = parseInt(page as string);
    const limitNumber = Math.min(parseInt(limit as string), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const whereClause: any = {};
    if (status && typeof status === "string") {
      whereClause.status = status;
    }

    const [jobs, total] = await Promise.all([
      prisma.nexrenderJob.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNumber,
      }),
      prisma.nexrenderJob.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      jobs: jobs.map((job) => ({
        id: job.id,
        nexrenderId: job.nexrenderId,
        templateId: job.templateId,
        composition: job.composition,
        status: job.status,
        progress: job.progress,
        outputUrl: job.outputUrl,
        error: job.error,
        createdAt: job.createdAt,
        finishedAt: job.finishedAt,
      })),
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("[NEXRENDER] Error listing jobs:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /nexrender/webhook
 * Webhook endpoint for receiving render completion notifications from Nexrender Cloud
 *
 * Nexrender sends a POST with the full job object when status changes
 */
router.post("/webhook", async (req: Request, res: Response): Promise<void> => {
  try {
    const webhookData = req.body;

    console.log(
      "[NEXRENDER] Webhook received:",
      JSON.stringify(webhookData, null, 2),
    );

    // Extract job ID from webhook data
    const nexrenderId = webhookData.id;

    if (!nexrenderId) {
      res.status(400).json({
        success: false,
        error: "Invalid webhook payload: missing job id",
      });
      return;
    }

    // Find and update the job in our database
    const existingJob = await prisma.nexrenderJob.findUnique({
      where: { nexrenderId },
    });

    if (!existingJob) {
      console.warn(
        `[NEXRENDER] Received webhook for unknown job: ${nexrenderId}`,
      );
      // Still acknowledge the webhook
      res.status(200).json({ success: true, message: "Webhook acknowledged" });
      return;
    }

    // Update job with webhook data
    const updatedJob = await prisma.nexrenderJob.update({
      where: { nexrenderId },
      data: {
        status: webhookData.status || existingJob.status,
        progress: webhookData.progress ?? existingJob.progress,
        outputUrl: webhookData.outputUrl || existingJob.outputUrl,
        error: webhookData.error || webhookData.stats?.error || null,
        renderDuration:
          webhookData.stats?.renderDuration || existingJob.renderDuration,
        webhookReceived: true,
        startedAt: webhookData.stats?.startedAt
          ? new Date(webhookData.stats.startedAt)
          : existingJob.startedAt,
        finishedAt: webhookData.stats?.finishedAt
          ? new Date(webhookData.stats.finishedAt)
          : existingJob.finishedAt,
      },
    });

    console.log(
      `[NEXRENDER] Job ${nexrenderId} updated via webhook: status=${updatedJob.status}`,
    );

    res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
      jobId: updatedJob.id,
    });
  } catch (error) {
    console.error("[NEXRENDER] Error processing webhook:", error);
    // Still return 200 to acknowledge receipt (prevents retries)
    res.status(200).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * DELETE /nexrender/jobs/:id
 * Cancel/delete a render job
 * Only works for jobs that haven't started rendering yet
 */
router.delete(
  "/jobs/:id",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Find the job in our database
      const dbJob = await prisma.nexrenderJob.findFirst({
        where: {
          OR: [
            { id: isNaN(parseInt(id)) ? undefined : parseInt(id) },
            { nexrenderId: id },
          ],
        },
      });

      if (!dbJob) {
        res.status(404).json({
          success: false,
          error: "Job not found",
        });
        return;
      }

      // Try to cancel on Nexrender Cloud (may fail if already processing)
      try {
        await axios.delete(`${NEXRENDER_API_URL}/jobs/${dbJob.nexrenderId}`, {
          headers: getAuthHeader(),
        });
        console.log(
          `[NEXRENDER] Job ${dbJob.nexrenderId} cancelled on Nexrender Cloud`,
        );
      } catch (cancelError) {
        console.warn(
          "[NEXRENDER] Could not cancel job on Nexrender Cloud:",
          cancelError,
        );
        // Continue to update local status even if remote cancellation fails
      }

      // Update local database to mark as cancelled/error
      const updatedJob = await prisma.nexrenderJob.update({
        where: { id: dbJob.id },
        data: {
          status: "error",
          error: "Cancelled by user",
        },
      });

      res.json({
        success: true,
        message: "Job cancelled",
        job: {
          id: updatedJob.id,
          nexrenderId: updatedJob.nexrenderId,
          status: updatedJob.status,
        },
      });
    } catch (error) {
      console.error("[NEXRENDER] Error cancelling job:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  },
);

/**
 * POST /nexrender/render-template
 * High-level endpoint to render a template with dynamic text/image replacements
 * Simpler interface for common use cases
 *
 * Request body:
 * {
 *   "templateId": "01JTGM9GCR71JV7EJYDF45QAFD",
 *   "textReplacements": {
 *     "title": "My Video Title",
 *     "subtitle": "Made with AI"
 *   },
 *   "imageReplacements": {
 *     "logo": "https://example.com/logo.png",
 *     "background": "https://example.com/bg.jpg"
 *   },
 *   "videoReplacements": {
 *     "mainVideo": "https://example.com/video.mp4"
 *   }
 * }
 */
router.post(
  "/render-template",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        templateId,
        composition = "main",
        textReplacements = {},
        imageReplacements = {},
        videoReplacements = {},
        audioReplacements = {},
        outputSettings = {},
      } = req.body;

      // Validate required fields
      if (!templateId) {
        res.status(400).json({
          success: false,
          error: "templateId is required",
        });
        return;
      }

      // Build assets array from replacements
      const assets: NexrenderAsset[] = [];

      // Add text assets
      for (const [layerName, value] of Object.entries(textReplacements)) {
        assets.push({
          type: "text",
          layerName,
          value: String(value),
        });
      }

      // Add image assets
      for (const [layerName, src] of Object.entries(imageReplacements)) {
        assets.push({
          type: "image",
          layerName,
          src: String(src),
        });
      }

      // Add video assets
      for (const [layerName, src] of Object.entries(videoReplacements)) {
        assets.push({
          type: "video",
          layerName,
          src: String(src),
        });
      }

      // Add audio assets
      for (const [layerName, src] of Object.entries(audioReplacements)) {
        assets.push({
          type: "audio",
          layerName,
          src: String(src),
        });
      }

      // Build job payload
      const jobPayload: any = {
        template: {
          id: templateId,
          composition,
        },
        assets,
        settings: outputSettings,
      };

      // Add webhook if configured
      if (WEBHOOK_BASE_URL) {
        jobPayload.webhook = {
          url: `${WEBHOOK_BASE_URL}/api/nexrender/webhook`,
        };
      }

      console.log(
        "[NEXRENDER] Rendering template:",
        JSON.stringify(jobPayload, null, 2),
      );

      // Submit job to Nexrender Cloud
      const response = await axios.post(
        `${NEXRENDER_API_URL}/jobs`,
        jobPayload,
        {
          headers: getAuthHeader(),
        },
      );

      const nexrenderJob = response.data;

      // Store job in database
      const dbJob = await prisma.nexrenderJob.create({
        data: {
          nexrenderId: nexrenderJob.id,
          templateId,
          composition,
          status: nexrenderJob.status || "queued",
          progress: nexrenderJob.progress || 0,
          outputUrl: nexrenderJob.outputUrl || null,
          assets: assets as any,
        },
      });

      res.status(201).json({
        success: true,
        message: "Template render job submitted",
        job: {
          id: dbJob.id,
          nexrenderId: dbJob.nexrenderId,
          templateId: dbJob.templateId,
          status: dbJob.status,
          progress: dbJob.progress,
          outputUrl: nexrenderJob.outputUrl || null,
          createdAt: dbJob.createdAt,
        },
      });
    } catch (error) {
      console.error("[NEXRENDER] Error rendering template:", error);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        res.status(axiosError.response?.status || 500).json({
          success: false,
          error: "Failed to submit render job",
          details: axiosError.response?.data || axiosError.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  },
);

/**
 * GET /nexrender/jobs/:id/wait
 * Poll for job completion and return the result
 * Useful for synchronous workflows where you need to wait for the render
 *
 * Query params:
 * - timeout: Max seconds to wait (default: 300, max: 600)
 * - interval: Polling interval in seconds (default: 5)
 */
router.get(
  "/jobs/:id/wait",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const timeout = Math.min(
        parseInt((req.query.timeout as string) || "300"),
        600,
      );
      const interval = Math.max(
        parseInt((req.query.interval as string) || "5"),
        2,
      );

      // Find the job
      let dbJob = await prisma.nexrenderJob.findFirst({
        where: {
          OR: [
            { id: isNaN(parseInt(id)) ? undefined : parseInt(id) },
            { nexrenderId: id },
          ],
        },
      });

      if (!dbJob) {
        res.status(404).json({
          success: false,
          error: "Job not found",
        });
        return;
      }

      const startTime = Date.now();
      const timeoutMs = timeout * 1000;

      // Poll until complete or timeout
      while (
        Date.now() - startTime < timeoutMs &&
        dbJob.status !== "finished" &&
        dbJob.status !== "error"
      ) {
        // Wait for interval
        await new Promise((resolve) => setTimeout(resolve, interval * 1000));

        // Poll Nexrender for status
        try {
          const response = await axios.get(
            `${NEXRENDER_API_URL}/jobs/${dbJob.nexrenderId}`,
            {
              headers: getAuthHeader(),
            },
          );

          const nexrenderJob: any = response.data;

          // Update local database
          dbJob = await prisma.nexrenderJob.update({
            where: { id: dbJob.id },
            data: {
              status: nexrenderJob.status,
              progress: nexrenderJob.progress || dbJob.progress,
              outputUrl: nexrenderJob.outputUrl || dbJob.outputUrl,
              error: nexrenderJob.error || dbJob.error,
              renderDuration:
                nexrenderJob.stats?.renderDuration || dbJob.renderDuration,
              startedAt: nexrenderJob.stats?.startedAt
                ? new Date(nexrenderJob.stats.startedAt)
                : dbJob.startedAt,
              finishedAt: nexrenderJob.stats?.finishedAt
                ? new Date(nexrenderJob.stats.finishedAt)
                : dbJob.finishedAt,
            },
          });
        } catch (pollError) {
          console.error("[NEXRENDER] Error polling job:", pollError);
          // Continue waiting
        }
      }

      const isTimeout =
        Date.now() - startTime >= timeoutMs &&
        dbJob.status !== "finished" &&
        dbJob.status !== "error";

      res.json({
        success: dbJob.status === "finished",
        timedOut: isTimeout,
        job: {
          id: dbJob.id,
          nexrenderId: dbJob.nexrenderId,
          templateId: dbJob.templateId,
          status: dbJob.status,
          progress: dbJob.progress,
          outputUrl: dbJob.outputUrl,
          error: dbJob.error,
          renderDuration: dbJob.renderDuration,
          createdAt: dbJob.createdAt,
          finishedAt: dbJob.finishedAt,
        },
      });
    } catch (error) {
      console.error("[NEXRENDER] Error waiting for job:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  },
);

export default router;
