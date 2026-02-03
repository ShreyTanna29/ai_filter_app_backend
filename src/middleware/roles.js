"use strict";
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
exports.ROLES = void 0;
exports.requireRole = requireRole;
exports.requireAdmin = requireAdmin;
exports.requirePermission = requirePermission;
exports.requireAdminOrSubAdmin = requireAdminOrSubAdmin;
const prisma_1 = __importDefault(require("../lib/prisma"));
exports.ROLES = {
    ADMIN: "admin",
    SUB_ADMIN: "sub-admin",
    RESELLER: "reseller",
    USER: "user",
};
// Helper function to get user from token
function getUserFromToken(authHeader) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        const token = authHeader.substring(7);
        try {
            const decoded = Buffer.from(token, "base64").toString("utf-8");
            const email = decoded.split(":")[0];
            const user = yield prisma_1.default.user.findUnique({
                where: { email: email.toLowerCase() },
                include: {
                    subAdmin: {
                        include: {
                            permissions: {
                                include: {
                                    permission: true,
                                },
                            },
                        },
                    },
                },
            });
            return user;
        }
        catch (e) {
            return null;
        }
    });
}
// Legacy session-based role check (optional, kept for compatibility)
function requireRole(role) {
    return (req, res, next) => {
        // @ts-ignore - session.user may not be typed in express-session
        if (req.session && req.session.user && req.session.user.role === role) {
            next();
            return;
        }
        res.status(403).json({ message: "Forbidden: insufficient role" });
    };
}
// Middleware to require admin role based on token in Authorization header
function requireAdmin(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                res.status(401).json({ message: "Unauthorized: No token provided" });
                return;
            }
            // Extract email from simple token (format: base64 encoded "email:timestamp")
            const token = authHeader.substring(7);
            let email;
            try {
                const decoded = Buffer.from(token, "base64").toString("utf-8");
                email = decoded.split(":")[0];
            }
            catch (e) {
                res.status(401).json({ message: "Unauthorized: Invalid token" });
                return;
            }
            // Look up user in database
            const user = yield prisma_1.default.user.findUnique({
                where: { email: email.toLowerCase() },
            });
            if (!user) {
                res.status(401).json({ message: "Unauthorized: User not found" });
                return;
            }
            // Check if user has admin role
            if (user.role !== "admin") {
                res.status(403).json({ message: "Forbidden: Admin access required" });
                return;
            }
            // User is admin, proceed
            next();
        }
        catch (error) {
            console.error("requireAdmin middleware error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
}
// Middleware to require admin OR sub-admin with specific permission
function requirePermission(resource, action) {
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        try {
            const user = yield getUserFromToken(req.headers.authorization);
            if (!user) {
                res.status(401).json({ message: "Unauthorized: User not found" });
                return;
            }
            // Admins have all permissions
            if (user.role === "admin") {
                next();
                return;
            }
            // Check if user is a sub-admin
            if (user.role !== "sub-admin" || !user.subAdmin) {
                res
                    .status(403)
                    .json({ message: "Forbidden: Insufficient permissions" });
                return;
            }
            // Check if sub-admin is active
            if (!user.subAdmin.isActive) {
                res
                    .status(403)
                    .json({ message: "Forbidden: Sub-admin account is inactive" });
                return;
            }
            // Check if sub-admin has the required permission
            const hasPermission = user.subAdmin.permissions.some((sp) => sp.permission.resource === resource &&
                sp.permission.action === action);
            if (!hasPermission) {
                res.status(403).json({
                    message: "Forbidden: You don't have permission to perform this action",
                    required: { resource, action },
                });
                return;
            }
            // Sub-admin has permission, proceed
            next();
        }
        catch (error) {
            console.error("requirePermission middleware error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
}
// Middleware to require admin or active sub-admin (any permission)
function requireAdminOrSubAdmin(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const user = yield getUserFromToken(req.headers.authorization);
            if (!user) {
                res.status(401).json({ message: "Unauthorized: User not found" });
                return;
            }
            // Admins always pass
            if (user.role === "admin") {
                next();
                return;
            }
            // Check if user is a sub-admin
            if (user.role === "sub-admin" && user.subAdmin) {
                // Check if sub-admin is active
                if (!user.subAdmin.isActive) {
                    res
                        .status(403)
                        .json({ message: "Forbidden: Sub-admin account is inactive" });
                    return;
                }
                next();
                return;
            }
            res
                .status(403)
                .json({ message: "Forbidden: Admin or sub-admin access required" });
        }
        catch (error) {
            console.error("requireAdminOrSubAdmin middleware error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
}
