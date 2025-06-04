/**
 * A generic LRU cache service with TTL support.
 */
export class CacheService<K, V> {
  private cache: Map<K, { value: V; expiry: number | null }> = new Map();
  private accessOrder: K[] = [];
  private maxCacheSize: number;
  private defaultTTL: number | null;

  /**
   * Creates a new instance of the CacheService class.
   * 
   * @param maxCacheSize - Maximum number of items to keep in the cache (default: 1000).
   * @param defaultTTL - Default time-to-live in milliseconds, or null for no expiry (default: null).
   */
  constructor(maxCacheSize: number = 1_000, defaultTTL: number | null = null) {
    this.maxCacheSize = Math.max(1, maxCacheSize);
    this.defaultTTL = defaultTTL;
  }

  /**
   * Retrieves an item from the cache.
   * 
   * @param key - The key of the item to retrieve.
   * @returns The cached item, or undefined if not found or expired.
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiry !== null && entry.expiry < Date.now()) {
      this.delete(key);
      return undefined;
    }

    this.updateAccessOrder(key);
    return entry.value;
  }

  /**
   * Adds or updates an item in the cache.
   * 
   * @param key - The key of the item to add or update.
   * @param value - The item to cache.
   * @param ttl - Time-to-live in milliseconds, or null for no expiry. Uses defaultTTL if not specified.
   */
  set(key: K, value: V, ttl?: number | null): void {
    let expiry: number | null = null;

    if (ttl !== undefined) {
      expiry = ttl !== null ? Date.now() + ttl : null;
    } else if (this.defaultTTL !== null) {
      expiry = Date.now() + this.defaultTTL;
    }

    this.cache.set(key, { value, expiry });
    this.updateAccessOrder(key);
    this.enforceCacheLimit();
  }

  /**
   * Checks if an item exists in the cache and is not expired.
   * 
   * @param key - The key of the item to check.
   * @returns True if the item exists and is not expired, false otherwise.
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (entry.expiry !== null && entry.expiry < Date.now()) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Deletes an item from the cache.
   * 
   * @param key - The key of the item to delete.
   */
  delete(key: K): void {
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Returns an array of keys in the cache.
   * This does not check for expired items.
   * 
   * @returns An array of keys.
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Returns an array of values in the cache.
   * This does not check for expired items.
   * 
   * @returns An array of values.
   */
  values(): V[] {
    return Array.from(this.cache.values()).map(entry => entry.value);
  }

  /**
   * Clears all items from the cache.
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Removes all expired items from the cache.
   * 
   * @returns The number of items removed.
   */
  cleanExpired(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry !== null && entry.expiry < now) {
        this.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Updates the access order for the LRU cache.
   * @param key - The key that was accessed.
   */
  private updateAccessOrder(key: K): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Enforces the cache size limit by removing least recently used items.
   */
  private enforceCacheLimit(): void {
    while (this.cache.size > this.maxCacheSize && this.accessOrder.length > 0) {
      const leastUsedKey = this.accessOrder.shift();
      if (leastUsedKey) {
        this.cache.delete(leastUsedKey);
      }
    }
  }
}
