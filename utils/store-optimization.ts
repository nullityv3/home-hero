/**
 * Store optimization utilities for better performance
 */

/**
 * Create a memoized selector for Zustand stores
 * This prevents unnecessary re-renders when derived state hasn't changed
 */
export function createMemoizedSelector<T, R>(
  selector: (state: T) => R,
  equalityFn?: (a: R, b: R) => boolean
): (state: T) => R {
  let lastResult: R | undefined;
  let lastState: T | undefined;

  return (state: T): R => {
    if (lastState === state) {
      return lastResult as R;
    }

    const result = selector(state);

    if (lastResult !== undefined && equalityFn && equalityFn(lastResult, result)) {
      return lastResult;
    }

    lastState = state;
    lastResult = result;
    return result;
  };
}

/**
 * Shallow equality check for objects
 */
export function shallowEqual<T extends Record<string, any>>(a: T, b: T): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (a[key] !== b[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Deep equality check for nested objects
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a == null || b == null) return false;

  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * Batch state updates to reduce re-renders
 */
export function batchUpdates<T>(
  updates: Array<(state: T) => Partial<T>>
): (state: T) => T {
  return (state: T): T => {
    let newState = state;
    for (const update of updates) {
      newState = { ...newState, ...update(newState) };
    }
    return newState;
  };
}

/**
 * Create a debounced state setter
 */
export function createDebouncedSetter<T>(
  setter: (value: T) => void,
  delay: number
): (value: T) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (value: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      setter(value);
    }, delay);
  };
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s, etc.
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}
