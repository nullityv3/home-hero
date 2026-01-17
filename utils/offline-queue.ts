/**
 * Offline action queue for HomeHeroes application
 * Queues user actions during network outages and syncs when connectivity is restored
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleError, logError } from './error-handler';

const QUEUE_STORAGE_KEY = '@homeheroes:offline_queue';

export interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

export interface OfflineQueueState {
  actions: QueuedAction[];
  isProcessing: boolean;
}

/**
 * Add an action to the offline queue
 */
export async function enqueueAction(
  type: string,
  payload: any
): Promise<void> {
  try {
    const queue = await getQueue();
    
    const action: QueuedAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    queue.actions.push(action);
    await saveQueue(queue);
  } catch (error) {
    const appError = handleError(error);
    logError(appError, 'enqueueAction');
    throw error;
  }
}

/**
 * Get the current offline queue
 */
export async function getQueue(): Promise<OfflineQueueState> {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    
    if (!queueJson) {
      return {
        actions: [],
        isProcessing: false,
      };
    }
    
    return JSON.parse(queueJson);
  } catch (error) {
    const appError = handleError(error);
    logError(appError, 'getQueue');
    return {
      actions: [],
      isProcessing: false,
    };
  }
}

/**
 * Save the offline queue to storage
 */
async function saveQueue(queue: OfflineQueueState): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    const appError = handleError(error);
    logError(appError, 'saveQueue');
    throw error;
  }
}

/**
 * Remove an action from the queue
 */
export async function dequeueAction(actionId: string): Promise<void> {
  try {
    const queue = await getQueue();
    queue.actions = queue.actions.filter(action => action.id !== actionId);
    await saveQueue(queue);
  } catch (error) {
    const appError = handleError(error);
    logError(appError, 'dequeueAction');
    throw error;
  }
}

/**
 * Clear all actions from the queue
 */
export async function clearQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch (error) {
    const appError = handleError(error);
    logError(appError, 'clearQueue');
    throw error;
  }
}

/**
 * Process the offline queue
 * Executes queued actions in order and removes successful ones
 */
export async function processQueue(
  actionHandlers: Record<string, (payload: any) => Promise<void>>
): Promise<{ processed: number; failed: number }> {
  const queue = await getQueue();
  
  // Prevent concurrent processing
  if (queue.isProcessing) {
    return { processed: 0, failed: 0 };
  }
  
  queue.isProcessing = true;
  await saveQueue(queue);
  
  let processed = 0;
  let failed = 0;
  const maxRetries = 3;
  
  try {
    // Process actions in order
    for (const action of [...queue.actions]) {
      const handler = actionHandlers[action.type];
      
      if (!handler) {
        // Unknown action type, remove it
        await dequeueAction(action.id);
        failed++;
        continue;
      }
      
      try {
        await handler(action.payload);
        await dequeueAction(action.id);
        processed++;
      } catch (error) {
        const appError = handleError(error);
        
        // Only retry network and server errors
        if (appError.category === 'network' || appError.category === 'server') {
          action.retryCount++;
          
          if (action.retryCount >= maxRetries) {
            // Max retries reached, remove from queue
            await dequeueAction(action.id);
            failed++;
            logError(appError, `processQueue: Max retries reached for action ${action.type}`);
          } else {
            // Update retry count
            const updatedQueue = await getQueue();
            const actionIndex = updatedQueue.actions.findIndex(a => a.id === action.id);
            if (actionIndex !== -1) {
              updatedQueue.actions[actionIndex] = action;
              await saveQueue(updatedQueue);
            }
          }
        } else {
          // Non-retryable error, remove from queue
          await dequeueAction(action.id);
          failed++;
          logError(appError, `processQueue: Non-retryable error for action ${action.type}`);
        }
      }
    }
  } finally {
    // Mark processing as complete
    const finalQueue = await getQueue();
    finalQueue.isProcessing = false;
    await saveQueue(finalQueue);
  }
  
  return { processed, failed };
}

/**
 * Get the number of pending actions in the queue
 */
export async function getQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.actions.length;
}
