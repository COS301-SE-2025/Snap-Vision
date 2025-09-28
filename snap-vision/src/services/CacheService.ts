import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthorizationService from '../security/AuthorizationService';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  userId?: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  userSpecific?: boolean; // Whether cache is user-specific
  maxAge?: number; // Maximum age before forced refresh
}

export class CacheService {
  private static instance: CacheService;
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_MEMORY_ENTRIES = 100;
  private authService: AuthorizationService;

  private constructor() {
    this.authService = AuthorizationService.getInstance();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Generate cache key with authorization context
   */
  private async generateCacheKey(baseKey: string, userSpecific: boolean = false): Promise<string> {
    if (userSpecific) {
      const context = await this.authService.getCurrentUserContext();
      const userId = context?.userId || 'anonymous';
      const role = context?.role || 'user';
      const locations = context?.adminLocations?.join(',') || '';
      return `${baseKey}:${userId}:${role}:${locations}`;
    }
    return baseKey;
  }

  /**
   * Get data from cache (memory first, then AsyncStorage)
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const cacheKey = await this.generateCacheKey(key, options.userSpecific);
    //console.log("checking cache");
    
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      //console.log("from cache");
      return memoryEntry.data as T;
    }

    // Check AsyncStorage
    try {
      const stored = await AsyncStorage.getItem(cacheKey);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (entry.expiresAt > Date.now()) {
          // Restore to memory cache
          this.memoryCache.set(cacheKey, entry);
          this.cleanupMemoryCache();
          return entry.data;
        } else {
          // Expired, remove it
          await AsyncStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }

    return null;
  }

  /**
   * Set data in cache (both memory and AsyncStorage)
   */
  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || this.DEFAULT_TTL;
    const cacheKey = await this.generateCacheKey(key, options.userSpecific);
    const now = Date.now();

    //console.log("cache set");
    
    const context = await this.authService.getCurrentUserContext();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      userId: context?.userId,
    };

    // Set in memory cache
    this.memoryCache.set(cacheKey, entry);
    this.cleanupMemoryCache();

    // Set in AsyncStorage
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }

  /**
   * Remove specific cache entry
   */
  async remove(key: string, userSpecific: boolean = false): Promise<void> {
    const cacheKey = await this.generateCacheKey(key, userSpecific);
    
    this.memoryCache.delete(cacheKey);
    
    try {
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('Cache remove error:', error);
    }
  }

  /**
   * Clear all cache for current user
   */
  async clearUserCache(): Promise<void> {
    const context = await this.authService.getCurrentUserContext();
    if (!context) return;

    const userId = context.userId;
    
    // Clear memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.userId === userId) {
        this.memoryCache.delete(key);
      }
    }

    // Clear AsyncStorage cache
    try {
      const keys = await AsyncStorage.getAllKeys();
      const userKeys = keys.filter(key => key.includes(`:${userId}:`));
      await AsyncStorage.multiRemove(userKeys);
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    this.memoryCache.clear();
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.warn('Cache clear all error:', error);
    }
  }

  /**
   * Clean up memory cache to prevent memory leaks
   */
  private cleanupMemoryCache(): void {
    if (this.memoryCache.size <= this.MAX_MEMORY_ENTRIES) return;

    // Remove expired entries first
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }

    // If still too many entries, remove oldest ones
    if (this.memoryCache.size > this.MAX_MEMORY_ENTRIES) {
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, entries.length - this.MAX_MEMORY_ENTRIES);
      toRemove.forEach(([key]) => this.memoryCache.delete(key));
    }
  }

  /**
   * Get cache stats for debugging
   */
  getStats() {
    return {
      memorySize: this.memoryCache.size,
      maxMemoryEntries: this.MAX_MEMORY_ENTRIES,
    };
  }
}

export default CacheService;