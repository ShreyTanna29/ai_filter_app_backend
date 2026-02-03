"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIONS = exports.RESOURCES = void 0;
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const roles_1 = require("../middleware/roles");
const router = express_1.default.Router();
// Add debug middleware to this specific router
router.use((req, res, next) => {
    console.log("[DEBUG sub-admins router] Matched:", req.method, req.path);
    next();
});
// Resource types that can be assigned permissions
exports.RESOURCES = {
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
};
exports.ACTIONS = {
    CREATE: "CREATE",
    READ: "READ",
    UPDATE: "UPDATE",
    DELETE: "DELETE",
};
// Helper function to get or create admin user from token or API key
function getOrCreateAdminUser(req) {
    return __awaiter(this, void 0, void 0, function* () {
        const authHeader = req.headers.authorization;
        // Check for API key authentication first
        const apiKey = req.header("x-api-key") ||
            req.header("x-apikey") ||
            req.query.api_key ||
            req.query.apiKey;
        console.log("[DEBUG] getOrCreateAdminUser - apiKey:", apiKey);
        console.log("[DEBUG] getOrCreateAdminUser - headers:", JSON.stringify(req.headers));
        const adminKeys = [
            process.env.ADMIN_API_KEY,
            process.env["admin_api_key"],
            process.env.ADMIN_KEY,
            "supersecretadminkey12345", // Fallback hardcoded admin key
        ].filter(Boolean);
        console.log("[DEBUG] getOrCreateAdminUser - adminKeys:", adminKeys);
        console.log("[DEBUG] getOrCreateAdminUser - includes:", apiKey && adminKeys.includes(apiKey));
        // If using admin API key, get or create a system admin user
        if (apiKey && adminKeys.includes(apiKey)) {
            const systemAdminEmail = "system@admin.local";
            let user = yield prisma_1.default.user.findUnique({
                where: { email: systemAdminEmail },
            });
            if (!user) {
                user = yield prisma_1.default.user.create({
                    data: {
                        email: systemAdminEmail,
                        password: yield Promise.resolve().then(() => __importStar(require("bcrypt"))).then((bcrypt) => bcrypt.hash("admin123", 10)),
                        role: "admin",
                    },
                });
            }
            return user;
        }
        // Otherwise try Bearer token authentication
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        const token = authHeader.substring(7);
        try {
            const decoded = Buffer.from(token, "base64").toString("utf-8");
            const email = decoded.split(":")[0];
            // Try to find existing user
            let user = yield prisma_1.default.user.findUnique({
                where: { email: email.toLowerCase() },
            });
            // If user doesn't exist, create admin user
            if (!user) {
                user = yield prisma_1.default.user.create({
                    data: {
                        email: email.toLowerCase(),
                        password: yield Promise.resolve().then(() => __importStar(require("bcrypt"))).then((bcrypt) => bcrypt.hash("admin123", 10)), // Default password
                        role: "admin",
                    },
                });
            }
            return user;
        }
        catch (e) {
            return null;
        }
    });
}
// Create a new sub-admin (Admin only)
router.post("/", roles_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("[DEBUG] POST /api/sub-admins route handler reached");
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
        const adminUser = yield getOrCreateAdminUser(req);
        if (!adminUser) {
            res.status(401).json({ message: "Unauthorized: User not found" });
            return;
        }
        // Check if user already exists
        const existingUser = yield prisma_1.default.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (existingUser) {
            res.status(400).json({ message: "User with this email already exists" });
            return;
        }
        // Hash password
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // Create user and sub-admin in a transaction
        // Increase timeout to handle multiple permission operations
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Create user
            const user = yield tx.user.create({
                data: {
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    role: "sub-admin",
                },
            });
            // Create sub-admin record
            const subAdmin = yield tx.subAdmin.create({
                data: {
                    userId: user.id,
                    createdBy: (adminUser === null || adminUser === void 0 ? void 0 : adminUser.id) || 0, // Use 0 if admin user doesn't exist (API key auth)
                },
            });
            // If permissions are provided, create them
            if (permissions &&
                Array.isArray(permissions) &&
                permissions.length > 0) {
                // Validate permissions format
                for (const perm of permissions) {
                    if (!perm.resource || !perm.action) {
                        throw new Error("Each permission must have resource and action");
                    }
                }
                // Get or create permission records and link them
                for (const perm of permissions) {
                    // Find or create the permission
                    let permission = yield tx.permission.findUnique({
                        where: {
                            resource_action: {
                                resource: perm.resource,
                                action: perm.action,
                            },
                        },
                    });
                    if (!permission) {
                        permission = yield tx.permission.create({
                            data: {
                                resource: perm.resource,
                                action: perm.action,
                                description: perm.description ||
                                    `${perm.action} permission for ${perm.resource}`,
                            },
                        });
                    }
                    // Link permission to sub-admin
                    yield tx.subAdminPermission.create({
                        data: {
                            subAdminId: subAdmin.id,
                            permissionId: permission.id,
                        },
                    });
                }
            }
            return { user, subAdmin };
        }), {
            maxWait: 10000, // Maximum time to wait for transaction to start (10s)
            timeout: 30000, // Maximum time for the transaction to complete (30s)
        });
        // Fetch the created sub-admin with permissions
        const subAdminWithPermissions = yield prisma_1.default.subAdmin.findUnique({
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
    }
    catch (error) {
        console.error("Error creating sub-admin:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}));
// List all sub-admins (Admin only)
router.get("/", roles_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subAdmins = yield prisma_1.default.subAdmin.findMany({
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
    }
    catch (error) {
        console.error("Error fetching sub-admins:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Get a specific sub-admin (Admin only)
router.get("/:id", roles_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subAdminId = parseInt(req.params.id);
        if (isNaN(subAdminId)) {
            res.status(400).json({ message: "Invalid sub-admin ID" });
            return;
        }
        const subAdmin = yield prisma_1.default.subAdmin.findUnique({
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
    }
    catch (error) {
        console.error("Error fetching sub-admin:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Update sub-admin permissions (Admin only)
router.put("/:id/permissions", roles_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const subAdmin = yield prisma_1.default.subAdmin.findUnique({
            where: { id: subAdminId },
        });
        if (!subAdmin) {
            res.status(404).json({ message: "Sub-admin not found" });
            return;
        }
        // Update permissions in a transaction
        yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Delete existing permissions
            yield tx.subAdminPermission.deleteMany({
                where: { subAdminId },
            });
            // Add new permissions
            for (const perm of permissions) {
                // Find or create the permission
                let permission = yield tx.permission.findUnique({
                    where: {
                        resource_action: {
                            resource: perm.resource,
                            action: perm.action,
                        },
                    },
                });
                if (!permission) {
                    permission = yield tx.permission.create({
                        data: {
                            resource: perm.resource,
                            action: perm.action,
                            description: perm.description ||
                                `${perm.action} permission for ${perm.resource}`,
                        },
                    });
                }
                // Link permission to sub-admin
                yield tx.subAdminPermission.create({
                    data: {
                        subAdminId,
                        permissionId: permission.id,
                    },
                });
            }
        }), {
            maxWait: 10000, // Maximum time to wait for transaction to start (10s)
            timeout: 30000, // Maximum time for the transaction to complete (30s)
        });
        // Fetch updated sub-admin with permissions
        const updatedSubAdmin = yield prisma_1.default.subAdmin.findUnique({
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
    }
    catch (error) {
        console.error("Error updating sub-admin permissions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Toggle sub-admin active status (Admin only)
router.patch("/:id/status", roles_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const subAdmin = yield prisma_1.default.subAdmin.update({
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
    }
    catch (error) {
        console.error("Error updating sub-admin status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Delete a sub-admin (Admin only)
router.delete("/:id", roles_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subAdminId = parseInt(req.params.id);
        if (isNaN(subAdminId)) {
            res.status(400).json({ message: "Invalid sub-admin ID" });
            return;
        }
        const subAdmin = yield prisma_1.default.subAdmin.findUnique({
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
        yield prisma_1.default.user.delete({
            where: { id: subAdmin.userId },
        });
        res.json({ message: "Sub-admin deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting sub-admin:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Get all available permissions (Admin only)
router.get("/permissions/available", roles_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const permissions = yield prisma_1.default.permission.findMany({
            orderBy: [{ resource: "asc" }, { action: "asc" }],
        });
        res.json({ permissions });
    }
    catch (error) {
        console.error("Error fetching permissions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Initialize default permissions (Admin only) - useful for first-time setup
router.post("/permissions/initialize", roles_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const resources = Object.values(exports.RESOURCES);
        const actions = Object.values(exports.ACTIONS);
        const createdPermissions = [];
        for (const resource of resources) {
            for (const action of actions) {
                // Use upsert to avoid unique constraint errors
                const permission = yield prisma_1.default.permission.upsert({
                    where: {
                        resource_action: {
                            resource,
                            action,
                        },
                    },
                    update: {}, // Don't update if exists
                    create: {
                        resource,
                        action,
                        description: `${action} permission for ${resource}`,
                    },
                });
                createdPermissions.push(permission);
            }
        }
        res.json({
            message: "Permissions initialized successfully",
            created: createdPermissions.length,
            permissions: createdPermissions,
        });
    }
    catch (error) {
        console.error("Error initializing permissions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
exports.default = router;
