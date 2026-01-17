/**
 * Hook for offline-aware actions
 * Automatically queues actions when offline and executes them when online
 */

import { useCallback, useEffect, useState } from 'react';
import { handleError, logError } from '../utils/error-handler';
import { enqueueAction, getQueueSize, processQueue } from '../utils/offline-queue';
import { useNetworkStatus } from './use-network-status';

export interface UseOfflineActionOptions {
  actionType: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export function useOfflineAction(
  action: (payload: any) => Promise<any>,
  options: UseOfflineActionOptions
) {
  const { isConnected } = useNetworkStatus();
  const [isExecuting, setIsExecuting] = useState(false);
  const [queueSize, setQueueSize] = useState(0);

  // Update queue size
  useEffect(() => {
    const updateQueueSize = async () => {
      const size = await getQueueSize();
      setQueueSize(size);
    };
    
    updateQueueSize();
    
    // Update queue size periodically
    const interval = setInterval(updateQueueSize, 5000);
    return () => clearInterval(interval);
  }, []);

  // Process queue when coming back online
  useEffect(() => {
    if (isConnected && queueSize > 0) {
      const handlers = {
        [options.actionType]: action,
      };
      
      processQueue(handlers).then(result => {
        if (result.processed > 0) {
          options.onSuccess?.();
        }
        if (result.failed > 0) {
          options.onError?.(new Error(`${result.failed} actions failed to sync`));
        }
        
        // Update queue size after processing
        getQueueSize().then(setQueueSize);
      });
    }
  }, [isConnected, queueSize, action, options]);

  const execute = useCallback(
    async (payload: any) => {
      setIsExecuting(true);
      
      try {
        if (isConnected) {
          // Execute immediately if online
          const result = await action(payload);
          options.onSuccess?.();
          return result;
        } else {
          // Queue for later if offline
          await enqueueAction(options.actionType, payload);
          setQueueSize(prev => prev + 1);
          
          // Notify user that action was queued
          console.log(`Action ${options.actionType} queued for offline sync`);
          return null;
        }
      } catch (error) {
        const appError = handleError(error);
        logError(appError, 'useOfflineAction');
        options.onError?.(error);
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [isConnected, action, options]
  );

  return {
    execute,
    isExecuting,
    isOffline: !isConnected,
    queueSize,
  };
}
