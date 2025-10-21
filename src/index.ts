import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "./generated/prisma";
import facetrixfiltersRouter from "./routes/filter_endpoints";
import templatesRouter from "./routes/templates";
import cloudinaryRouter from "./routes/cloudinary";
import videoGenerationRouter from "./routes/generate-video";
import simpleAuthRouter from "./routes/simple-auth";
import categoriesRouter from "./routes/categories";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve static files from public directory

const prisma = new PrismaClient();

// Feature management routes
// Get all features without pagination
app.get("/api/features/all", async (req, res) => {
  try {
    const { search } = req.query;

    const whereClause =
      search && typeof search === "string"
        ? {
            OR: [
              { endpoint: { contains: search, mode: "insensitive" as const } },
              { prompt: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

    const list = await prisma.features.findMany({
      where: whereClause,
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

// Update a feature's prompt
app.put("/api/features/:endpoint", async (req, res): Promise<any> => {
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
});

// Create a new feature
app.post("/api/features", async (req, res): Promise<any> => {
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

// Rename a feature endpoint
app.put("/api/features/:endpoint/rename", async (req, res): Promise<any> => {
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
});

// Delete a feature
app.delete("/api/features/:endpoint", async (req, res): Promise<any> => {
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
});

app.use("/api", facetrixfiltersRouter);
app.use("/api", templatesRouter);
app.use("/api/generate-video", videoGenerationRouter);
app.use("/api/cloudinary", cloudinaryRouter);
app.use("/api/auth", simpleAuthRouter);
app.use("/api/categories", categoriesRouter);

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
