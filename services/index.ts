// Export all services for easy importing
export * from './supabase';
export * from './react-query';

// Re-export commonly used items
export { supabase, auth, database, realtime } from './supabase';
export { queryClient, queryKeys, mutationKeys, invalidateQueries, prefetchQueries } from './react-query';