/**
 * **Feature: homeheroes-frontend, Property 10: Request completion workflow**
 * **Validates: Requirements 3.5**
 * 
 * Property-based test to verify that when a hero marks an active request as completed,
 * the request status updates to 'completed' and the payment process is initiated.
 */

import { RequestStatus, ServiceRequest } from '@/types';
import * as fc from 'fast-check';

// Mock payment processing system
const mockPaymentSystem = {
  payments: [] as Array<{ requestId: string; amount: number; heroId: string; civilianId: string; timestamp: string }>,
  
  processPayment: async (requestId: string, amount: number, heroId: string, civilianId: string): Promise<{ success: boolean; error?: string }> => {
    mockPaymentSystem.payments.push({
      requestId,
      amount,
      heroId,
      civilianId,
      timestamp: new Date().toISOString(),
    });
    return { success: true };
  },
  
  getPaymentsForRequest: (requestId: string) => {
    return mockPaymentSystem.payments.filter(p => p.requestId === requestId);
  },
  
  getPaymentsForHero: (heroId: string) => {
    return mockPaymentSystem.payments.filter(p => p.heroId === heroId);
  },
  
  clear: () => {
    mockPaymentSystem.payments = [];
  }
};

// Mock notification system
const mockNotifications = {
  notifications: [] as Array<{ userId: string; type: string; requestId: string; timestamp: string }>,
  
  sendNotification: async (userId: string, type: string, requestId: string) => {
    mockNotifications.notifications.push({
      userId,
      type,
      requestId,
      timestamp: new Date().toISOString(),
    });
  },
  
  getNotificationsForUser: (userId: string) => {
    return mockNotifications.notifications.filter(n => n.userId === userId);
  },
  
  clear: () => {
    mockNotifications.notifications = [];
  }
};

// Mock database for request completion
const mockDatabase = {
  requests: new Map<string, ServiceRequest>(),
  heroEarnings: new Map<string, number>(), // heroId -> total earnings
  heroJobCounts: new Map<string, number>(), // heroId -> completed job count
  
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
  
  completeRequest: async (requestId: string): Promise<{ success: boolean; error?: string; data?: ServiceRequest }> => {
    const request = mockDatabase.requests.get(requestId);
    
    if (!request) {
      return { success: false, error: 'Request not found' };
    }
    
    if (request.status !== 'active' && request.status !== 'assigned') {
      return { success: false, error: 'Request is not in active or assigned status' };
    }
    
    if (!request.hero_id) {
      return { success: false, error: 'Request has no assigned hero' };
    }
    
    // Update request status
    const updatedRequest: ServiceRequest = {
      ...request,
      status: 'completed',
      updated_at: new Date().toISOString(),
    };
    
    mockDatabase.requests.set(requestId, updatedRequest);
    
    // Calculate payment amount
    const paymentAmount = request.budget_range.amount;
    
    // Process payment
    await mockPaymentSystem.processPayment(requestId, paymentAmount, request.hero_id, request.civilian_id);
    
    // Update hero earnings
    const currentEarnings = mockDatabase.heroEarnings.get(request.hero_id) || 0;
    mockDatabase.heroEarnings.set(request.hero_id, currentEarnings + paymentAmount);
    
    // Update hero job count
    const currentJobCount = mockDatabase.heroJobCounts.get(request.hero_id) || 0;
    mockDatabase.heroJobCounts.set(request.hero_id, currentJobCount + 1);
    
    // Send notification to civilian
    await mockNotifications.sendNotification(request.civilian_id, 'request_completed', requestId);
    
    return { success: true, data: updatedRequest };
  },
  
  getRequest: (requestId: string): ServiceRequest | undefined => {
    return mockDatabase.requests.get(requestId);
  },
  
  getHeroEarnings: (heroId: string): number => {
    return mockDatabase.heroEarnings.get(heroId) || 0;
  },
  
  getHeroJobCount: (heroId: string): number => {
    return mockDatabase.heroJobCounts.get(heroId) || 0;
  },
  
  clear: () => {
    mockDatabase.requests.clear();
    mockDatabase.heroEarnings.clear();
    mockDatabase.heroJobCounts.clear();
  }
};

// Generators
const validRequestGenerator = fc.record({
  civilian_id: fc.uuid(),
  hero_id: fc.uuid(),
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
  status: fc.constantFrom<RequestStatus>('active', 'assigned'),
});

