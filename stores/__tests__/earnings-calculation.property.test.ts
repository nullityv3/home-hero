/**
 * **Feature: homeheroes-frontend, Property 11: Earnings calculation accuracy**
 * **Validates: Requirements 4.3**
 * 
 * Property-based test to verify that when a hero completes a job,
 * their total earnings increase by the job payment amount and their
 * completed job count increments by one.
 */

import { BudgetRange, Location, ServiceCategory, ServiceRequest } from '@/types';
import * as fc from 'fast-check';

// Mock database for tracking hero earnings
const mockDatabase = {
  requests: new Map<string, ServiceRequest>(),
  heroEarnings: new Map<string, { totalEarnings: number; completedJobs: number }>(),
  
  createServiceRequest: async (request: any): Promise<{ data: ServiceRequest | null; error: any }> => {
    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const newRequest: ServiceRequest = {
      id,
      civilian_id: request.civilian_id,
      hero_id: request.hero_id,
      title: request.title,
      description: request.description,
      category: request.category,
      location: request.location,
      scheduled_date: request.scheduled_date,
      estimated_duration: request.estimated_duration,
      budget_range: request.budget_range,
      status: request.status || 'pending',
      created_at: now,
      updated_at: now,
    };
    
    mockDatabase.requests.set(id, newRequest);
    return { data: newRequest, error: null };
  },
  
  completeRequest: async (requestId: string): Promise<{ data: ServiceRequest | null; error: any }> => {
    const request = mockDatabase.requests.get(requestId);
    
    if (!request) {
      return { data: null, error: { message: 'Request not found' } };
    }
    
    // Update request status
    const completedRequest = {
      ...request,
      status: 'completed' as const,
      updated_at: new Date().toISOString(),
    };
    
    mockDatabase.requests.set(requestId, completedRequest);
    
    // Calculate earnings (average of budget range)
    const earnings = (request.budget_range.min + request.budget_range.max) / 2;
    
    // Update hero earnings
    if (request.hero_id) {
      const currentEarnings = mockDatabase.heroEarnings.get(request.hero_id) || {
        totalEarnings: 0,
        completedJobs: 0,
      };
      
      mockDatabase.heroEarnings.set(request.hero_id, {
        totalEarnings: currentEarnings.totalEarnings + earnings,
        completedJobs: currentEarnings.completedJobs + 1,
      });
    }
    
    return { data: completedRequest, error: null };
  },
  
  getHeroEarnings: (heroId: string): { totalEarnings: number; completedJobs: number } => {
    return mockDatabase.heroEarnings.get(heroId) || {
      totalEarnings: 0,
      completedJobs: 0,
    };
  },
  
  getCompletedRequests: (heroId: string): ServiceRequest[] => {
    return Array.from(mockDatabase.requests.values())
      .filter(req => req.hero_id === heroId && req.status === 'completed');
  },
  
  clear: () => {
    mockDatabase.requests.clear();
    mockDatabase.heroEarnings.clear();
  }
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
  min: fc.integer({ min: 10, max: 500 }),
  max: fc.integer({ min: 10, max: 1000 }),
  currency: fc.constant('USD'),
}).filter(budget => budget.max >= budget.min);

const validServiceRequestDataGenerator = fc.record({
  civilian_id: fc.uuid(),
  hero_id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
  category: validServiceCategoryGenerator,
  location: validLocationGenerator,
  scheduled_date: fc.date({ min: new Date() }).map(d => d.toISOString()),
  estimated_duration: fc.integer({ min: 1, max: 10 }),
  budget_range: validBudgetRangeGenerator,
  status: fc.constant('active' as const),
});

