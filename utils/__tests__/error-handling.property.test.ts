/**
 * Property-Based Tests for Error Handling
 * Feature: homeheroes-frontend, Property 18: Error handling completeness
 * Validates: Requirements 7.4
 * 
 * Property: For any error condition that occurs, a clear error message 
 * with suggested resolution actions should be displayed to the user
 */

import fc from 'fast-check';
import { handleError, logError, retryOperation } from '../error-handler';

describe('Property 18: Error handling completeness', () => {
  // Generator for various error types
  const errorGenerator = fc.oneof(
    // Network errors
    fc.record({
      message: fc.constantFrom(
        'fetch failed',
        'network error',
        'timeout',
        'connection refused'
      ),
      code: fc.constant('NETWORK_ERROR'),
    }),
    // Authentication errors
    fc.record({
      message: fc.constantFrom(
        'Invalid login credentials',
        'Email not confirmed',
        'User not found'
      ),
      status: fc.constant(401),
    }),
    // Authorization errors
    fc.record({
      message: fc.constantFrom(
        'permission denied',
        'unauthorized access',
        'forbidden'
      ),
      status: fc.constant(403),
    }),
    // Not found errors
    fc.record({
      message: fc.constant('not found'),
      status: fc.constant(404),
    }),
    // Conflict errors
    fc.record({
      message: fc.constantFrom(
        'conflict detected',
        'already exists',
        'duplicate entry'
      ),
      status: fc.constant(409),
    }),
    // Validation errors
    fc.record({
      message: fc.constantFrom(
        'validation failed',
        'required field missing',
        'invalid format'
      ),
    }),
    // Server errors
    fc.record({
      message: fc.constantFrom(
        'internal server error',
        'service unavailable',
        'server error'
      ),
      status: fc.integer({ min: 500, max: 599 }),
    }),
    // Rate limiting
    fc.record({
      message: fc.constant('rate limit exceeded'),
      status: fc.constant(429),
    }),
    // Unknown errors
    fc.record({
      message: fc.string({ minLength: 1, maxLength: 100 }),
    })
  );

  it('should always return an AppError with message and suggestion for any error', () => {
    fc.assert(
      fc.property(errorGenerator, (error) => {
        const result = handleError(error);
        
        // Property: Every error must be transformed into an AppError
        expect(result).toBeDefined();
        expect(result).toHaveProperty('category');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('suggestion');
        
        // Property: Message and suggestion must be non-empty strings
        expect(typeof result.message).toBe('string');
        expect(result.message.length).toBeGreaterThan(0);
        expect(typeof result.suggestion).toBe('string');
        expect(result.suggestion.length).toBeGreaterThan(0);
        
        // Property: Category must be one of the defined types
        const validCategories = [
          'network',
          'validation',
          'authentication',
          'authorization',
          'not_found',
          'conflict',
          'server',
          'unknown',
        ];
        expect(validCategories).toContain(result.category);
        
        // Property: Original error should be preserved
        expect(result.originalError).toBe(error);
      }),
      { numRuns: 100 }
    );
  });

  it('should categorize network errors correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.constantFrom('fetch', 'network', 'timeout'),
          code: fc.constant('NETWORK_ERROR'),
        }),
        (error) => {
          const result = handleError(error);
          
          // Property: Network errors must be categorized as 'network'
          expect(result.category).toBe('network');
          expect(result.suggestion).toContain('connection');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should categorize authentication errors correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.constantFrom(
            'Invalid login credentials',
            'Email not confirmed'
          ),
          status: fc.constant(401),
        }),
        (error) => {
          const result = handleError(error);
          
          // Property: Auth errors must be categorized as 'authentication'
          expect(result.category).toBe('authentication');
          expect(result.message).toBeTruthy();
          expect(result.suggestion).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide user-friendly messages for all error categories', () => {
    fc.assert(
      fc.property(errorGenerator, (error) => {
        const result = handleError(error);
        
        // Property: Messages should not contain technical jargon
        const technicalTerms = ['undefined', 'null', 'NaN', 'stack trace'];
        const messageContainsTechnicalTerms = technicalTerms.some(term =>
          result.message.toLowerCase().includes(term)
        );
        expect(messageContainsTechnicalTerms).toBe(false);
        
        // Property: Suggestions should be actionable
        expect(result.suggestion.length).toBeGreaterThan(10);
      }),
      { numRuns: 100 }
    );
  });

  it('should retry transient errors and succeed eventually', async () => {
    let attemptCount = 0;
    const maxRetries = 3;
    
    const operation = async () => {
      attemptCount++;
      if (attemptCount < maxRetries) {
        throw new Error('network error');
      }
      return 'success';
    };

    const result = await retryOperation(operation, maxRetries, 10);
    
    // Property: Retry should eventually succeed for transient errors
    expect(result).toBe('success');
    expect(attemptCount).toBe(maxRetries);
  });

  it('should not retry non-transient errors', async () => {
    let attemptCount = 0;
    
    const operation = async () => {
      attemptCount++;
      throw { message: 'validation failed', status: 400 };
    };

    await expect(
      retryOperation(operation, 3, 10)
    ).rejects.toMatchObject({ message: 'validation failed' });
    
    // Property: Non-transient errors should fail immediately
    expect(attemptCount).toBe(1);
  });

  it('should handle errors with missing properties gracefully', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant({}),
          fc.constant('string error'),
          fc.constant(42),
          fc.record({})
        ),
        (error) => {
          const result = handleError(error);
          
          // Property: Even malformed errors should produce valid AppError
          expect(result).toBeDefined();
          expect(result.category).toBeDefined();
          expect(result.message).toBeTruthy();
          expect(result.suggestion).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve error context for debugging', () => {
    fc.assert(
      fc.property(errorGenerator, (error) => {
        const result = handleError(error);
        
        // Property: Original error must be preserved for debugging
        expect(result.originalError).toBeDefined();
        expect(result.originalError).toBe(error);
      }),
      { numRuns: 100 }
    );
  });

  it('should log errors without throwing', () => {
    fc.assert(
      fc.property(errorGenerator, (error) => {
        const appError = handleError(error);
        
        // Property: Logging should never throw an error
        expect(() => {
          logError(appError, 'test context');
        }).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  it('should handle concurrent errors independently', async () => {
    const errors = [
      { message: 'network error', code: 'NETWORK_ERROR' },
      { message: 'validation failed' },
      { message: 'not found', status: 404 },
    ];

    const results = await Promise.all(
      errors.map(error => Promise.resolve(handleError(error)))
    );

    // Property: Each error should be handled independently
    expect(results).toHaveLength(3);
    expect(results[0].category).toBe('network');
    expect(results[1].category).toBe('validation');
    expect(results[2].category).toBe('not_found');
    
    // Property: All results should be valid AppErrors
    results.forEach(result => {
      expect(result.message).toBeTruthy();
      expect(result.suggestion).toBeTruthy();
    });
  });
});
