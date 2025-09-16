interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
}

interface CacheStats {
  memoryEntries: number;
  storageEntries: number;
  hitRate: number;
  oldestEntry?: number;
  newestEntry?: number;
}

export class EnhancedCache<T> {
  private memoryCache = new Map<string, CacheEntry<T>>();
  private readonly prefix: string;
  private readonly ttl: number;
  private readonly maxMemoryEntries: number;
  private totalHits = 0;
  private totalMisses = 0;

  constructor(prefix: string, ttl: number, maxMemoryEntries = 1000) {
    this.prefix = prefix;
    this.ttl = ttl;
    this.maxMemoryEntries = maxMemoryEntries;
  }

  private getStorageKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  get(key: string): T | null {
    const now = Date.now();
    
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && (now - memoryEntry.timestamp <= this.ttl)) {
      memoryEntry.hits++;
      this.totalHits++;
      return memoryEntry.value;
    }

    // Try localStorage
    try {
      const storageKey = this.getStorageKey(key);
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CacheEntry<T>;
        if (now - parsed.timestamp <= this.ttl) {
          // Warm memory cache
          this.set(key, parsed.value);
          this.totalHits++;
          return parsed.value;
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.warn(`Cache localStorage error for key ${key}:`, error);
    }

    this.totalMisses++;
    return null;
  }

  set(key: string, value: T): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      hits: 0
    };

    // Memory cache with LRU eviction
    if (this.memoryCache.size >= this.maxMemoryEntries) {
      this.evictLeastRecentlyUsed();
    }
    this.memoryCache.set(key, entry);

    // Persistent storage (fire and forget)
    try {
      const storageKey = this.getStorageKey(key);
      localStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (error) {
      console.warn(`Cache localStorage write error for key ${key}:`, error);
      // If storage is full, try to clean up old entries
      this.cleanupStorage();
    }
  }

  delete(key: string): void {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(this.getStorageKey(key));
    } catch {}
  }

  clear(): void {
    this.memoryCache.clear();
    this.clearStorage();
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    let lowestHits = Infinity;

    for (const [key, entry] of this.memoryCache) {
      if (entry.timestamp < oldestTime || 
         (entry.timestamp === oldestTime && entry.hits < lowestHits)) {
        oldestTime = entry.timestamp;
        lowestHits = entry.hits;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }

  private cleanupStorage(): void {
    try {
      const keysToRemove: string[] = [];
      const now = Date.now();
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const entry = JSON.parse(raw) as CacheEntry<T>;
              if (now - entry.timestamp > this.ttl) {
                keysToRemove.push(key);
              }
            }
          } catch {}
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }

  private clearStorage(): void {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch {}
  }

  getStats(): CacheStats {
    const now = Date.now();
    let oldestEntry: number | undefined;
    let newestEntry: number | undefined;
    
    for (const entry of this.memoryCache.values()) {
      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (!newestEntry || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    }

    let storageEntries = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          storageEntries++;
        }
      }
    } catch {}

    const totalRequests = this.totalHits + this.totalMisses;
    const hitRate = totalRequests > 0 ? this.totalHits / totalRequests : 0;

    return {
      memoryEntries: this.memoryCache.size,
      storageEntries,
      hitRate,
      oldestEntry,
      newestEntry
    };
  }
}

// Pre-configured cache instances
export const priceCache = new EnhancedCache<number>('reflector_price', 5 * 60 * 1000, 500);
export const assetListCache = new EnhancedCache<string[]>('reflector_assets', 24 * 60 * 60 * 1000, 10);
export const fxRateCache = new EnhancedCache<number>('reflector_fx', 5 * 60 * 1000, 100);