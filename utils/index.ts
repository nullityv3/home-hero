// Centralized exports for better tree-shaking and bundle optimization
export { clearStaleData, prefetchCriticalData, prefetchScreenData } from './data-prefetch';
export { ErrorType, handleError } from './error-handler';
export { lazyLoad, preloadComponent } from './lazy-load';
export { requestNotificationPermissions, showNotification } from './notifications';
export { OfflineQueue } from './offline-queue';
export { debounce, performanceMonitor, throttle } from './performance';