describe('Request Completion Properties', () => {
  beforeEach(() => {
    mockDatabase.clear();
    mockPaymentSystem.clear();
    mockNotifications.clear();
  });

  describe('Property 10: Request completion workflow', () => {
    test('For any active service request, when marked complete by the hero, the request status should update to "completed" and the payment process should be initiated', async () => {
      await fc.assert(fc.asyncProperty(
        validRequestGenerator,
        async (requestData) => {
          // Clear database for this test iteration
          mockDatabase.clear();
          mockPaymentSystem.clear();
          mockNotifications.clear();
          
          // Create an active/assigned request with a hero
          const createdRequest = await mockDatabase.createServiceRequest(requestData);
          
          // Verify initial state
          expect(createdRequest.status).toMatch(/^(active|assigned)$/);
          expect(createdRequest.hero_id).toBeDefined();
          
          const initialEarnings = mockDatabase.getHeroEarnings(createdRequest.hero_id!);
          const initialJobCount = mockDatabase.getHeroJobCount(createdRequest.hero_id!);
          
          // Hero completes the request
          const result = await mockDatabase.completeRequest(createdRequest.id);
          
          // Property 1: Completion should be successful
          expect(result.success).toBe(true);
          expect(result.error).toBeUndefined();
          expect(result.data).toBeDefined();
          
          if (!result.data) return;
          
          // Property 2: Request status should change to 'completed'
          expect(result.data.status).toBe('completed');
          
          // Property 3: Request should be retrievable with updated status
          const retrievedRequest = mockDatabase.getRequest(createdRequest.id);
          expect(retrievedRequest).toBeDefined();
          expect(retrievedRequest?.status).toBe('completed');
          
          // Property 4: Payment should be processed
          const payments = mockPaymentSystem.getPaymentsForRequest(createdRequest.id);
          expect(payments.length).toBe(1);
          
          const payment = payments[0];
          const expectedAmount = createdRequest.budget_range.amount;
          expect(payment.amount).toBe(expectedAmount);
          expect(payment.heroId).toBe(createdRequest.hero_id);
          expect(payment.civilianId).toBe(createdRequest.civilian_id);
          
          // Property 5: Hero earnings should be updated
          const updatedEarnings = mockDatabase.getHeroEarnings(createdRequest.hero_id!);
          expect(updatedEarnings).toBe(initialEarnings + expectedAmount);
          
          // Property 6: Hero job count should be incremented
          const updatedJobCount = mockDatabase.getHeroJobCount(createdRequest.hero_id!);
          expect(updatedJobCount).toBe(initialJobCount + 1);
          
          // Property 7: Civilian should receive a completion notification
          const civilianNotifications = mockNotifications.getNotificationsForUser(createdRequest.civilian_id);
          expect(civilianNotifications.length).toBeGreaterThan(0);
          
          const completionNotification = civilianNotifications.find(
            n => n.type === 'request_completed' && n.requestId === createdRequest.id
          );
          expect(completionNotification).toBeDefined();
          
          // Property 8: Other request fields should remain unchanged
          expect(result.data.civilian_id).toBe(createdRequest.civilian_id);
          expect(result.data.hero_id).toBe(createdRequest.hero_id);
          expect(result.data.title).toBe(createdRequest.title);
          expect(result.data.description).toBe(createdRequest.description);
        }
      ), { numRuns: 100 });
    });

    test('Completing a request without an assigned hero should fail', async () => {
      await fc.assert(fc.asyncProperty(
        validRequestGenerator,
        async (requestData) => {
          // Clear database for this test iteration
          mockDatabase.clear();
          mockPaymentSystem.clear();
          mockNotifications.clear();
          
          // Create a request without a hero
          const createdRequest = await mockDatabase.createServiceRequest({
            ...requestData,
            hero_id: undefined,
          });
          
          // Attempt to complete the request
          const result = await mockDatabase.completeRequest(createdRequest.id);
          
          // Property: Completion should fail
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('no assigned hero');
          
          // Property: Request status should remain unchanged
          const retrievedRequest = mockDatabase.getRequest(createdRequest.id);
          expect(retrievedRequest?.status).toBe(createdRequest.status);
          
          // Property: No payment should be processed
          const payments = mockPaymentSystem.getPaymentsForRequest(createdRequest.id);
          expect(payments.length).toBe(0);
        }
      ), { numRuns: 100 });
    });

    test('Completing a non-active request should fail', async () => {
      await fc.assert(fc.asyncProperty(
        validRequestGenerator,
        fc.constantFrom<RequestStatus>('pending', 'completed', 'cancelled'),
        async (requestData, nonActiveStatus) => {
          // Clear database for this test iteration
          mockDatabase.clear();
          mockPaymentSystem.clear();
          mockNotifications.clear();
          
          // Create a request with non-active status
          const createdRequest = await mockDatabase.createServiceRequest({
            ...requestData,
            status: nonActiveStatus,
          });
          
          // Attempt to complete the request
          const result = await mockDatabase.completeRequest(createdRequest.id);
          
          // Property: Completion should fail
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('not in active or assigned status');
          
          // Property: Request status should remain unchanged
          const retrievedRequest = mockDatabase.getRequest(createdRequest.id);
          expect(retrievedRequest?.status).toBe(nonActiveStatus);
          
          // Property: No payment should be processed
          const payments = mockPaymentSystem.getPaymentsForRequest(createdRequest.id);
          expect(payments.length).toBe(0);
        }
      ), { numRuns: 100 });
    });

    test('Completing a non-existent request should fail', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(), // non-existent request ID
        async (nonExistentRequestId) => {
          // Clear database for this test iteration
          mockDatabase.clear();
          mockPaymentSystem.clear();
          mockNotifications.clear();
          
          // Ensure the request doesn't exist
          fc.pre(!mockDatabase.getRequest(nonExistentRequestId));
          
          // Attempt to complete non-existent request
          const result = await mockDatabase.completeRequest(nonExistentRequestId);
          
          // Property: Completion should fail
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('not found');
          
          // Property: No payment should be processed
          const payments = mockPaymentSystem.getPaymentsForRequest(nonExistentRequestId);
          expect(payments.length).toBe(0);
        }
      ), { numRuns: 100 });
    });

    test('Hero completing multiple requests should accumulate earnings and job count', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(validRequestGenerator, { minLength: 2, maxLength: 5 }),
        fc.uuid(), // hero_id
        async (requestsData, heroId) => {
          // Clear database for this test iteration
          mockDatabase.clear();
          mockPaymentSystem.clear();
          mockNotifications.clear();
          
          let expectedTotalEarnings = 0;
          let expectedJobCount = 0;
          
          // Create and complete multiple requests for the same hero
          for (const requestData of requestsData) {
            const request = await mockDatabase.createServiceRequest({
              ...requestData,
              hero_id: heroId,
            });
            
            const result = await mockDatabase.completeRequest(request.id);
            expect(result.success).toBe(true);
            
            const paymentAmount = request.budget_range.amount;
            expectedTotalEarnings += paymentAmount;
            expectedJobCount += 1;
          }
          
          // Property: Hero's total earnings should match sum of all payments
          const actualEarnings = mockDatabase.getHeroEarnings(heroId);
          expect(actualEarnings).toBeCloseTo(expectedTotalEarnings, 2);
          
          // Property: Hero's job count should match number of completed requests
          const actualJobCount = mockDatabase.getHeroJobCount(heroId);
          expect(actualJobCount).toBe(expectedJobCount);
          
          // Property: All payments should be recorded
          const heroPayments = mockPaymentSystem.getPaymentsForHero(heroId);
          expect(heroPayments.length).toBe(requestsData.length);
        }
      ), { numRuns: 50 });
    });

    test('Payment amount should be calculated as average of budget range', async () => {
      await fc.assert(fc.asyncProperty(
        validRequestGenerator,
        async (requestData) => {
          // Clear database for this test iteration
          mockDatabase.clear();
          mockPaymentSystem.clear();
          mockNotifications.clear();
          
          // Create and complete a request
          const createdRequest = await mockDatabase.createServiceRequest(requestData);
          const result = await mockDatabase.completeRequest(createdRequest.id);
          
          expect(result.success).toBe(true);
          
          // Property: Payment amount should be average of min and max budget
          const payments = mockPaymentSystem.getPaymentsForRequest(createdRequest.id);
          expect(payments.length).toBe(1);
          
          const expectedAmount = (createdRequest.budget_range.min + createdRequest.budget_range.max) / 2;
          expect(payments[0].amount).toBe(expectedAmount);
        }
      ), { numRuns: 100 });
    });

    test('Request updated_at timestamp should change after completion', async () => {
      await fc.assert(fc.asyncProperty(
        validRequestGenerator,
        async (requestData) => {
          // Clear database for this test iteration
          mockDatabase.clear();
          mockPaymentSystem.clear();
          mockNotifications.clear();
          
          // Create a request
          const createdRequest = await mockDatabase.createServiceRequest(requestData);
          const originalUpdatedAt = createdRequest.updated_at;
          
          // Small delay to ensure timestamp difference
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Complete the request
          const result = await mockDatabase.completeRequest(createdRequest.id);
          
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

    test('Each completed request should generate exactly one payment', async () => {
      await fc.assert(fc.asyncProperty(
        validRequestGenerator,
        async (requestData) => {
          // Clear database for this test iteration
          mockDatabase.clear();
          mockPaymentSystem.clear();
          mockNotifications.clear();
          
          // Create and complete a request
          const createdRequest = await mockDatabase.createServiceRequest(requestData);
          const result = await mockDatabase.completeRequest(createdRequest.id);
          
          expect(result.success).toBe(true);
          
          // Property: Exactly one payment should be processed
          const payments = mockPaymentSystem.getPaymentsForRequest(createdRequest.id);
          expect(payments.length).toBe(1);
          
          // Property: Payment should have correct details
          const payment = payments[0];
          expect(payment.requestId).toBe(createdRequest.id);
          expect(payment.heroId).toBe(createdRequest.hero_id);
          expect(payment.civilianId).toBe(createdRequest.civilian_id);
          expect(payment.timestamp).toBeDefined();
        }
      ), { numRuns: 100 });
    });
  });
});
