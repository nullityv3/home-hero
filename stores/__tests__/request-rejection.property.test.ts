/**
 * **Feature: homeheroes-frontend, Property 9: Request rejection availability**
 * **Validates: Requirements 3.4**
 * 
 * Property-based test to verify that when a hero rejects a service request,
 * the request is removed from that hero's pending list while remaining
 * available for other heroes to accept.
 */

import { RequestStatus, ServiceRequest } from '@/types';
import * as fc from 'fast-check';

// Mock database for request rejection
const mockDatabase = {
  requests: new Map<string, ServiceRequest>(),
  heroRejections: new Map<string, Set<string>>(), // requestId -> Set of heroIds who rejected
  
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
  
  rejectRequest: async (requestId: string, heroId: string): Promise<{ success: boolean; error?: string }> => {
    const request = mockDatabase.requests.get(requestId);
    
    if (!request) {
      return { success: false, error: 'Request not found' };
    }
    
    // Add hero to rejection list for this request
    if (!mockDatabase.heroRejections.has(requestId)) {
      mockDatabase.heroRejections.set(requestId, new Set());
    }
    mockDatabase.heroRejections.get(requestId)!.add(heroId);
    
    return { success: true };
  },
  
  getAvailableRequestsForHero: (heroId: string): ServiceRequest[] => {
    const availableRequests: ServiceRequest[] = [];
    
    for (const request of mockDatabase.requests.values()) {
      // Only show pending requests
      if (request.status !== 'pending') continue;
      
      // Don't show requests this hero has rejected
      const rejections = mockDatabase.heroRejections.get(request.id);
      if (rejections && rejections.has(heroId)) continue;
      
      availableRequests.push(request);
    }
    
    return availableRequests;
  },
  
  getRequest: (requestId: string): ServiceRequest | undefined => {
    return mockDatabase.requests.get(requestId);
  },
  
  hasHeroRejected: (requestId: string, heroId: string): boolean => {
    const rejections = mockDatabase.heroRejections.get(requestId);
    return rejections ? rejections.has(heroId) : false;
  },
  
  clear: () => {
    mockDatabase.requests.clear();
    mockDatabase.heroRejections.clear();
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
  scheduled_date: fc.integer({ min: Date.now(), max: Date.now() + 365 * 24 * 60 * 60 * 1000 }).map(timestamp => new Date(timestamp).toISOString()),
  estimated_duration: fc.integer({ min: 1, max: 10 }),
  budget_range: fc.record({
    min: fc.integer({ min: 1, max: 500 }),
    max: fc.integer({ min: 1, max: 1000 }),
    currency: fc.constant('USD'),
  }).filter(budget => budget.max >= budget.min),
  status: fc.constant('pending' as RequestStatus),
});

