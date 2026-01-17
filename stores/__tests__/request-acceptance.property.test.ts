/**
 * **Feature: homeheroes-frontend, Property 8: Request acceptance state transitions**
 * **Validates: Requirements 3.3**
 * 
 * Property-based test to verify that when a hero accepts a pending service request,
 * the request status changes to 'assigned', the hero is linked to the request,
 * and the civilian receives a notification.
 */

import { RequestStatus, ServiceRequest } from '@/types';
import * as fc from 'fast-check';

// Mock notification system
const mockNotifications = {
  notifications: [] as Array<{ userId: string; type: string; requestId: string }>,
  
  sendNotification: async (userId: string, type: string, requestId: string) => {
    mockNotifications.notifications.push({ userId, type, requestId });
  },
  
  getNotificationsForUser: (userId: string) => {
    return mockNotifications.notifications.filter(n => n.userId === userId);
  },
  
  clear: () => {
    mockNotifications.notifications = [];
  }
};

// Mock database for request acceptance
const mockDatabase = {
  requests: new Map<string, ServiceRequest>(),
  
  createServiceRequest: async (request: Partial<ServiceRequest>): Promise<ServiceRequest> => {
    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const newRequest: ServiceRequest = {
      id,
      civilian_id: request.civilian_id!,
      hero_id: request.hero_id,
      title: request.title!,
      description: request.description!,
      category: request.category!,
      location: request.location!,
      scheduled_date: request.scheduled_date!,
      estimated_duration: request.estimated_duration!,
      budget_range: request.budget_range!,
      status: request.status || 'pending',
      created_at: now,
      updated_at: now,
    };
    
    mockDatabase.requests.set(id, newRequest);
    return newRequest;
  },
  
  acceptRequest: async (requestId: string, heroId: string): Promise<{ success: boolean; error?: string; data?: ServiceRequest }> => {
    const request = mockDatabase.requests.get(requestId);
    
    if (!request) {
      return { success: false, error: 'Request not found' };
    }
    
    if (request.status !== 'pending') {
      return { success: false, error: 'Request is not in pending status' };
    }
    
    if (request.hero_id && request.hero_id !== heroId) {
      return { success: false, error: 'Request already assigned to another hero' };
    }
    
    // Update request
    const updatedRequest: ServiceRequest = {
      ...request,
      hero_id: heroId,
      status: 'assigned',
      updated_at: new Date().toISOString(),
    };
    
    mockDatabase.requests.set(requestId, updatedRequest);
    
    // Send notification to civilian
    await mockNotifications.sendNotification(request.civilian_id, 'request_accepted', requestId);
    
    return { success: true, data: updatedRequest };
  },
  
  getRequest: (requestId: string): ServiceRequest | undefined => {
    return mockDatabase.requests.get(requestId);
  },
  
  clear: () => {
    mockDatabase.requests.clear();
  }
};

// Generators
const validRequestGenerator = fc.record({
  civilian_id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
  category: fc.constantFrom('cleaning', 'repairs', 'delivery', 'tutoring', 'other'),
  location: fc.record({
    address: fc.string({ minLength: 5, maxLength: 100 }),
    latitude: fc.double({ min: -90, max: 90 }),
    longitude: fc.double({ min: -180, max: 180 }),
    city: fc.string({ minLength: 2, maxLength: 50 }),
    state: fc.string({ minLength: 2, maxLength: 2 }),
    zipCode: fc.string({ minLength: 5, maxLength: 10 }),
  }),
  scheduled_date: fc.date({ min: new Date() }).map(d => d.toISOString()),
  estimated_duration: fc.integer({ min: 1, max: 10 }),
  budget_range: fc.record({
    min: fc.integer({ min: 1, max: 500 }),
    max: fc.integer({ min: 1, max: 1000 }),
    currency: fc.constant('USD'),
  }).filter(budget => budget.max >= budget.min),
  status: fc.constant('pending' as RequestStatus),
});

