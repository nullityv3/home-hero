# Performance Optimization Guide

This document outlines the performance optimizations implemented in the HomeHeroes application.

## Loading States and Skeleton Screens

### Skeleton Components
Located in `components/ui/loading-skeleton.tsx`, we provide several skeleton components:

- **Skeleton**: Base animated skeleton component
- **HeroCardSkeleton**: Skeleton for hero cards
- **RequestCardSkeleton**: Skeleton for request cards
- **StatsCardSkeleton**: Skeleton for statistics cards
- **ListSkeleton**: Reusable list skeleton with configurable count and type

### Usage
```typescript
import { ListSkeleton } from '@/components/ui/loading-skeleton';

// In your component
if (loading) {
  return <ListSkeleton count={5} type="hero" />;
}
```

### Benefits
- Improved perceived performance
- Better user experience during data loading
- Reduced layout shift
- Clear visual feedback

## Image Optimization

### Cached Image Component
Located in `components/ui/cached-image.tsx`, provides:

- Automatic image caching with `force-cache` strategy
- Loading indicators during image load
- Graceful error handling with placeholder icons
- Optimized memory usage

### Usage
```typescript
import { CachedImage } from '@/components/ui/cached-image';

<CachedImage
  uri={profileImageUrl}
  style={styles.profileImage}
  placeholderIcon="person"
  placeholderSize={24}
/>
```

### Benefits
- Reduced network requests
- Faster image loading on subsequent views
- Better offline experience
- Consistent placeholder UI

## Data Prefetching

### Prefetch Utilities
Located in `utils/data-prefetch.ts`, provides:

- **prefetchCriticalData**: Prefetch essential data during app startup
- **prefetchScreenData**: Prefetch data before navigation
- **clearStaleData**: Clean up old cached data

### Implementation
```typescript
import { prefetchCriticalData } from '@/utils/data-prefetch';

// Prefetch on user sign-in
prefetchCriticalData(userData.id, userData.user_type);
```

### Benefits
- Faster screen transitions
- Reduced perceived loading time
- Better offline support
- Optimized network usage

## Lazy Loading

### Lazy Load Utilities
Located in `utils/lazy-load.ts`, provides:

- **lazyLoad**: Lazy load components with error handling
- **preloadComponent**: Preload components in the background

### Usage
```typescript
import { lazyLoad, preloadComponent } from '@/utils/lazy-load';

// Lazy load a component
const HeroDetails = lazyLoad(() => import('./hero-details'));

// Preload before navigation
preloadComponent(() => import('./hero-details'));
```

### Benefits
- Reduced initial bundle size
- Faster app startup
- Better code splitting
- Improved memory usage

## Performance Monitoring

### Performance Monitor
Located in `utils/performance.ts`, provides:

- **start/end**: Track operation duration
- **measure**: Measure async function execution
- **throttle**: Limit function execution frequency
- **debounce**: Delay function execution

### Usage
```typescript
import { performanceMonitor, throttle, debounce } from '@/utils/performance';

// Track performance
performanceMonitor.start('data_load');
await loadData();
performanceMonitor.end('data_load');

// Throttle search
const throttledSearch = throttle(handleSearch, 300);

// Debounce input
const debouncedInput = debounce(handleInput, 500);
```

### Benefits
- Identify performance bottlenecks
- Optimize slow operations
- Reduce unnecessary re-renders
- Better resource management

## Store Optimization

### Store Utilities
Located in `utils/store-optimization.ts`, provides:

- **createMemoizedSelector**: Prevent unnecessary re-renders
- **shallowEqual/deepEqual**: Equality checks
- **batchUpdates**: Batch state updates
- **retryOperation**: Retry with exponential backoff

### Usage
```typescript
import { createMemoizedSelector, retryOperation } from '@/utils/store-optimization';

// Memoized selector
const selectActiveRequests = createMemoizedSelector(
  (state) => state.activeRequests,
  shallowEqual
);

// Retry operation
const data = await retryOperation(() => fetchData(), 3);
```

### Benefits
- Reduced re-renders
- Better state management
- Improved reliability
- Optimized performance

## React Query Configuration

### Optimized Settings
Located in `services/react-query.ts`:

- **Stale time**: 5 minutes for queries
- **Cache time**: 10 minutes for garbage collection
- **Retry logic**: 3 attempts with exponential backoff
- **Smart refetching**: On reconnect, not on window focus

### Query Keys Factory
Consistent query key management for:
- User profiles
- Service requests
- Heroes
- Chat messages
- Earnings

### Benefits
- Efficient data caching
- Reduced network requests
- Better offline support
- Consistent data management

## Startup Configuration

### Configuration
Located in `config/startup.ts`, provides:

- Prefetch settings
- Cache configuration
- Performance monitoring
- Network settings
- Lazy loading options

### Customization
```typescript
import { updateStartupConfig } from '@/config/startup';

updateStartupConfig({
  prefetch: {
    timeout: 5000,
  },
});
```

## Best Practices

### 1. Use Skeleton Screens
Always show skeleton screens during initial data loading instead of spinners.

### 2. Implement Image Caching
Use the CachedImage component for all remote images.

### 3. Prefetch Critical Data
Prefetch data that users are likely to need soon.

### 4. Lazy Load Non-Critical Screens
Use lazy loading for screens that aren't immediately needed.

### 5. Monitor Performance
Use performance monitoring in development to identify bottlenecks.

### 6. Optimize Re-renders
Use memoized selectors and shallow equality checks.

### 7. Batch Updates
Batch multiple state updates to reduce re-renders.

### 8. Throttle/Debounce
Use throttle for frequent events, debounce for user input.

## Performance Metrics

### Target Metrics
- **App startup**: < 2 seconds
- **Screen transition**: < 300ms
- **Data loading**: < 1 second
- **Image loading**: < 500ms
- **User interaction response**: < 100ms

### Monitoring
Use the performance monitor in development to track these metrics:

```typescript
performanceMonitor.logSummary();
```

## Troubleshooting

### Slow Startup
1. Check prefetch timeout settings
2. Reduce amount of prefetched data
3. Optimize initial bundle size

### Slow Screen Transitions
1. Implement prefetching for target screen
2. Use lazy loading for heavy components
3. Optimize data queries

### High Memory Usage
1. Clear stale data regularly
2. Reduce image cache size
3. Implement proper cleanup in useEffect

### Network Issues
1. Increase retry attempts
2. Implement better offline support
3. Optimize query stale times

## Future Optimizations

- [ ] Implement virtual scrolling for long lists
- [ ] Add service worker for better offline support
- [ ] Implement progressive image loading
- [ ] Add code splitting for larger screens
- [ ] Implement request batching
- [ ] Add compression for API responses
