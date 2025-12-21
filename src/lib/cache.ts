import prisma from "./prisma";

// Cache for features and apps with permissions
let featuresCache: any[] = [];
let appsWithPermissionsCache: any[] = [];
let featuresCacheTimestamp = 0;
const FEATURES_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Initialize cache on server start
export async function initializeFeaturesCache() {
  try {
    console.log("[CACHE] Initializing features cache...");
    const [features, apps] = await Promise.all([
      prisma.features.findMany({
        orderBy: { createdAt: "asc" },
      }),
      prisma.app.findMany({
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
    console.log(
      `[CACHE] Cached ${features.length} features and ${apps.length} apps`
    );
  } catch (error) {
    console.error("[CACHE] Error initializing features cache:", error);
  }
}

// Refresh cache if expired
export async function ensureFeaturesCache() {
  if (Date.now() - featuresCacheTimestamp > FEATURES_CACHE_TTL) {
    await initializeFeaturesCache();
  }
}

// Invalidate cache (call when features or app permissions change)
export function invalidateFeaturesCache() {
  featuresCacheTimestamp = 0;
  console.log("[CACHE] Features cache invalidated");
}

// Get cached features
export function getFeaturesCache() {
  return featuresCache;
}

// Get cached apps with permissions
export function getAppsWithPermissionsCache() {
  return appsWithPermissionsCache;
}
