import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { deriveKey, signKey } from "../middleware/signedUrl";

const router = Router();

function generateApiKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

// List apps (requires API key)
router.get("/", async (req: Request, res: Response) => {
  const apps = await prisma.app.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ success: true, apps });
});

// Get all available resources for app permissions
// IMPORTANT: This route must be defined BEFORE /:id to avoid conflicts
router.get(
  "/resources/all",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const [features, photoFeatures, generatedVideos, generatedPhotos] =
        await Promise.all([
          prisma.features.findMany({ orderBy: { endpoint: "asc" } }),
          prisma.photo_Features.findMany({ orderBy: { endpoint: "asc" } }),
          prisma.generatedVideo.findMany({ orderBy: { createdAt: "desc" } }),
          prisma.generated_Photo.findMany({ orderBy: { createdAt: "desc" } }),
        ]);

      const S3_BUCKET = process.env.AWS_S3_BUCKET || "";

      // Helper to check if URL is from our S3 bucket
      const isS3Url = (url: string): boolean => {
        if (!url || !S3_BUCKET) return false;
        return (
          url.includes(S3_BUCKET) ||
          url.includes("s3.") ||
          url.includes("amazonaws.com")
        );
      };

      // Sign URLs for generated videos (stored in S3)
      const signedVideos = await Promise.all(
        generatedVideos.map(async (v) => {
          try {
            if (isS3Url(v.url)) {
              const key = deriveKey(v.url);
              const signedUrl = await signKey(key);
              return { ...v, signedUrl };
            }
            // Not an S3 URL, use as-is
            return { ...v, signedUrl: v.url };
          } catch {
            return { ...v, signedUrl: v.url };
          }
        })
      );

      // Photos are stored as external URLs (Runware), not S3 - use directly
      const signedPhotos = await Promise.all(
        generatedPhotos.map(async (p) => {
          try {
            if (isS3Url(p.url)) {
              const key = deriveKey(p.url);
              const signedUrl = await signKey(key);
              return { ...p, signedUrl };
            }
            // Not an S3 URL (e.g., Runware CDN), use as-is
            return { ...p, signedUrl: p.url };
          } catch {
            return { ...p, signedUrl: p.url };
          }
        })
      );

      res.json({
        success: true,
        features,
        photoFeatures,
        generatedVideos: signedVideos,
        generatedPhotos: signedPhotos,
      });
    } catch (e: unknown) {
      res
        .status(500)
        .json({ success: false, message: "Failed to get resources" });
    }
  }
);

// Get app details with permissions
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const idNum = Number(req.params.id);
  if (Number.isNaN(idNum) || idNum <= 0) {
    res.status(400).json({ success: false, message: "invalid id" });
    return;
  }
  try {
    const app = await prisma.app.findUnique({
      where: { id: idNum },
      include: {
        allowedFeatures: {
          include: { feature: true },
        },
        allowedPhotoFeatures: {
          include: { photoFeature: true },
        },
        allowedVideos: {
          include: { generatedVideo: true },
        },
        allowedPhotos: {
          include: { generatedPhoto: true },
        },
      },
    });
    if (!app) {
      res.status(404).json({ success: false, message: "App not found" });
      return;
    }
    res.json({ success: true, app });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: "Failed to get app" });
  }
});

// Update app permissions
router.put(
  "/:id/permissions",
  async (req: Request, res: Response): Promise<void> => {
    const idNum = Number(req.params.id);
    if (Number.isNaN(idNum) || idNum <= 0) {
      res.status(400).json({ success: false, message: "invalid id" });
      return;
    }

    const body = req.body as {
      featureIds?: number[];
      photoFeatureIds?: number[];
      generatedVideoIds?: number[];
      generatedPhotoIds?: number[];
    };

    try {
      // Use transaction to update all permissions atomically
      await prisma.$transaction(async (tx) => {
        // Update Features permissions
        if (Array.isArray(body.featureIds)) {
          await tx.appFeature.deleteMany({ where: { appId: idNum } });
          if (body.featureIds.length > 0) {
            await tx.appFeature.createMany({
              data: body.featureIds.map((featureId) => ({
                appId: idNum,
                featureId,
              })),
            });
          }
        }

        // Update Photo Features permissions
        if (Array.isArray(body.photoFeatureIds)) {
          await tx.appPhotoFeature.deleteMany({ where: { appId: idNum } });
          if (body.photoFeatureIds.length > 0) {
            await tx.appPhotoFeature.createMany({
              data: body.photoFeatureIds.map((photoFeatureId) => ({
                appId: idNum,
                photoFeatureId,
              })),
            });
          }
        }

        // Update Generated Videos permissions
        if (Array.isArray(body.generatedVideoIds)) {
          await tx.appGeneratedVideo.deleteMany({ where: { appId: idNum } });
          if (body.generatedVideoIds.length > 0) {
            await tx.appGeneratedVideo.createMany({
              data: body.generatedVideoIds.map((generatedVideoId) => ({
                appId: idNum,
                generatedVideoId,
              })),
            });
          }
        }

        // Update Generated Photos permissions
        if (Array.isArray(body.generatedPhotoIds)) {
          await tx.appGeneratedPhoto.deleteMany({ where: { appId: idNum } });
          if (body.generatedPhotoIds.length > 0) {
            await tx.appGeneratedPhoto.createMany({
              data: body.generatedPhotoIds.map((generatedPhotoId) => ({
                appId: idNum,
                generatedPhotoId,
              })),
            });
          }
        }
      });

      // Fetch updated app with permissions
      const app = await prisma.app.findUnique({
        where: { id: idNum },
        include: {
          allowedFeatures: {
            include: { feature: true },
          },
          allowedPhotoFeatures: {
            include: { photoFeature: true },
          },
          allowedVideos: {
            include: { generatedVideo: true },
          },
          allowedPhotos: {
            include: { generatedPhoto: true },
          },
        },
      });

      res.json({ success: true, app });
    } catch (e: unknown) {
      console.error("Error updating app permissions:", e);
      res
        .status(500)
        .json({ success: false, message: "Failed to update permissions" });
    }
  }
);

