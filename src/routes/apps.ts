import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import crypto from "crypto";
import { Prisma } from "@prisma/client";

const router = Router();

function generateApiKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

// List apps (requires API key)
router.get("/", async (req: Request, res: Response) => {
  const apps = await prisma.app.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ success: true, apps });
});

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

export default router;
