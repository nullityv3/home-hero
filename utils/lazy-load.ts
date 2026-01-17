import { ComponentType, lazy, LazyExoticComponent } from 'react';

/**
 * Utility for lazy loading components with better error handling
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: ComponentType<any>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await importFunc();
    } catch (error) {
      console.error('Error lazy loading component:', error);
      // Return fallback or rethrow
      if (fallback) {
        return { default: fallback as T };
      }
      throw error;
    }
  });
}

/**
 * Preload a lazy component to improve perceived performance
 */
export function preloadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): void {
  // Start loading the component in the background
  importFunc().catch((error) => {
    console.error('Error preloading component:', error);
  });
}