// Create app (requires API key or ADMIN_API_KEY)
router.post(
  "/",

  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { name?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      res.status(400).json({ success: false, message: "name is required" });
      return;
    }
    try {
      const apiKey = generateApiKey();
      const app = await prisma.app.create({ data: { name, apiKey } });
      res.status(201).json({ success: true, app });
    } catch (e: unknown) {
      const err = e as Prisma.PrismaClientKnownRequestError;
      if (err?.code === "P2002") {
        res
          .status(409)
          .json({ success: false, message: "App name already exists" });
        return;
      }
      res.status(500).json({ success: false, message: "Failed to create app" });
    }
  }
);

// Rotate key (requires API key)
router.post(
  "/:id/rotate",
  async (req: Request, res: Response): Promise<void> => {
    const idNum = Number(req.params.id);
    if (Number.isNaN(idNum) || idNum <= 0) {
      res.status(400).json({ success: false, message: "invalid id" });
      return;
    }
    const apiKey = generateApiKey();
    try {
      const app = await prisma.app.update({
        where: { id: idNum },
        data: { apiKey },
      });
      res.json({ success: true, app });
    } catch (e: unknown) {
      res.status(404).json({ success: false, message: "App not found" });
    }
  }
);

// Delete app (requires API key)
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const idNum = Number(req.params.id);
  if (Number.isNaN(idNum) || idNum <= 0) {
    res.status(400).json({ success: false, message: "invalid id" });
    return;
  }
  try {
    await prisma.app.delete({ where: { id: idNum } });
    res.json({ success: true });
  } catch (e: unknown) {
    res.status(404).json({ success: false, message: "App not found" });
  }
});

// Get app analytics (API call stats)
router.get(
  "/:id/analytics",
  async (req: Request, res: Response): Promise<void> => {
    const idNum = Number(req.params.id);
    if (Number.isNaN(idNum) || idNum <= 0) {
      res.status(400).json({ success: false, message: "invalid id" });
      return;
    }

    try {
      // Check if app exists
      const app = await prisma.app.findUnique({ where: { id: idNum } });
      if (!app) {
        res.status(404).json({ success: false, message: "App not found" });
        return;
      }

      // Get total API calls
      const totalCalls = await prisma.appApiLog.count({
        where: { appId: idNum },
      });

      // Get successful and failed calls
      const [successCalls, errorCalls] = await Promise.all([
        prisma.appApiLog.count({
          where: { appId: idNum, status: "success" },
        }),
        prisma.appApiLog.count({
          where: { appId: idNum, status: "error" },
        }),
      ]);

      // Get calls by endpoint (top filters used)
      const callsByEndpoint = await prisma.appApiLog.groupBy({
        by: ["endpoint"],
        where: { appId: idNum },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      });

      // Get calls by feature type
      const callsByFeatureType = await prisma.appApiLog.groupBy({
        by: ["featureType"],
        where: { appId: idNum },
        _count: { id: true },
      });

      // Get calls by model
      const callsByModel = await prisma.appApiLog.groupBy({
        by: ["model"],
        where: { appId: idNum, model: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      });

      // Get recent API calls (last 20)
      const recentCalls = await prisma.appApiLog.findMany({
        where: { appId: idNum },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          endpoint: true,
          featureType: true,
          model: true,
          status: true,
          errorMessage: true,
          responseTime: true,
          createdAt: true,
        },
      });

      // Get calls per day for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyCalls = await prisma.$queryRaw<
        { date: Date; count: bigint }[]
      >`
        SELECT DATE(\"createdAt\") as date, COUNT(*) as count
        FROM "AppApiLog"
        WHERE "appId" = ${idNum} AND "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
      `;

      // Get average response time
      const avgResponseTime = await prisma.appApiLog.aggregate({
        where: { appId: idNum, responseTime: { not: null } },
        _avg: { responseTime: true },
      });

      res.json({
        success: true,
        analytics: {
          totalCalls,
          successCalls,
          errorCalls,
          successRate:
            totalCalls > 0 ? ((successCalls / totalCalls) * 100).toFixed(1) : 0,
          avgResponseTime: avgResponseTime._avg.responseTime
            ? Math.round(avgResponseTime._avg.responseTime)
            : null,
          callsByEndpoint: callsByEndpoint.map((c) => ({
            endpoint: c.endpoint,
            count: c._count.id,
          })),
          callsByFeatureType: callsByFeatureType.map((c) => ({
            featureType: c.featureType,
            count: c._count.id,
          })),
          callsByModel: callsByModel.map((c) => ({
            model: c.model,
            count: c._count.id,
          })),
          dailyCalls: dailyCalls.map((d) => ({
            date: d.date,
            count: Number(d.count),
          })),
          recentCalls,
        },
      });
    } catch (e: unknown) {
      console.error("Error fetching app analytics:", e);
      res
        .status(500)
        .json({ success: false, message: "Failed to get app analytics" });
    }
  }
);

export default router;
