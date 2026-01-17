/**
 * **Feature: homeheroes-frontend, Property 4: Request cancellation state consistency**
 * **Validates: Requirements 1.5**
 * 
 * Property-based test to verify that when a civilian cancels an active request,
 * the request status updates to 'cancelled' and the assigned hero receives a notification.
 */

import { BudgetRange, Location, ServiceCategory, ServiceRequest } from '@/types';
import * as fc from 'fast-check';

// Mock notification system
const mockNotifications = {
  sent: [] as Array<{ heroId: string; requestId: string; message: string }>,
  
  sendCancellationNotification: async (heroId: string, requestId: string): Promise<void> => {
    mockNotifications.sent.push({
      heroId,
      requestId,
      message: `Service request ${requestId} has been cancelled`,
    });
  },
  
  clear: () => {
    mockNotifications.sent = [];
  },
  
  getNotificationsForHero: (heroId: string) => {
    return mockNotifications.sent.filter(n => n.heroId === heroId);
  },
};

// Mock database for request cancellation
const mockDatabase = {
  requests: new Map<string, ServiceRequest>(),
  
  createRequest: (request: ServiceRequest): ServiceRequest => {
    mockDatabase.requests.set(request.id, request);
    return request;
  },
  
  cancelRequest: async (requestId: string): Promise<{ success: boolean; error?: string; request?: ServiceRequest }> => {
    const request = mockDatabase.requests.get(requestId);
    
    if (!request) {
      return { success: false, error: 'Request not found' };
    }
    
    // Check if request can be cancelled
    if (request.status === 'completed') {
      return { success: false, error: 'Cannot cancel completed request' };
    }
    
    if (request.status === 'cancelled') {
      return { success: false, error: 'Request is already cancelled' };
    }
    
    // Update request status
    const updatedRequest: ServiceRequest = {
      ...request,
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    };
    
    mockDatabase.requests.set(requestId, updatedRequest);
    
    // Send notification to assigned hero if exists
    if (request.hero_id) {
      await mockNotifications.sendCancellationNotification(request.hero_id, requestId);
    }
    
    return { success: true, request: updatedRequest };
  },
  
  getRequest: (requestId: string): ServiceRequest | undefined => {
    return mockDatabase.requests.get(requestId);
  },
  
  clear: () => {
    mockDatabase.requests.clear();
  },
};

// Generators
const validServiceCategoryGenerator = fc.constantFrom<ServiceCategory>(
  'cleaning', 'repairs', 'delivery', 'tutoring', 'other'
);

const validLocationGenerator = fc.record<Location>({
  address: fc.string({ minLength: 5, maxLength: 100 }),
  latitude: fc.double({ min: -90, max: 90 }),
  longitude: fc.double({ min: -180, max: 180 }),
  city: fc.string({ minLength: 2, maxLength: 50 }),
  state: fc.string({ minLength: 2, maxLength: 2 }),
  zipCode: fc.string({ minLength: 5, maxLength: 10 }),
});

const validBudgetRangeGenerator = fc.record<BudgetRange>({
  min: fc.integer({ min: 1, max: 500 }),
  max: fc.integer({ min: 1, max: 1000 }),
  currency: fc.constant('USD'),
}).filter(budget => budget.max >= budget.min);

const pastDateGenerator = fc.integer({ min: 1577836800000, max: Date.now() })
  .map(timestamp => new Date(timestamp).toISOString());

const futureDateGenerator = fc.integer({ 
  min: Date.now() + 86400000,
  max: Date.now() + 365 * 86400000
}).map(timestamp => new Date(timestamp).toISOString());