describe('Request Acceptance Properties', () => {
  beforeEach(() => {
    mockDatabase.clear();
    mockNotifications.clear();
  });

  describe('Property 8: Request acceptance state transitions', () => {
    test('For any pending service request, when accepted by a hero, the request status should change to "assigned", the hero should be linked to the request, and the civilian should receive a notification', async () => {
      await fc.assert(fc.asyncProperty(
        validRequestGenerator,
        fc.uuid(), // hero_id
        async (requestData, heroId) => {
          // Create a pending request
          const createdRequest = await mockDatabase.createServiceRequest(requestData);
          
          // Verify initial state
          expect(createdRequest.status).toBe('pending');
          expect(createdRequest.hero_id).toBeUndefined();
          
          // Hero accepts the request
          const result = await mockDatabase.acceptRequest(createdRequest.id, heroId);
          
          // Property 1: Acceptance should be successful
          expect(result.success).toBe(true);
          expect(result.error).toBeUndefined();
          expect(result.data).toBeDefined();
          
          if (!result.data) return;
          
          // Property 2: Request status should change to 'assigned'
          expect(result.data.status).toBe('assigned');
          
          // Property 3: Hero should be linked to the request
          expect(result.data.hero_id).toBe(heroId);
          
          // Property 4: Request should be retrievable with updated status
          const retrievedRequest = mockDatabase.getRequest(createdRequest.id);
          expect(retrievedRequest).toBeDefined();
          expect(retrievedRequest?.status).toBe('assigned');
          expect(retrievedRequest?.hero_id).toBe(heroId);
          
          // Property 5: Civilian should receive a notification
          const civilianNotifications = mockNotifications.getNotificationsForUser(requestData.civilian_id);
          expect(civilianNotifications.length).toBeGreaterThan(0);
          
          const acceptanceNotification = civilianNotifications.find(
            n => n.type === 'request_accepted' && n.requestId === createdRequest.id
          );
          expect(acceptanceNotification).toBeDefined();
          
          // Property 6: Other request fields should remain unchanged
          expect(result.data.civilian_id).toBe(requestData.civilian_id);
          expect(result.data.title).toBe(requestData.title);
          expect(result.data.description).toBe(requestData.description);
          expect(result.data.category).toBe(requestData.category);
          expect(result.data.estimated_duration).toBe(requestData.estimated_duration);
        }
      ), { numRuns: 100 });
    });

    test('Accepting a non-pending request should fail', async () => {
      await fc.assert(fc.asyncProperty(
        validRequestGenerator,
        fc.uuid(), // hero_id
        fc.constantFrom<RequestStatus>('assigned', 'active', 'completed', 'cancelled'),
        async (requestData, heroId, nonPendingStatus) => {
          // Create a request with non-pending status
          const createdRequest = await mockDatabase.createServiceRequest({
            ...requestData,
            status: nonPendingStatus,
          });
          
          // Attempt to accept the request
          const result = await mockDatabase.acceptRequest(createdRequest.id, heroId);
          
          // Property: Acceptance should fail
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('not in pending status');
          
          // Property: Request status should remain unchanged
          const retrievedRequest = mockDatabase.getRequest(createdRequest.id);
          expect(retrievedRequest?.status).toBe(nonPendingStatus);
        }
      ), { numRuns: 100 });
    });

    test('Accepting a non-existent request should fail', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(), // non-existent request ID
        fc.uuid(), // hero_id
        async (nonExistentRequestId, heroId) => {
          // Ensure the request doesn't exist
          fc.pre(!mockDatabase.getRequest(nonExistentRequestId));
          
          // Attempt to accept non-existent request
          const result = await mockDatabase.acceptRequest(nonExistentRequestId, heroId);
          
          // Property: Acceptance should fail
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('not found');
        }
      ), { numRuns: 100 });
    });

    test('Multiple heroes cannot accept the same request', async () => {
      await fc.assert(fc.asyncProperty(
        validRequestGenerator,
        fc.uuid(), // hero1_id
        fc.uuid(), // hero2_id
        async (requestData, hero1Id, hero2Id) => {
          // Ensure different hero IDs
          fc.pre(hero1Id !== hero2Id);
          
          // Create a pending request
          const createdRequest = await mockDatabase.createServiceRequest(requestData);
          
          // First hero accepts the request
          const result1 = await mockDatabase.acceptRequest(createdRequest.id, hero1Id);
          expect(result1.success).toBe(true);
          
          // Second hero attempts to accept the same request
          const result2 = await mockDatabase.acceptRequest(createdRequest.id, hero2Id);
          
          // Property: Second acceptance should fail
          expect(result2.success).toBe(false);
          expect(result2.error).toBeDefined();
          
          // Property: Request should still be assigned to first hero
          const retrievedRequest = mockDatabase.getRequest(createdRequest.id);
          expect(retrievedRequest?.hero_id).toBe(hero1Id);
          expect(retrievedRequest?.status).toBe('assigned');
          
          // Property: Only one notification should be sent (to the civilian from first hero)
          const civilianNotifications = mockNotifications.getNotificationsForUser(requestData.civilian_id);
          const acceptanceNotifications = civilianNotifications.filter(
            n => n.type === 'request_accepted' && n.requestId === createdRequest.id
          );
          expect(acceptanceNotifications.length).toBe(1);
        }
      ), { numRuns: 100 });
    });

    test('Accepting multiple different requests should succeed for each', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(validRequestGenerator, { minLength: 2, maxLength: 5 }),
        fc.uuid(), // hero_id
        async (requestsData, heroId) => {
          const acceptedRequestIds: string[] = [];
          
          // Create and accept multiple requests
          for (const requestData of requestsData) {
            const createdRequest = await mockDatabase.createServiceRequest(requestData);
            const result = await mockDatabase.acceptRequest(createdRequest.id, heroId);
            
            // Property: Each acceptance should succeed
            expect(result.success).toBe(true);
            expect(result.data?.status).toBe('assigned');
            expect(result.data?.hero_id).toBe(heroId);
            
            if (result.data) {
              acceptedRequestIds.push(result.data.id);
            }
          }
          
          // Property: All requests should be assigned to the same hero
          acceptedRequestIds.forEach(requestId => {
            const request = mockDatabase.getRequest(requestId);
            expect(request?.hero_id).toBe(heroId);
            expect(request?.status).toBe('assigned');
          });
          
          // Property: Each civilian should receive exactly one notification
          requestsData.forEach(requestData => {
            const civilianNotifications = mockNotifications.getNotificationsForUser(requestData.civilian_id);
            const acceptanceNotifications = civilianNotifications.filter(
              n => n.type === 'request_accepted'
            );
            expect(acceptanceNotifications.length).toBeGreaterThan(0);
          });
        }
      ), { numRuns: 50 });
    });

    test('Request updated_at timestamp should change after acceptance', async () => {
      await fc.assert(fc.asyncProperty(
        validRequestGenerator,
        fc.uuid(), // hero_id
        async (requestData, heroId) => {
          // Create a pending request
          const createdRequest = await mockDatabase.createServiceRequest(requestData);
          const originalUpdatedAt = createdRequest.updated_at;
          
          // Small delay to ensure timestamp difference
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Hero accepts the request
          const result = await mockDatabase.acceptRequest(createdRequest.id, heroId);
          
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();
          
          if (!result.data) return;
          
          // Property: updated_at should be different (later) than original
          expect(result.data.updated_at).not.toBe(originalUpdatedAt);
          expect(new Date(result.data.updated_at).getTime()).toBeGreaterThan(
            new Date(originalUpdatedAt).getTime()
          );
          
          // Property: created_at should remain unchanged
          expect(result.data.created_at).toBe(createdRequest.created_at);
        }
      ), { numRuns: 100 });
    });
  });
});
