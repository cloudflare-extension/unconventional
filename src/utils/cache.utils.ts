import { DefaultCacheTTL } from "../types/api.types";

export async function getCachedOrFetch<T>(cache: KVNamespace, key: string, fetchFn: () => Promise<T>, ttl: number = DefaultCacheTTL): Promise<T> {
  // Check cache first
  if (cache) {
    const cachedResponse = await cache.get(key);
    if (cachedResponse) {
      return JSON.parse(cachedResponse);
    }
  }

  // If not cached, fetch
  const response = await fetchFn();

  // Cache if successful
  if (response && cache) {
    try {
      await cache.put(key, JSON.stringify(response), { expirationTtl: ttl });
    } catch (error) {
      // Suppress cache errors (e.g. rate limiting) so response is still returned
    }
  }

  return response;
}