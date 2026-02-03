import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/roles";

const router = express.Router();

// Resource types that can be assigned permissions
export const RESOURCES = {
  TEMPLATES: "templates",
  VIDEO_FILTERS: "video_filters",
  PHOTO_FILTERS: "photo_filters",
  CATEGORIES: "categories",
  PHOTO_CATEGORIES: "photo_categories",
  APPS: "apps",
  GENERATED_VIDEOS: "generated_videos",
  GENERATED_PHOTOS: "generated_photos",
  PHOTO_PACKS: "photo_packs",
  CARTOON_CHARACTERS: "cartoon_characters",
  PHOTO_TEMPLATES: "photo_templates",
} as const;

export const ACTIONS = {
  CREATE: "CREATE",
  READ: "READ",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
} as const;

// Helper function to get or create admin user from token
async function getOrCreateAdminUser(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const email = decoded.split(":")[0];

    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // If user doesn't exist, create admin user
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: await import("bcrypt").then((bcrypt) =>
            bcrypt.hash("admin123", 10),
          ), // Default password
          role: "admin",
        },
      });
    }

    return user;
  } catch (e) {
    return null;
  }
}

// Create a new sub-admin (Admin only)
router.post("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { email, password, permissions } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ message: "Invalid email format" });
      return;
    }

    // Get or create the admin user creating this sub-admin
    const adminUser = await getOrCreateAdminUser(req.headers.authorization);
    if (!adminUser) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      res.status(400).json({ message: "User with this email already exists" });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and sub-admin in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          role: "sub-admin",
        },
      });

      // Create sub-admin record
      const subAdmin = await tx.subAdmin.create({
        data: {
          userId: user.id,
          createdBy: adminUser.id,
        },
      });

      // If permissions are provided, create them
      if (permissions && Array.isArray(permissions) && permissions.length > 0) {
        // Validate permissions format
        for (const perm of permissions) {
          if (!perm.resource || !perm.action) {
            throw new Error("Each permission must have resource and action");
          }
        }

        // Get or create permission records and link them
        for (const perm of permissions) {
          // Find or create the permission
          let permission = await tx.permission.findUnique({
            where: {
              resource_action: {
                resource: perm.resource,
                action: perm.action,
              },
            },
          });

          if (!permission) {
            permission = await tx.permission.create({
              data: {
                resource: perm.resource,
                action: perm.action,
                description:
                  perm.description ||
                  `${perm.action} permission for ${perm.resource}`,
              },
            });
          }

          // Link permission to sub-admin
          await tx.subAdminPermission.create({
            data: {
              subAdminId: subAdmin.id,
              permissionId: permission.id,
            },
          });
        }
      }

      return { user, subAdmin };
    });

    // Fetch the created sub-admin with permissions
    const subAdminWithPermissions = await prisma.subAdmin.findUnique({
      where: { id: result.subAdmin.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    res.status(201).json({
      message: "Sub-admin created successfully",
      subAdmin: subAdminWithPermissions,
    });
  } catch (error) {
    console.error("Error creating sub-admin:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// List all sub-admins (Admin only)
router.get("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const subAdmins = await prisma.subAdmin.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ subAdmins });
  } catch (error) {
    console.error("Error fetching sub-admins:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get a specific sub-admin (Admin only)
router.get("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const subAdminId = parseInt(req.params.id);

    if (isNaN(subAdminId)) {
      res.status(400).json({ message: "Invalid sub-admin ID" });
      return;
    }

    const subAdmin = await prisma.subAdmin.findUnique({
      where: { id: subAdminId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!subAdmin) {
      res.status(404).json({ message: "Sub-admin not found" });
      return;
    }

    res.json({ subAdmin });
  } catch (error) {
    console.error("Error fetching sub-admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update sub-admin permissions (Admin only)
router.put(
  "/:id/permissions",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const subAdminId = parseInt(req.params.id);
      const { permissions } = req.body;

      if (isNaN(subAdminId)) {
        res.status(400).json({ message: "Invalid sub-admin ID" });
        return;
      }

      if (!permissions || !Array.isArray(permissions)) {
        res.status(400).json({ message: "Permissions must be an array" });
        return;
      }

      // Validate permissions format
      for (const perm of permissions) {
        if (!perm.resource || !perm.action) {
          res
            .status(400)
            .json({ message: "Each permission must have resource and action" });
          return;
        }
      }

      const subAdmin = await prisma.subAdmin.findUnique({
        where: { id: subAdminId },
      });

      if (!subAdmin) {
        res.status(404).json({ message: "Sub-admin not found" });
        return;
      }

      // Update permissions in a transaction
      await prisma.$transaction(async (tx) => {
        // Delete existing permissions
        await tx.subAdminPermission.deleteMany({
          where: { subAdminId },
        });

        // Add new permissions
        for (const perm of permissions) {
          // Find or create the permission
          let permission = await tx.permission.findUnique({
            where: {
              resource_action: {
                resource: perm.resource,
                action: perm.action,
              },
            },
          });

          if (!permission) {
            permission = await tx.permission.create({
              data: {
                resource: perm.resource,
                action: perm.action,
                description:
                  perm.description ||
                  `${perm.action} permission for ${perm.resource}`,
              },
            });
          }

          // Link permission to sub-admin
          await tx.subAdminPermission.create({
            data: {
              subAdminId,
              permissionId: permission.id,
            },
          });
        }
      });

      // Fetch updated sub-admin with permissions
      const updatedSubAdmin = await prisma.subAdmin.findUnique({
        where: { id: subAdminId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      res.json({
        message: "Permissions updated successfully",
        subAdmin: updatedSubAdmin,
      });
    } catch (error) {
      console.error("Error updating sub-admin permissions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Toggle sub-admin active status (Admin only)
router.patch(
  "/:id/status",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const subAdminId = parseInt(req.params.id);
      const { isActive } = req.body;

      if (isNaN(subAdminId)) {
        res.status(400).json({ message: "Invalid sub-admin ID" });
        return;
      }

      if (typeof isActive !== "boolean") {
        res.status(400).json({ message: "isActive must be a boolean" });
        return;
      }

      const subAdmin = await prisma.subAdmin.update({
        where: { id: subAdminId },
        data: { isActive },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      res.json({
        message: "Sub-admin status updated successfully",
        subAdmin,
      });
    } catch (error) {
      console.error("Error updating sub-admin status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Delete a sub-admin (Admin only)
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const subAdminId = parseInt(req.params.id);

    if (isNaN(subAdminId)) {
      res.status(400).json({ message: "Invalid sub-admin ID" });
      return;
    }

    const subAdmin = await prisma.subAdmin.findUnique({
      where: { id: subAdminId },
      include: {
        user: true,
      },
    });

    if (!subAdmin) {
      res.status(404).json({ message: "Sub-admin not found" });
      return;
    }

    // Delete sub-admin (cascade will delete permissions and user)
    await prisma.user.delete({
      where: { id: subAdmin.userId },
    });

    res.json({ message: "Sub-admin deleted successfully" });
  } catch (error) {
    console.error("Error deleting sub-admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get all available permissions (Admin only)
router.get(
  "/permissions/available",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const permissions = await prisma.permission.findMany({
        orderBy: [{ resource: "asc" }, { action: "asc" }],
      });

      res.json({ permissions });
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Initialize default permissions (Admin only) - useful for first-time setup
router.post(
  "/permissions/initialize",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const resources = Object.values(RESOURCES);
      const actions = Object.values(ACTIONS);

      const createdPermissions = [];

      for (const resource of resources) {
        for (const action of actions) {
          const existing = await prisma.permission.findUnique({
            where: {
              resource_action: {
                resource,
                action,
              },
            },
          });

          if (!existing) {
            const permission = await prisma.permission.create({
              data: {
                resource,
                action,
                description: `${action} permission for ${resource}`,
              },
            });
            createdPermissions.push(permission);
          }
        }
      }

      res.json({
        message: "Permissions initialized successfully",
        created: createdPermissions.length,
        permissions: createdPermissions,
      });
    } catch (error) {
      console.error("Error initializing permissions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

export default router;