// Generator for cancellable requests (pending, assigned, or active)
const cancellableRequestGenerator = (status: 'pending' | 'assigned' | 'active') => {
  const heroIdGenerator = status === 'pending' 
    ? fc.constant(undefined)
    : fc.uuid();
  
  return fc.record<ServiceRequest>({
    id: fc.uuid(),
    civilian_id: fc.uuid(),
    hero_id: heroIdGenerator,
    title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
    category: validServiceCategoryGenerator,
    location: validLocationGenerator,
    scheduled_date: futureDateGenerator,
    estimated_duration: fc.integer({ min: 1, max: 10 }),
    budget_range: validBudgetRangeGenerator,
    status: fc.constant(status),
    created_at: pastDateGenerator,
    updated_at: pastDateGenerator,
  });
};

describe('Request Cancellation Properties', () => {
  beforeEach(() => {
    mockDatabase.clear();
    mockNotifications.clear();
  });

  describe('Property 4: Request cancellation state consistency', () => {
    
    test('For any active request, when cancelled by civilian, the request status should update to cancelled', async () => {
      await fc.assert(fc.asyncProperty(
        fc.oneof(
          cancellableRequestGenerator('pending'),
          cancellableRequestGenerator('assigned'),
          cancellableRequestGenerator('active')
        ),
        async (request) => {
          // Create the request
          mockDatabase.createRequest(request);
          
          // Cancel the request
          const result = await mockDatabase.cancelRequest(request.id);
          
          // Property 1: Cancellation should succeed
          expect(result.success).toBe(true);
          expect(result.error).toBeUndefined();
          
          // Property 2: Request status should be 'cancelled'
          expect(result.request?.status).toBe('cancelled');
          
          // Property 3: Request should be updated in database
          const updatedRequest = mockDatabase.getRequest(request.id);
          expect(updatedRequest).toBeDefined();
          expect(updatedRequest?.status).toBe('cancelled');
          
          // Property 4: updated_at should be modified
          expect(updatedRequest?.updated_at).not.toBe(request.updated_at);
        }
      ), { numRuns: 100 });
    });

    test('For any request with assigned hero, cancellation should send notification to the hero', async () => {
      await fc.assert(fc.asyncProperty(
        fc.oneof(
          cancellableRequestGenerator('assigned'),
          cancellableRequestGenerator('active')
        ),
        async (request) => {
          // Ensure request has a hero_id
          fc.pre(request.hero_id !== undefined);
          
          // Create the request
          mockDatabase.createRequest(request);
          
          // Cancel the request
          const result = await mockDatabase.cancelRequest(request.id);
          
          // Property: Hero should receive cancellation notification
          expect(result.success).toBe(true);
          
          const heroNotifications = mockNotifications.getNotificationsForHero(request.hero_id!);
          expect(heroNotifications.length).toBe(1);
          expect(heroNotifications[0].requestId).toBe(request.id);
          expect(heroNotifications[0].heroId).toBe(request.hero_id);
        }
      ), { numRuns: 100 });
    });

    test('For any pending request without hero, cancellation should not send notification', async () => {
      await fc.assert(fc.asyncProperty(
        cancellableRequestGenerator('pending'),
        async (request) => {
          // Ensure request has no hero_id
          const requestWithoutHero = { ...request, hero_id: undefined };
          
          // Create the request
          mockDatabase.createRequest(requestWithoutHero);
          
          // Cancel the request
          const result = await mockDatabase.cancelRequest(requestWithoutHero.id);
          
          // Property: No notifications should be sent
          expect(result.success).toBe(true);
          expect(mockNotifications.sent.length).toBe(0);
        }
      ), { numRuns: 100 });
    });

    test('Completed requests cannot be cancelled', async () => {
      await fc.assert(fc.asyncProperty(
        cancellableRequestGenerator('active'),
        async (request) => {
          // Create a completed request
          const completedRequest: ServiceRequest = {
            ...request,
            status: 'completed',
          };
          
          mockDatabase.createRequest(completedRequest);
          
          // Attempt to cancel the completed request
          const result = await mockDatabase.cancelRequest(completedRequest.id);
          
          // Property: Cancellation should fail
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          
          // Property: Request status should remain 'completed'
          const unchangedRequest = mockDatabase.getRequest(completedRequest.id);
          expect(unchangedRequest?.status).toBe('completed');
        }
      ), { numRuns: 100 });
    });

    test('Already cancelled requests cannot be cancelled again', async () => {
      await fc.assert(fc.asyncProperty(
        cancellableRequestGenerator('active'),
        async (request) => {
          // Create and cancel a request
          mockDatabase.createRequest(request);
          await mockDatabase.cancelRequest(request.id);
          
          // Clear notifications from first cancellation
          mockNotifications.clear();
          
          // Attempt to cancel again
          const result = await mockDatabase.cancelRequest(request.id);
          
          // Property: Second cancellation should fail
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          
          // Property: No additional notifications should be sent
          expect(mockNotifications.sent.length).toBe(0);
        }
      ), { numRuns: 100 });
    });

    test('Cancelling non-existent request should fail', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(),
        async (nonExistentId) => {
          // Attempt to cancel a request that doesn't exist
          const result = await mockDatabase.cancelRequest(nonExistentId);
          
          // Property: Cancellation should fail
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('not found');
        }
      ), { numRuns: 100 });
    });

    test('Multiple requests can be cancelled independently', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(
          fc.oneof(
            cancellableRequestGenerator('pending'),
            cancellableRequestGenerator('assigned'),
            cancellableRequestGenerator('active')
          ),
          { minLength: 2, maxLength: 5 }
        ),
        async (requests) => {
          // Clear state for each property test run
          mockDatabase.clear();
          mockNotifications.clear();
          
          // Ensure all requests have unique IDs
          const uniqueRequests = requests.map((req, index) => ({
            ...req,
            id: `${req.id}-${index}`, // Make IDs unique
          }));
          
          // Create all requests
          uniqueRequests.forEach(req => mockDatabase.createRequest(req));
          
          // Cancel all requests
          const results = await Promise.all(
            uniqueRequests.map(req => mockDatabase.cancelRequest(req.id))
          );
          
          // Property: All cancellations should succeed
          results.forEach(result => {
            expect(result.success).toBe(true);
          });
          
          // Property: All requests should have 'cancelled' status
          uniqueRequests.forEach(req => {
            const updatedRequest = mockDatabase.getRequest(req.id);
            expect(updatedRequest?.status).toBe('cancelled');
          });
          
          // Property: Notifications sent only for requests with heroes
          const requestsWithHeroes = uniqueRequests.filter(req => req.hero_id !== undefined);
          expect(mockNotifications.sent.length).toBe(requestsWithHeroes.length);
        }
      ), { numRuns: 50 });
    });

    test('Request cancellation preserves all other request data', async () => {
      await fc.assert(fc.asyncProperty(
        cancellableRequestGenerator('active'),
        async (request) => {
          // Create the request
          mockDatabase.createRequest(request);
          
          // Cancel the request
          const result = await mockDatabase.cancelRequest(request.id);
          
          expect(result.success).toBe(true);
          
          const updatedRequest = result.request!;
          
          // Property: All fields except status and updated_at should be preserved
          expect(updatedRequest.id).toBe(request.id);
          expect(updatedRequest.civilian_id).toBe(request.civilian_id);
          expect(updatedRequest.hero_id).toBe(request.hero_id);
          expect(updatedRequest.title).toBe(request.title);
          expect(updatedRequest.description).toBe(request.description);
          expect(updatedRequest.category).toBe(request.category);
          expect(updatedRequest.location).toEqual(request.location);
          expect(updatedRequest.scheduled_date).toBe(request.scheduled_date);
          expect(updatedRequest.estimated_duration).toBe(request.estimated_duration);
          expect(updatedRequest.budget_range).toEqual(request.budget_range);
          expect(updatedRequest.created_at).toBe(request.created_at);
          
          // Only status and updated_at should change
          expect(updatedRequest.status).toBe('cancelled');
          expect(updatedRequest.updated_at).not.toBe(request.updated_at);
        }
      ), { numRuns: 100 });
    });
  });
});
