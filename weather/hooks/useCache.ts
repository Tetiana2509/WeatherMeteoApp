import { useState, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheConfig {
  ttlMinutes?: number; // Time to live in minutes, default 5
}

type CacheKey = string | object;

export function useCache<T>(config: CacheConfig = {}) {
  const { ttlMinutes = 5 } = config;
  const [cache, setCache] = useState<Record<string, CacheEntry<T>>>({});

  // Convert key to string for internal storage
  const keyToString = useCallback((key: CacheKey): string => {
    if (typeof key === 'string') {
      return key;
    }
    // For objects, create a deterministic string representation
    return JSON.stringify(key, Object.keys(key).sort());
  }, []);

  const getCachedData = useCallback((key: CacheKey): T | null => {
    const stringKey = keyToString(key);
    const entry = cache[stringKey];
    if (!entry) return null;

    const now = Date.now();
    const isExpired = now - entry.timestamp > ttlMinutes * 60 * 1000;
    
    if (isExpired) {
      // Remove expired entry
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache[stringKey];
        return newCache;
      });
      return null;
    }

    return entry.data;
  }, [cache, ttlMinutes, keyToString]);

  const setCachedData = useCallback((key: CacheKey, data: T) => {
    const stringKey = keyToString(key);
    setCache(prev => ({
      ...prev,
      [stringKey]: {
        data,
        timestamp: Date.now()
      }
    }));
  }, [keyToString]);

  const clearCache = useCallback(() => {
    setCache({});
  }, []);

  const executeWithCache = useCallback(async (
    key: CacheKey,
    requestFunction: () => Promise<T>,
    forceRefresh: boolean = false
  ): Promise<T> => {
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedData = getCachedData(key);
      if (cachedData !== null) {
        return cachedData;
      }
    }

    // Execute request and cache result
    const data = await requestFunction();
    setCachedData(key, data);
    return data;
  }, [getCachedData, setCachedData]);

  return {
    getCachedData,
    setCachedData,
    clearCache,
    executeWithCache
  };
}
