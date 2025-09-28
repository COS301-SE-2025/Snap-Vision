import CacheService from '../services/CacheService';

const cacheService = CacheService.getInstance();

/**
 * Clear all location-related caches
 */
export const clearLocationCaches = async (locationId: string) => {
  const patterns = [
    `buildings:${locationId}`,
    `floors:${locationId}:`,
    `rooms:${locationId}:`,
    `paths:${locationId}:`,
    `qr_codes:${locationId}:`,
  ];

  // This is a simplified approach - in a production app you might want
  // to keep track of cache keys more systematically
  await cacheService.remove(`buildings:${locationId}`);
  // Note: AsyncStorage doesn't support pattern matching, so you'd need
  // to implement a more sophisticated cache key tracking system
};

/**
 * Clear building-related caches
 */
export const clearBuildingCaches = async (locationId: string, buildingId: string) => {
  await cacheService.remove(`floors:${locationId}:${buildingId}`);
  await cacheService.remove(`rooms:${locationId}:${buildingId}`);
  await cacheService.remove(`paths:${locationId}:${buildingId}`);
  await cacheService.remove(`qr_codes:${locationId}:${buildingId}`, true);
};

/**
 * Clear user-specific caches (useful on logout)
 */
export const clearUserCaches = async () => {
  await cacheService.clearUserCache();
};

/**
 * Clear all caches
 */
export const clearAllCaches = async () => {
  await cacheService.clearAll();
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return cacheService.getStats();
};