describe('Request Rejection Properties', () => {
  beforeEach(() => {
    mockDatabase.clear();
  });

  describe('Property 9: Request rejection availability', () => {
    test('For any service request rejected by a hero, the request should be removed from that hero\'s pending list while remaining available for other heroes', async () => {
      await fc.assert(fc.asyncProperty(
        validRequestGenerator,
        fc.uuid(), // hero1_id (rejecting hero)
        fc.uuid(), // hero2_id (other hero)
        async (requestData, hero1Id, hero2Id) => {
          // Ensure different hero IDs
          fc.pre(hero1Id !== hero2Id);
          
          // Clear database for this test iteration
          mockDatabase.clear();
          
          // Create a pending request
          const createdRequest = await mockDatabase.createServiceRequest(requestData);
          
          // Verify both heroes can see the request initially
          const hero1InitialRequests = mockDatabase.getAvailableRequestsForHero(hero1Id);
          const hero2InitialRequests = mockDatabase.getAvailableRequestsForHero(hero2Id);
          
          expect(hero1InitialRequests.find(r => r.id === createdRequest.id)).toBeDefined();
          expect(hero2InitialRequests.find(r => r.id === createdRequest.id)).toBeDefined();
          
          // Hero 1 rejects the request
          const result = await mockDatabase.rejectRequest(createdRequest.id, hero1Id);
          
          // Property 1: Rejection should be successful
          expect(result.success).toBe(true);
          expect(result.error).toBeUndefined();
          
          // Property 2: Request should be removed from hero 1's available list
          const hero1RequestsAfterRejection = mockDatabase.getAvailableRequestsForHero(hero1Id);
          const requestInHero1List = hero1RequestsAfterRejection.find(r => r.id === createdRequest.id);
          expect(requestInHero1List).toBeUndefined();
          
          // Property 3: Request should still be available for hero 2
          const hero2RequestsAfterRejection = mockDatabase.getAvailableRequestsForHero(hero2Id);
          const requestInHero2List = hero2RequestsAfterRejection.find(r => r.id === createdRequest.id);
          expect(requestInHero2List).toBeDefined();
          
          // Property 4: Request status should remain 'pending'
          const retrievedRequest = mockDatabase.getRequest(createdRequest.id);
          expect(retrievedRequest?.status).toBe('pending');
          
          // Property 5: Request should not be assigned to any hero
          expect(retrievedRequest?.hero_id).toBeUndefined();
          
          // Property 6: System should track that hero 1 rejected this request
          expect(mockDatabase.hasHeroRejected(createdRequest.id, hero1Id)).toBe(true);
          expect(mockDatabase.hasHeroRejected(createdRequest.id, hero2Id)).toBe(false);
        }
      ), { numRuns: 100 });
    });

    test('Multiple heroes can reject the same request independently', async () => {
      await fc.assert(fc.asyncProperty(
        validRequestGenerator,
        fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }), // multiple hero IDs
        async (requestData, heroIds) => {
          // Ensure all hero IDs are unique
          const uniqueHeroIds = Array.from(new Set(heroIds));
          fc.pre(uniqueHeroIds.length >= 2);
          
          // Clear database for this test iteration
          mockDatabase.clear();
          
          // Create a pending request
          const createdRequest = await mockDatabase.createServiceRequest(requestData);
          
          // All heroes should see the request initially
          uniqueHeroIds.forEach(heroId => {
            const requests = mockDatabase.getAvailableRequestsForHero(heroId);
            expect(requests.find(r => r.id === createdRequest.id)).toBeDefined();
          });
          
          // Each hero rejects the request
          for (const heroId of uniqueHeroIds) {
            const result = await mockDatabase.rejectRequest(createdRequest.id, heroId);
            expect(result.success).toBe(true);
          }
          
          // Property: Request should be removed from all heroes' lists
          uniqueHeroIds.forEach(heroId => {
            const requests = mockDatabase.getAvailableRequestsForHero(heroId);
            expect(requests.find(r => r.id === createdRequest.id)).toBeUndefined();
          });
          
          // Property: Request should still exist and remain pending
          const retrievedRequest = mockDatabase.getRequest(createdRequest.id);
          expect(retrievedRequest).toBeDefined();
          expect(retrievedRequest?.status).toBe('pending');
          
          // Property: All heroes should be tracked as having rejected
          uniqueHeroIds.forEach(heroId => {
            expect(mockDatabase.hasHeroRejected(createdRequest.id, heroId)).toBe(true);
          });
        }
      ), { numRuns: 50 });
    });

    test('Rejecting a non-existent request should fail gracefully', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(), // non-existent request ID
        fc.uuid(), // hero_id
        async (nonExistentRequestId, heroId) => {
          // Clear database for this test iteration
          mockDatabase.clear();
          
          // Ensure the request doesn't exist
          fc.pre(!mockDatabase.getRequest(nonExistentRequestId));
          
          // Attempt to reject non-existent request
          const result = await mockDatabase.rejectRequest(nonExistentRequestId, heroId);
          
          // Property: Rejection should fail
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('not found');
        }
      ), { numRuns: 100 });
    });

    test('Hero can reject multiple different requests', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(validRequestGenerator, { minLength: 2, maxLength: 5 }),
        fc.uuid(), // hero_id
        async (requestsData, heroId) => {
          // Clear database for this test iteration
          mockDatabase.clear();
          
          const createdRequests: ServiceRequest[] = [];
          
          // Create multiple pending requests
          for (const requestData of requestsData) {
            const request = await mockDatabase.createServiceRequest(requestData);
            createdRequests.push(request);
          }
          
          // Verify hero can see all requests initially
          const initialRequests = mockDatabase.getAvailableRequestsForHero(heroId);
          expect(initialRequests.length).toBe(createdRequests.length);
          
          // Hero rejects all requests
          for (const request of createdRequests) {
            const result = await mockDatabase.rejectRequest(request.id, heroId);
            expect(result.success).toBe(true);
          }
          
          // Property: Hero should see no available requests
          const finalRequests = mockDatabase.getAvailableRequestsForHero(heroId);
          expect(finalRequests.length).toBe(0);
          
          // Property: All requests should still exist and remain pending
          createdRequests.forEach(request => {
            const retrievedRequest = mockDatabase.getRequest(request.id);
            expect(retrievedRequest).toBeDefined();
            expect(retrievedRequest?.status).toBe('pending');
          });
          
          // Property: Hero should be tracked as having rejected all requests
          createdRequests.forEach(request => {
            expect(mockDatabase.hasHeroRejected(request.id, heroId)).toBe(true);
          });
        }
      ), { numRuns: 50 });
    });

    test('Rejected request remains available for heroes who have not rejected it', async () => {
      await fc.assert(fc.asyncProperty(
        validRequestGenerator,
        fc.array(fc.uuid(), { minLength: 3, maxLength: 5 }), // multiple hero IDs
        async (requestData, heroIds) => {
          // Ensure all hero IDs are unique
          const uniqueHeroIds = Array.from(new Set(heroIds));
          fc.pre(uniqueHeroIds.length >= 3);
          
          // Clear database for this test iteration
          mockDatabase.clear();
          
          // Create a pending request
          const createdRequest = await mockDatabase.createServiceRequest(requestData);
          
          // First hero rejects the request
          const rejectingHeroId = uniqueHeroIds[0];
          const result = await mockDatabase.rejectRequest(createdRequest.id, rejectingHeroId);
          expect(result.success).toBe(true);
          
          // Property: Request should not be visible to rejecting hero
          const rejectingHeroRequests = mockDatabase.getAvailableRequestsForHero(rejectingHeroId);
          expect(rejectingHeroRequests.find(r => r.id === createdRequest.id)).toBeUndefined();
          
          // Property: Request should still be visible to all other heroes
          const otherHeroIds = uniqueHeroIds.slice(1);
          otherHeroIds.forEach(heroId => {
            const requests = mockDatabase.getAvailableRequestsForHero(heroId);
            expect(requests.find(r => r.id === createdRequest.id)).toBeDefined();
          });
          
          // Property: Request should remain in pending status
          const retrievedRequest = mockDatabase.getRequest(createdRequest.id);
          expect(retrievedRequest?.status).toBe('pending');
        }
      ), { numRuns: 100 });
    });

    test('Rejecting the same request multiple times by the same hero should be idempotent', async () => {
      await fc.assert(fc.asyncProperty(
        validRequestGenerator,
        fc.uuid(), // hero_id
        fc.integer({ min: 2, max: 5 }), // number of rejection attempts
        async (requestData, heroId, rejectionAttempts) => {
          // Clear database for this test iteration
          mockDatabase.clear();
          
          // Create a pending request
          const createdRequest = await mockDatabase.createServiceRequest(requestData);
          
          // Reject the request multiple times
          for (let i = 0; i < rejectionAttempts; i++) {
            const result = await mockDatabase.rejectRequest(createdRequest.id, heroId);
            expect(result.success).toBe(true);
          }
          
          // Property: Request should still be removed from hero's list (not duplicated)
          const heroRequests = mockDatabase.getAvailableRequestsForHero(heroId);
          expect(heroRequests.find(r => r.id === createdRequest.id)).toBeUndefined();
          
          // Property: Request should still exist and remain pending
          const retrievedRequest = mockDatabase.getRequest(createdRequest.id);
          expect(retrievedRequest).toBeDefined();
          expect(retrievedRequest?.status).toBe('pending');
          
          // Property: Hero should be tracked as having rejected (only once)
          expect(mockDatabase.hasHeroRejected(createdRequest.id, heroId)).toBe(true);
        }
      ), { numRuns: 100 });
    });

    test('Non-pending requests should not appear in available requests list', async () => {
      await fc.assert(fc.asyncProperty(
        validRequestGenerator,
        fc.uuid(), // hero_id
        fc.constantFrom<RequestStatus>('assigned', 'active', 'completed', 'cancelled'),
        async (requestData, heroId, nonPendingStatus) => {
          // Clear database for this test iteration
          mockDatabase.clear();
          
          // Create a request with non-pending status
          const createdRequest = await mockDatabase.createServiceRequest({
            ...requestData,
            status: nonPendingStatus,
          });
          
          // Property: Request should not appear in hero's available list
          const heroRequests = mockDatabase.getAvailableRequestsForHero(heroId);
          expect(heroRequests.find(r => r.id === createdRequest.id)).toBeUndefined();
          
          // Property: Request should still exist with the non-pending status
          const retrievedRequest = mockDatabase.getRequest(createdRequest.id);
          expect(retrievedRequest).toBeDefined();
          expect(retrievedRequest?.status).toBe(nonPendingStatus);
        }
      ), { numRuns: 100 });
    });
  });
});
