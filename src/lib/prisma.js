"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const prisma_1 = require("../generated/prisma");
// Create a single shared PrismaClient instance
// This prevents connection pool exhaustion
const globalForPrisma = global;
exports.prisma = globalForPrisma.prisma ||
    new prisma_1.PrismaClient({
        log: ["error", "warn"],
        // Add connection pool timeout configuration
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = exports.prisma;
exports.default = exports.prisma;
