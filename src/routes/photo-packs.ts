import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { signKey, deriveKey } from "../middleware/signedUrl";
import { uploadBuffer, makeKey } from "../lib/s3";

const router = Router();

// Get all photo packs
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const packs = await prisma.photo_Pack.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        prompts: {
          orderBy: { order: "asc" },
        },
        images: {
          orderBy: { createdAt: "desc" },
          take: 6, // Only get first 6 images for preview
        },
        _count: {
          select: { images: true },
        },
      },
    });

    // Sign image URLs for access
    const packsWithSignedUrls = await Promise.all(
      packs.map(async (pack) => {
        const signedImages = await Promise.all(
          pack.images.map(async (img) => {
            let signedUrl = img.url;
            try {
              if (img.url && /amazonaws\.com\//.test(img.url)) {
                signedUrl = await signKey(deriveKey(img.url));
              }
            } catch {}
            return { ...img, signedUrl };
          })
        );
        return {
          ...pack,
          images: signedImages,
          imageCount: pack._count.images,
        };
      })
    );

    res.json({
      success: true,
      packs: packsWithSignedUrls,
    });
  } catch (error) {
    console.error("Error fetching photo packs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch photo packs",
    });
  }
});

// Get a single photo pack with all images
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid pack ID",
      });
      return;
    }

    const pack = await prisma.photo_Pack.findUnique({
      where: { id },
      include: {
        prompts: {
          orderBy: { order: "asc" },
        },
        images: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!pack) {
      res.status(404).json({
        success: false,
        message: "Photo pack not found",
      });
      return;
    }

    // Sign image URLs for access
    const signedImages = await Promise.all(
      pack.images.map(async (img) => {
        let signedUrl = img.url;
        try {
          if (img.url && /amazonaws\.com\//.test(img.url)) {
            signedUrl = await signKey(deriveKey(img.url));
          }
        } catch {}
        return { ...img, signedUrl };
      })
    );

    res.json({
      success: true,
      pack: {
        ...pack,
        images: signedImages,
      },
    });
  } catch (error) {
    console.error("Error fetching photo pack:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch photo pack",
    });
  }
});

// Create a new photo pack
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, emoji, photoCount, prompts } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        message: "Name is required",
      });
      return;
    }

    const pack = await prisma.photo_Pack.create({
      data: {
        name,
        description: description || null,
        emoji: emoji || "📸",
        photoCount: photoCount || 15,
        isActive: true,
        ...(prompts && Array.isArray(prompts) && prompts.length > 0
          ? {
              prompts: {
                create: prompts.map((prompt: string, index: number) => ({
                  prompt,
                  order: index,
                })),
              },
            }
          : {}),
      },
      include: {
        prompts: {
          orderBy: { order: "asc" },
        },
      },
    });

    res.status(201).json({
      success: true,
      pack,
    });
  } catch (error) {
    console.error("Error creating photo pack:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create photo pack",
    });
  }
});

// Update a photo pack
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid pack ID",
      });
      return;
    }

    const { name, description, emoji, photoCount, isActive, prompts } =
      req.body;

    // Update the pack and optionally replace prompts
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (emoji !== undefined) updateData.emoji = emoji;
    if (photoCount !== undefined) updateData.photoCount = photoCount;
    if (isActive !== undefined) updateData.isActive = isActive;

    // If prompts are provided, replace all existing prompts
    if (prompts && Array.isArray(prompts)) {
      // Delete existing prompts
      await prisma.photo_Pack_Prompt.deleteMany({
        where: { packId: id },
      });

      // Create new prompts
      await prisma.photo_Pack_Prompt.createMany({
        data: prompts.map((prompt: string, index: number) => ({
          packId: id,
          prompt,
          order: index,
        })),
      });
    }

    const pack = await prisma.photo_Pack.update({
      where: { id },
      data: updateData,
      include: {
        prompts: {
          orderBy: { order: "asc" },
        },
        images: {
          orderBy: { createdAt: "desc" },
          take: 6,
        },
      },
    });

    res.json({
      success: true,
      pack,
    });
  } catch (error: any) {
    console.error("Error updating photo pack:", error);
    if (error.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "Photo pack not found",
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Failed to update photo pack",
    });
  }
});

// Delete a photo pack
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid pack ID",
      });
      return;
    }

    await prisma.photo_Pack.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Photo pack deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting photo pack:", error);
    if (error.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "Photo pack not found",
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Failed to delete photo pack",
    });
  }
});

// Add generated images to a photo pack
router.post(
  "/:id/images",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid pack ID",
        });
        return;
      }

      const { urls } = req.body;
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        res.status(400).json({
          success: false,
          message: "Image URLs array is required",
        });
        return;
      }

      // Verify pack exists
      const pack = await prisma.photo_Pack.findUnique({
        where: { id },
      });

      if (!pack) {
        res.status(404).json({
          success: false,
          message: "Photo pack not found",
        });
        return;
      }

      // Download images and upload to S3
      const s3Urls: string[] = [];
      for (const url of urls) {
        try {
          // Download the image
          const response = await fetch(url);
          if (!response.ok) {
            console.error(`Failed to download image: ${url}`);
            continue;
          }

          const buffer = Buffer.from(await response.arrayBuffer());
          const contentType =
            response.headers.get("content-type") || "image/png";

          // Generate S3 key
          const key = makeKey({
            type: "image",
            feature: `photo-pack-${id}`,
          });

          // Upload to S3
          const result = await uploadBuffer(key, buffer, contentType);
          s3Urls.push(result.url);
        } catch (err) {
          console.error("Error uploading image to S3:", err);
        }
      }

      if (s3Urls.length === 0) {
        res.status(500).json({
          success: false,
          message: "Failed to upload any images to storage",
        });
        return;
      }

      // Create image records with S3 URLs
      const images = await prisma.photo_Pack_Image.createMany({
        data: s3Urls.map((url: string) => ({
          packId: id,
          url,
        })),
      });

      res.status(201).json({
        success: true,
        message: `Added ${images.count} images to pack`,
        count: images.count,
      });
    } catch (error) {
      console.error("Error adding images to pack:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add images to pack",
      });
    }
  }
);

// Delete an image from a photo pack
router.delete(
  "/:id/images/:imageId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const packId = parseInt(req.params.id);
      const imageId = parseInt(req.params.imageId);

      if (isNaN(packId) || isNaN(imageId)) {
        res.status(400).json({
          success: false,
          message: "Invalid pack or image ID",
        });
        return;
      }

      await prisma.photo_Pack_Image.delete({
        where: {
          id: imageId,
          packId: packId,
        },
      });

      res.json({
        success: true,
        message: "Image deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting image:", error);
      if (error.code === "P2025") {
        res.status(404).json({
          success: false,
          message: "Image not found",
        });
        return;
      }
      res.status(500).json({
        success: false,
        message: "Failed to delete image",
      });
    }
  }
);

export default router;
