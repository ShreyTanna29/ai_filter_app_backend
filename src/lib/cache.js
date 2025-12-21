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
exports.initializeFeaturesCache = initializeFeaturesCache;
exports.ensureFeaturesCache = ensureFeaturesCache;
exports.invalidateFeaturesCache = invalidateFeaturesCache;
exports.getFeaturesCache = getFeaturesCache;
exports.getAppsWithPermissionsCache = getAppsWithPermissionsCache;
const prisma_1 = __importDefault(require("./prisma"));
// Cache for features and apps with permissions
let featuresCache = [];
let appsWithPermissionsCache = [];
let featuresCacheTimestamp = 0;
const FEATURES_CACHE_TTL = 60 * 60 * 1000; // 1 hour
// Initialize cache on server start
function initializeFeaturesCache() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("[CACHE] Initializing features cache...");
            const [features, apps] = yield Promise.all([
                prisma_1.default.features.findMany({
                    orderBy: { createdAt: "asc" },
                }),
                prisma_1.default.app.findMany({
                    where: { isActive: true },
                    include: {
                        allowedFeatures: {
                            include: {
                                feature: true,
                            },
                        },
                    },
                }),
            ]);
            featuresCache = features;
            appsWithPermissionsCache = apps;
            featuresCacheTimestamp = Date.now();
            console.log(`[CACHE] Cached ${features.length} features and ${apps.length} apps`);
        }
        catch (error) {
            console.error("[CACHE] Error initializing features cache:", error);
        }
    });
}
// Refresh cache if expired
function ensureFeaturesCache() {
    return __awaiter(this, void 0, void 0, function* () {
        if (Date.now() - featuresCacheTimestamp > FEATURES_CACHE_TTL) {
            yield initializeFeaturesCache();
        }
    });
}
// Invalidate cache (call when features or app permissions change)
function invalidateFeaturesCache() {
    featuresCacheTimestamp = 0;
    console.log("[CACHE] Features cache invalidated");
}
// Get cached features
function getFeaturesCache() {
    return featuresCache;
}
// Get cached apps with permissions
function getAppsWithPermissionsCache() {
    return appsWithPermissionsCache;
}
