/**
 * Startup configuration and optimization settings
 */

export const STARTUP_CONFIG = {
  // Data prefetching
  prefetch: {
    enabled: true,
    timeout: 3000, // Maximum time to wait for prefetch (ms)
    criticalDataOnly: true, // Only prefetch critical data on startup
  },

  // Caching
  cache: {
    images: {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    data: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },

  // Performance
  performance: {
    enableMonitoring: __DEV__, // Only in development
    logSlowOperations: true,
    slowOperationThreshold: 1000, // ms
  },

  // Network
  network: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second base delay
  },

  // Lazy loading
  lazyLoading: {
    enabled: true,
    preloadDelay: 2000, // Delay before preloading non-critical screens (ms)
  },

  // Bundle optimization
  bundle: {
    splitChunks: true,
    minifyEnabled: !__DEV__,
  },
};

/**
 * Get startup configuration based on environment
 */
export function getStartupConfig() {
  return STARTUP_CONFIG;
}

/**
 * Update startup configuration at runtime
 */
export function updateStartupConfig(updates: Partial<typeof STARTUP_CONFIG>) {
  Object.assign(STARTUP_CONFIG, updates);
}
