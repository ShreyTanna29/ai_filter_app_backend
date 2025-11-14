import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./lib/prisma";
import facetrixfiltersRouter from "./routes/filter_endpoints";
import templatesRouter from "./routes/templates";
import videoGenerationRouter from "./routes/generate-video";
import runwareRouter from "./routes/runware";
import simpleAuthRouter from "./routes/simple-auth";
import categoriesRouter from "./routes/categories";
import multer from "multer";
import { uploadBuffer, makeKey, ensure512SquareImageFromUrl } from "./lib/s3";
import { signKey, deriveKey } from "./middleware/signedUrl";
import { requireAdmin } from "./middleware/roles";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve static files from public directory

// Feature management routes
// Get all features without pagination
app.get("/api/features/all", async (req, res) => {
  try {
    const list = await prisma.features.findMany({
      orderBy: { createdAt: "asc" },
    });

    res.json({
      success: true,
      features: list,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Paginated features list
app.get("/api/features", async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

    const whereClause =
      search && typeof search === "string"
        ? {
            OR: [
              { endpoint: { contains: search, mode: "insensitive" as const } },
              { prompt: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

    const [list, total] = await Promise.all([
      prisma.features.findMany({
        where: whereClause,
        skip,
        take: limitNumber,
        orderBy: { createdAt: "asc" },
      }),
      prisma.features.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      features: list,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Update a feature's prompt (admin only)
app.put(
  "/api/features/:endpoint",
  requireAdmin,
  async (req, res): Promise<any> => {
    const { endpoint } = req.params;
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: "Prompt is required",
      });
    }

    try {
      const feature = await prisma.features.update({
        where: { endpoint },
        data: { prompt },
      });

      res.json({
        success: true,
        message: "Feature updated successfully",
        feature,
      });
    } catch (error: any) {
      console.error(error);
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Feature not found",
        });
      }
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Create a new feature (admin only)
app.post("/api/features", requireAdmin, async (req, res): Promise<any> => {
  const { endpoint, prompt } = req.body;

  if (!endpoint || !prompt) {
    return res.status(400).json({
      success: false,
      message: "Endpoint and prompt are required",
    });
  }

  try {
    const feature = await prisma.features.create({
      data: {
        endpoint,
        prompt,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Feature created successfully",
      feature,
    });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "Feature with this endpoint already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Rename a feature endpoint (admin only)
app.put(
  "/api/features/:endpoint/rename",
  requireAdmin,
  async (req, res): Promise<any> => {
    const { endpoint } = req.params;
    const { newEndpoint } = req.body;

    if (!newEndpoint) {
      return res.status(400).json({
        success: false,
        message: "New endpoint is required",
      });
    }

    try {
      // Check if new endpoint already exists
      const existingFeature = await prisma.features.findUnique({
        where: { endpoint: newEndpoint },
      });

      if (existingFeature) {
        return res.status(400).json({
          success: false,
          message: "Feature with this endpoint already exists",
        });
      }

      // Update the endpoint
      const feature = await prisma.features.update({
        where: { endpoint },
        data: { endpoint: newEndpoint },
      });

      res.json({
        success: true,
        message: "Feature renamed successfully",
        feature,
      });
    } catch (error: any) {
      console.error(error);
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Feature not found",
        });
      }
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Delete a feature (admin only)
app.delete(
  "/api/features/:endpoint",
  requireAdmin,
  async (req, res): Promise<any> => {
    const { endpoint } = req.params;

    try {
      await prisma.features.delete({
        where: { endpoint },
      });

      res.json({
        success: true,
        message: "Feature deleted successfully",
      });
    } catch (error: any) {
      console.error(error);
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Feature not found",
        });
      }
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Photo Feature management routes
// Get all photo features without pagination
app.get("/api/photo-features/all", async (req, res) => {
  try {
    const list = await prisma.photo_Features.findMany({
      orderBy: { createdAt: "asc" },
    });

    res.json({
      success: true,
      features: list,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Paginated photo features list
app.get("/api/photo-features", async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

    const whereClause =
      search && typeof search === "string"
        ? {
            OR: [
              { endpoint: { contains: search, mode: "insensitive" as const } },
              { prompt: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

    const [list, total] = await Promise.all([
      prisma.photo_Features.findMany({
        where: whereClause,
        skip,
        take: limitNumber,
        orderBy: { createdAt: "asc" },
      }),
      prisma.photo_Features.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      features: list,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Update a photo feature (admin only)
app.put(
  "/api/photo-features/:endpoint",
  requireAdmin,
  async (req, res): Promise<any> => {
    const { endpoint } = req.params;
    const { prompt, isActive } = req.body;

    try {
      const updated = await prisma.photo_Features.update({
        where: { endpoint },
        data: {
          prompt,
          isActive,
        },
      });

      res.json({
        success: true,
        feature: updated,
      });
    } catch (error: any) {
      console.error(error);
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Photo feature not found",
        });
      }
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Create a new photo feature (admin only)
app.post(
  "/api/photo-features",
  requireAdmin,
  async (req, res): Promise<any> => {
    const { endpoint, prompt } = req.body;

    if (!endpoint || !prompt) {
      return res.status(400).json({
        success: false,
        message: "Endpoint and prompt are required",
      });
    }

    try {
      const created = await prisma.photo_Features.create({
        data: {
          endpoint,
          prompt,
          isActive: true,
        },
      });

      res.json({
        success: true,
        feature: created,
      });
    } catch (error: any) {
      console.error(error);
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "Photo feature with this endpoint already exists",
        });
      }
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Rename a photo feature endpoint (admin only)
app.put(
  "/api/photo-features/:endpoint/rename",
  requireAdmin,
  async (req, res): Promise<any> => {
    const { endpoint } = req.params;
    const { newEndpoint } = req.body;

    if (!newEndpoint) {
      return res.status(400).json({
        success: false,
        message: "New endpoint name is required",
      });
    }

    try {
      const updated = await prisma.photo_Features.update({
        where: { endpoint },
        data: { endpoint: newEndpoint },
      });

      res.json({
        success: true,
        feature: updated,
      });
    } catch (error: any) {
      console.error(error);
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Photo feature not found",
        });
      }
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "A photo feature with this endpoint already exists",
        });
      }
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Delete a photo feature (admin only)
app.delete(
  "/api/photo-features/:endpoint",
  requireAdmin,
  async (req, res): Promise<any> => {
    const { endpoint } = req.params;

    try {
      await prisma.photo_Features.delete({
        where: { endpoint },
      });

      res.json({
        success: true,
        message: "Photo feature deleted successfully",
      });
    } catch (error: any) {
      console.error(error);
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Photo feature not found",
        });
      }
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

app.use("/api", facetrixfiltersRouter);
app.use("/api", templatesRouter);
app.use("/api/generate-video", videoGenerationRouter);
app.use("/api", runwareRouter);
app.use("/api/auth", simpleAuthRouter);
app.use("/api/categories", categoriesRouter);

// S3-based image upload replacing legacy Cloudinary upload.
// Supports multipart file under field 'file' OR JSON body with { image_url }.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

app.post(
  "/api/upload-image",
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // If multipart file provided
      if (req.file) {
        const key = makeKey({ type: "image", feature: "uploaded" });
        const result = await uploadBuffer(
          key,
          req.file.buffer,
          req.file.mimetype
        );
        const signedUrl = await signKey(key);
        res.json({
          success: true,
          key: result.key,
          url: result.url,
          signedUrl,
        });
        return;
      }
      // If JSON body with remote image_url provided
      const { image_url, resize512 } = req.body as any;
      if (image_url && typeof image_url === "string") {
        let buffer: Buffer;
        let contentType = "image/png";
        if (resize512) {
          // Normalize & resize
          const ensured = await ensure512SquareImageFromUrl(image_url);
          buffer = ensured.buffer;
          contentType = ensured.contentType;
        } else {
          const resp = await fetch(image_url);
          if (!resp.ok) {
            res
              .status(400)
              .json({ success: false, message: "Failed to fetch image_url" });
            return;
          }
          const arr = await resp.arrayBuffer();
          buffer = Buffer.from(arr);
          const ct = resp.headers.get("content-type");
          if (ct) contentType = ct;
        }
        const key = makeKey({ type: "image", feature: "uploaded" });
        const result = await uploadBuffer(key, buffer, contentType);
        const signedUrl = await signKey(key);
        res.json({
          success: true,
          key: result.key,
          url: result.url,
          signedUrl,
        });
        return;
      }
      res
        .status(400)
        .json({ success: false, message: "No file or image_url provided" });
      return;
    } catch (e: any) {
      console.error("[UPLOAD-IMAGE] Error", e);
      res
        .status(500)
        .json({
          success: false,
          message: "Upload failed",
          details: e?.message,
        });
      return;
    }
  }
);

// Backwards compatible path for former Cloudinary route if clients still call /api/cloudinary/upload
app.post(
  "/api/cloudinary/upload",
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (req.file) {
        const key = makeKey({ type: "image", feature: "uploaded" });
        const result = await uploadBuffer(
          key,
          req.file.buffer,
          req.file.mimetype
        );
        const signedUrl = await signKey(key);
        res.json({
          success: true,
          key: result.key,
          url: result.url,
          signedUrl,
          migrated: true,
        });
        return;
      }
      const { image_url } = req.body as any;
      if (image_url) {
        const ensured = await ensure512SquareImageFromUrl(image_url);
        const key = makeKey({ type: "image", feature: "uploaded" });
        const result = await uploadBuffer(
          key,
          ensured.buffer,
          ensured.contentType
        );
        const signedUrl = await signKey(key);
        res.json({
          success: true,
          key: result.key,
          url: result.url,
          signedUrl,
          migrated: true,
        });
        return;
      }
      res
        .status(400)
        .json({ success: false, message: "No file or image_url provided" });
      return;
    } catch (e: any) {
      console.error("[LEGACY-CLOUDINARY-UPLOAD] Error", e);
      res
        .status(500)
        .json({
          success: false,
          message: "Upload failed",
          details: e?.message,
        });
      return;
    }
  }
);

// Serve admin panel HTML
app.get("/", (req: Request, res: Response) => {
  res.sendFile("index.html", { root: "./public" });
});

// Catch JSON parsing errors
app.use(function (err: any, req: any, res: any, next: any) {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON body" });
  }
  next(err);
});

// Global error handler (fallback)
app.use(function (err: any, req: any, res: any, next: any) {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
