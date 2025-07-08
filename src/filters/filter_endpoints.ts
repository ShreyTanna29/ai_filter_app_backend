import { Router, Request, Response } from "express";
import multer from "multer";
import { fal } from "@fal-ai/client";
import { features } from "./features";
let BlobImpl: typeof Blob;
try {
  BlobImpl = Blob;
} catch {
  BlobImpl = require("buffer").Blob;
}

const router = Router();
const upload = multer();

if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY });
}

// Check for duplicate endpoints
const endpointSet = new Set<string>();
for (const feature of features) {
  if (endpointSet.has(feature.endpoint)) {
    throw new Error(`Duplicate endpoint found: ${feature.endpoint}`);
  }
  endpointSet.add(feature.endpoint);
}

async function falAiImageToVideo(req: Request, res: Response, prompt: string) {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    const customPrompt = req.body.prompt || prompt;
    if (!file) {
      res.status(400).json({ error: "Image file is required." });
      return;
    }
    const imageBuffer = file.buffer;
    const imageUrl = await fal.storage.upload(imageBuffer as any);
    const result = await fal.subscribe(
      "fal-ai/minimax/hailuo-02/standard/image-to-video",
      {
        input: {
          prompt: customPrompt,
          image_url: imageUrl,
          duration: 5,
        },
        logs: true,
      }
    );
    res.json(result.data);
  } catch (err: any) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
}

for (const feature of features) {
  router.post(
    `/${feature.endpoint}`,
    upload.single("image"),
    (req: Request, res: Response) => falAiImageToVideo(req, res, feature.prompt)
  );
}

export default router;
