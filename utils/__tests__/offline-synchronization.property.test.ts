/**
 * Property-Based Tests for Offline Synchronization
 * Feature: homeheroes-frontend, Property 20: Offline action synchronization
 * Validates: Requirements 8.3
 * 
 * Property: For any user actions performed while offline, the actions should be 
 * queued locally and synchronized with the server when network connectivity is restored
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    clearQueue,
    enqueueAction,
    getQueue,
    getQueueSize,
    processQueue
} from '../offline-queue';

// Mock AsyncStorage for testing
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('Property 20: Offline action synchronization', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = {};
    
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      return storage[key] || null;
    });
    
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
      storage[key] = value;
    });
    
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
      delete storage[key];
    });
  });

  it('should queue actions and maintain order', async () => {
    storage = {};
    
    // Enqueue multiple actions
    await enqueueAction('ACTION_1', { data: 'first' });
    await enqueueAction('ACTION_2', { data: 'second' });
    await enqueueAction('ACTION_3', { data: 'third' });
    
    // Property: All actions should be queued in order
    const queue = await getQueue();
    expect(queue.actions).toHaveLength(3);
    expect(queue.actions[0].type).toBe('ACTION_1');
    expect(queue.actions[1].type).toBe('ACTION_2');
    expect(queue.actions[2].type).toBe('ACTION_3');
  });

  it('should process and remove successful actions', async () => {
    storage = {};
    
    await enqueueAction('TEST_ACTION', { data: 'test' });
    
    const handler = jest.fn().mockResolvedValue(undefined);
    const result = await processQueue({ TEST_ACTION: handler });
    
    // Property: Successful actions should be processed and removed
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(handler).toHaveBeenCalledTimes(1);
    
    const queue = await getQueue();
    expect(queue.actions).toHaveLength(0);
  });

  it('should retry network errors up to max retries', async () => {
    storage = {};
    
    await enqueueAction('TEST_ACTION', { data: 'test' });
    
    const handler = jest.fn().mockRejectedValue({
      message: 'network error',
      code: 'NETWORK_ERROR',
    });
    
    // Process multiple times to trigger retries
    await processQueue({ TEST_ACTION: handler });
    await processQueue({ TEST_ACTION: handler });
    await processQueue({ TEST_ACTION: handler });
    
    // Property: After max retries, action should be removed
    const queue = await getQueue();
    expect(queue.actions).toHaveLength(0);
  });

  it('should not retry non-transient errors', async () => {
    storage = {};
    
    await enqueueAction('TEST_ACTION', { data: 'test' });
    
    const handler = jest.fn().mockRejectedValue({
      message: 'validation failed',
      status: 400,
    });
    
    const result = await processQueue({ TEST_ACTION: handler });
    
    // Property: Non-retryable errors should fail immediately
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(1);
    expect(handler).toHaveBeenCalledTimes(1);
    
    const queue = await getQueue();
    expect(queue.actions).toHaveLength(0);
  });

  it('should handle unknown action types', async () => {
    storage = {};
    
    await enqueueAction('UNKNOWN_ACTION', { data: 'test' });
    
    const result = await processQueue({});
    
    // Property: Unknown actions should be marked as failed and removed
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(1);
    
    const queue = await getQueue();
    expect(queue.actions).toHaveLength(0);
  });

  it('should correctly report queue size', async () => {
    storage = {};
    
    expect(await getQueueSize()).toBe(0);
    
    await enqueueAction('ACTION_1', { data: 'test1' });
    expect(await getQueueSize()).toBe(1);
    
    await enqueueAction('ACTION_2', { data: 'test2' });
    expect(await getQueueSize()).toBe(2);
    
    await clearQueue();
    expect(await getQueueSize()).toBe(0);
  });

  it('should preserve action metadata', async () => {
    storage = {};
    
    const beforeTime = Date.now();
    await enqueueAction('TEST_ACTION', { data: 'test' });
    const afterTime = Date.now();
    
    const queue = await getQueue();
    const action = queue.actions[0];
    
    // Property: Action metadata should be preserved
    expect(action.id).toBeDefined();
    expect(typeof action.id).toBe('string');
    expect(action.timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(action.timestamp).toBeLessThanOrEqual(afterTime);
    expect(action.retryCount).toBe(0);
  });

  it('should handle empty queue gracefully', async () => {
    storage = {};
    
    const result = await processQueue({ TEST_ACTION: jest.fn() });
    
    // Property: Processing empty queue should not throw
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0);
  });
});