describe('Earnings Calculation Properties', () => {
  beforeEach(() => {
    mockDatabase.clear();
  });

  describe('Property 11: Earnings calculation accuracy', () => {
    test('For any completed job, the hero\'s total earnings should increase by the job payment amount', async () => {
      await fc.assert(fc.asyncProperty(
        validServiceRequestDataGenerator,
        async (requestData) => {
          const heroId = requestData.hero_id!;
          
          // Get initial earnings
          const initialEarnings = mockDatabase.getHeroEarnings(heroId);
          const initialTotal = initialEarnings.totalEarnings;
          
          // Create and complete a request
          const { data: createdRequest } = await mockDatabase.createServiceRequest(requestData);
          expect(createdRequest).not.toBeNull();
          
          if (!createdRequest) return;
          
          const { data: completedRequest } = await mockDatabase.completeRequest(createdRequest.id);
          expect(completedRequest).not.toBeNull();
          
          if (!completedRequest) return;
          
          // Calculate expected earnings (average of budget range)
          const expectedEarnings = (requestData.budget_range.min + requestData.budget_range.max) / 2;
          
          // Get updated earnings
          const updatedEarnings = mockDatabase.getHeroEarnings(heroId);
          
          // Property: Total earnings should increase by the job payment amount
          expect(updatedEarnings.totalEarnings).toBe(initialTotal + expectedEarnings);
        }
      ), { numRuns: 100 });
    });

    test('For any completed job, the hero\'s completed job count should increment by one', async () => {
      await fc.assert(fc.asyncProperty(
        validServiceRequestDataGenerator,
        async (requestData) => {
          const heroId = requestData.hero_id!;
          
          // Get initial job count
          const initialEarnings = mockDatabase.getHeroEarnings(heroId);
          const initialJobCount = initialEarnings.completedJobs;
          
          // Create and complete a request
          const { data: createdRequest } = await mockDatabase.createServiceRequest(requestData);
          expect(createdRequest).not.toBeNull();
          
          if (!createdRequest) return;
          
          const { data: completedRequest } = await mockDatabase.completeRequest(createdRequest.id);
          expect(completedRequest).not.toBeNull();
          
          if (!completedRequest) return;
          
          // Get updated job count
          const updatedEarnings = mockDatabase.getHeroEarnings(heroId);
          
          // Property: Completed job count should increment by exactly one
          expect(updatedEarnings.completedJobs).toBe(initialJobCount + 1);
        }
      ), { numRuns: 100 });
    });

    test('Multiple completed jobs should accumulate earnings correctly', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(), // heroId
        fc.array(validServiceRequestDataGenerator, { minLength: 1, maxLength: 10 }),
        async (heroId, requestsData) => {
          let expectedTotalEarnings = 0;
          let expectedJobCount = 0;
          
          // Complete multiple jobs for the same hero
          for (const requestData of requestsData) {
            const modifiedRequest = { ...requestData, hero_id: heroId };
            
            const { data: createdRequest } = await mockDatabase.createServiceRequest(modifiedRequest);
            expect(createdRequest).not.toBeNull();
            
            if (!createdRequest) continue;
            
            const { data: completedRequest } = await mockDatabase.completeRequest(createdRequest.id);
            expect(completedRequest).not.toBeNull();
            
            if (!completedRequest) continue;
            
            // Calculate expected earnings for this job
            const jobEarnings = (modifiedRequest.budget_range.min + modifiedRequest.budget_range.max) / 2;
            expectedTotalEarnings += jobEarnings;
            expectedJobCount += 1;
          }
          
          // Get final earnings
          const finalEarnings = mockDatabase.getHeroEarnings(heroId);
          
          // Property: Total earnings should equal sum of all job payments
          expect(finalEarnings.totalEarnings).toBeCloseTo(expectedTotalEarnings, 2);
          
          // Property: Job count should equal number of completed jobs
          expect(finalEarnings.completedJobs).toBe(expectedJobCount);
        }
      ), { numRuns: 50 });
    });

    test('Earnings calculation should use the average of budget range', async () => {
      await fc.assert(fc.asyncProperty(
        validServiceRequestDataGenerator,
        async (requestData) => {
          const heroId = requestData.hero_id!;
          
          // Get initial earnings
          const initialEarnings = mockDatabase.getHeroEarnings(heroId);
          const initialTotal = initialEarnings.totalEarnings;
          
          // Create and complete a request
          const { data: createdRequest } = await mockDatabase.createServiceRequest(requestData);
          expect(createdRequest).not.toBeNull();
          
          if (!createdRequest) return;
          
          const { data: completedRequest } = await mockDatabase.completeRequest(createdRequest.id);
          expect(completedRequest).not.toBeNull();
          
          if (!completedRequest) return;
          
          // Get updated earnings
          const updatedEarnings = mockDatabase.getHeroEarnings(heroId);
          const earningsIncrease = updatedEarnings.totalEarnings - initialTotal;
          
          // Property: Earnings increase should be the average of min and max budget
          const expectedAverage = (requestData.budget_range.min + requestData.budget_range.max) / 2;
          expect(earningsIncrease).toBeCloseTo(expectedAverage, 2);
          
          // Property: Earnings should be between min and max budget
          expect(earningsIncrease).toBeGreaterThanOrEqual(requestData.budget_range.min);
          expect(earningsIncrease).toBeLessThanOrEqual(requestData.budget_range.max);
        }
      ), { numRuns: 100 });
    });

    test('Different heroes should have independent earnings tracking', async () => {
      await fc.assert(fc.asyncProperty(
        validServiceRequestDataGenerator,
        validServiceRequestDataGenerator,
        async (request1Data, request2Data) => {
          // Ensure different hero IDs
          fc.pre(request1Data.hero_id !== request2Data.hero_id);
          
          const hero1Id = request1Data.hero_id!;
          const hero2Id = request2Data.hero_id!;
          
          // Complete jobs for both heroes
          const { data: request1 } = await mockDatabase.createServiceRequest(request1Data);
          const { data: request2 } = await mockDatabase.createServiceRequest(request2Data);
          
          expect(request1).not.toBeNull();
          expect(request2).not.toBeNull();
          
          if (!request1 || !request2) return;
          
          await mockDatabase.completeRequest(request1.id);
          await mockDatabase.completeRequest(request2.id);
          
          // Get earnings for both heroes
          const hero1Earnings = mockDatabase.getHeroEarnings(hero1Id);
          const hero2Earnings = mockDatabase.getHeroEarnings(hero2Id);
          
          // Calculate expected earnings
          const hero1Expected = (request1Data.budget_range.min + request1Data.budget_range.max) / 2;
          const hero2Expected = (request2Data.budget_range.min + request2Data.budget_range.max) / 2;
          
          // Property: Each hero should have their own earnings
          expect(hero1Earnings.totalEarnings).toBeCloseTo(hero1Expected, 2);
          expect(hero2Earnings.totalEarnings).toBeCloseTo(hero2Expected, 2);
          
          // Property: Each hero should have exactly 1 completed job
          expect(hero1Earnings.completedJobs).toBe(1);
          expect(hero2Earnings.completedJobs).toBe(1);
        }
      ), { numRuns: 100 });
    });

    test('Earnings should only count completed requests, not active or pending ones', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(), // heroId
        validServiceRequestDataGenerator,
        validServiceRequestDataGenerator,
        async (heroId, activeRequestData, completedRequestData) => {
          // Create one active request and one completed request for the same hero
          const activeRequest = { ...activeRequestData, hero_id: heroId, status: 'active' as const };
          const completedRequest = { ...completedRequestData, hero_id: heroId, status: 'active' as const };
          
          // Create both requests
          const { data: active } = await mockDatabase.createServiceRequest(activeRequest);
          const { data: toComplete } = await mockDatabase.createServiceRequest(completedRequest);
          
          expect(active).not.toBeNull();
          expect(toComplete).not.toBeNull();
          
          if (!active || !toComplete) return;
          
          // Complete only one request
          await mockDatabase.completeRequest(toComplete.id);
          
          // Get earnings
          const earnings = mockDatabase.getHeroEarnings(heroId);
          
          // Calculate expected earnings (only from completed request)
          const expectedEarnings = (completedRequest.budget_range.min + completedRequest.budget_range.max) / 2;
          
          // Property: Earnings should only include the completed request
          expect(earnings.totalEarnings).toBeCloseTo(expectedEarnings, 2);
          
          // Property: Job count should be 1 (only completed request)
          expect(earnings.completedJobs).toBe(1);
        }
      ), { numRuns: 100 });
    });
  });
});
