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
    await cache.put(key, JSON.stringify(response), { expirationTtl: ttl });
  }

  return response;
}