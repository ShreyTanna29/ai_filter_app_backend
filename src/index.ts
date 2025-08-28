import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "./generated/prisma";
import facetrixfiltersRouter from "./routes/filter_endpoints";
import { features } from "./filters/features";
import fs from "fs";
import path from "path";
import templatesRouter from "./routes/templates";
import cloudinaryRouter from "./routes/cloudinary";
import videoGenerationRouter from "./routes/generate-video";

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
app.get("/api/features", (req: Request, res: Response): void => {
  res.json(features);
});

app.put("/api/features/:endpoint", (req: Request, res: Response): void => {
  const { endpoint } = req.params;
  const { prompt } = req.body;

  if (!prompt) {
    res.status(400).json({ message: "Prompt is required" });
    return;
  }

  // Find the feature in the array
  const featureIndex = features.findIndex((f) => f.endpoint === endpoint);

  if (featureIndex === -1) {
    res.status(404).json({ message: "Feature not found" });
    return;
  }

  // Update the prompt
  features[featureIndex].prompt = prompt;

  // Write the updated features back to the file
  const featuresPath = path.join(__dirname, "filters", "features.ts");
  const featuresContent = `export const features = ${JSON.stringify(
    features,
    null,
    2
  )};`;

  try {
    fs.writeFileSync(featuresPath, featuresContent);
    res.json({
      message: "Feature updated successfully",
      feature: features[featureIndex],
    });
  } catch (error) {
    console.error("Error writing features file:", error);
    res.status(500).json({ message: "Failed to update feature" });
  }
});

// Rename a feature endpoint
app.put(
  "/api/features/:endpoint/rename",
  (req: Request, res: Response): void => {
    const { endpoint } = req.params;
    const { newEndpoint } = req.body as { newEndpoint?: string };

    if (
      !newEndpoint ||
      typeof newEndpoint !== "string" ||
      !newEndpoint.trim()
    ) {
      res.status(400).json({ message: "newEndpoint is required" });
      return;
    }

    // Validate uniqueness
    if (features.some((f) => f.endpoint === newEndpoint)) {
      res
        .status(409)
        .json({ message: "An endpoint with this name already exists" });
      return;
    }

    const featureIndex = features.findIndex((f) => f.endpoint === endpoint);
    if (featureIndex === -1) {
      res.status(404).json({ message: "Feature not found" });
      return;
    }

    features[featureIndex].endpoint = newEndpoint;

    // Persist to file
    const featuresPath = path.join(__dirname, "filters", "features.ts");
    const featuresContent = `export const features = ${JSON.stringify(
      features,
      null,
      2
    )};`;
    try {
      fs.writeFileSync(featuresPath, featuresContent);
      res.json({
        message: "Endpoint renamed",
        feature: features[featureIndex],
      });
    } catch (e) {
      console.error("Error writing features file:", e);
      res.status(500).json({ message: "Failed to rename endpoint" });
    }
  }
);

app.use("/api", facetrixfiltersRouter);
app.use("/api", templatesRouter);
app.use("/api/generate-video", videoGenerationRouter);
app.use("/api/cloudinary", cloudinaryRouter);

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
