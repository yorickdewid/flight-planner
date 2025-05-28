/**
 * A generic LRU cache service.
 */
export class CacheService<K, V> {
  private cache: Map<K, V> = new Map();
  private accessOrder: K[] = [];
  private maxCacheSize: number;

  /**
   * Creates a new instance of the CacheService class.
   * 
   * @param maxCacheSize - Maximum number of items to keep in the cache (default: 1000).
   */
  constructor(maxCacheSize: number = 1_000) {
    this.maxCacheSize = Math.max(1, maxCacheSize);
  }

  /**
   * Retrieves an item from the cache.
   * 
   * @param key - The key of the item to retrieve.
   * @returns The cached item, or undefined if not found.
   */
  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (item) {
      this.updateAccessOrder(key);
    }
    return item;
  }

  /**
   * Adds or updates an item in the cache.
   * 
   * @param key - The key of the item to add or update.
   * @param value - The item to cache.
   */
  set(key: K, value: V): void {
    this.cache.set(key, value);
    this.updateAccessOrder(key);
    this.enforceCacheLimit();
  }

  /**
   * Checks if an item exists in the cache.
   * 
   * @param key - The key of the item to check.
   * @returns True if the item exists, false otherwise.
   */
  has(key: K): boolean {
    return this.cache.has(key);
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
   * 
   * @returns An array of keys.
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Returns an array of values in the cache.
   * 
   * @returns An array of values.
   */
  values(): V[] {
    return Array.from(this.cache.values());
  }

  /**
   * Clears all items from the cache.
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
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
