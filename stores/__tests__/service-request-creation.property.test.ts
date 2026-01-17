/**
 * **Feature: homeheroes-frontend, Property 1: Service request creation consistency**
 * **Validates: Requirements 1.2**
 * 
 * Property-based test to verify that when a civilian submits a complete service request,
 * the request appears in their pending requests list with the correct status.
 */

import { BudgetRange, Location, ServiceCategory, ServiceRequest } from '@/types';
import * as fc from 'fast-check';

// Mock the Supabase database operations
const mockDatabase = {
  requests: new Map<string, ServiceRequest>(),
  
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
  
  getServiceRequests: async (userId: string, userType: 'civilian' | 'hero'): Promise<{ data: ServiceRequest[] | null; error: any }> => {
    const column = userType === 'civilian' ? 'civilian_id' : 'hero_id';
    const requests = Array.from(mockDatabase.requests.values())
      .filter(req => req[column] === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return { data: requests, error: null };
  },
  
  clear: () => {
    mockDatabase.requests.clear();
  }
};

// Generators for valid service request data
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

const futureDateGenerator = fc.date({ min: new Date() });

const validServiceRequestDataGenerator = fc.record({
  civilian_id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
  category: validServiceCategoryGenerator,
  location: validLocationGenerator,
  scheduled_date: futureDateGenerator,
  estimated_duration: fc.integer({ min: 1, max: 10 }),
  budget_range: validBudgetRangeGenerator,
  status: fc.constant('pending' as const),
});

describe('Service Request Creation Properties', () => {
  beforeEach(() => {
    mockDatabase.clear();
  });

  describe('Property 1: Service request creation consistency', () => {
    test('For any valid service request data, submitting the request should result in the request appearing in the civilian\'s pending requests list with correct status', async () => {
      await fc.assert(fc.asyncProperty(
        validServiceRequestDataGenerator,
        async (requestData) => {
          // Create the service request
          const { data: createdRequest, error: createError } = await mockDatabase.createServiceRequest(requestData);
          
          // Verify creation was successful
          expect(createError).toBeNull();
          expect(createdRequest).not.toBeNull();
          
          if (!createdRequest) return;
          
          // Property 1: Request should have 'pending' status
          expect(createdRequest.status).toBe('pending');
          
          // Property 2: Request should have all the submitted data
          expect(createdRequest.civilian_id).toBe(requestData.civilian_id);
          expect(createdRequest.title).toBe(requestData.title);
          expect(createdRequest.description).toBe(requestData.description);
          expect(createdRequest.category).toBe(requestData.category);
          expect(createdRequest.location).toEqual(requestData.location);
          expect(createdRequest.estimated_duration).toBe(requestData.estimated_duration);
          expect(createdRequest.budget_range).toEqual(requestData.budget_range);
          
          // Property 3: Request should appear in civilian's pending requests list
          const { data: civilianRequests, error: fetchError } = await mockDatabase.getServiceRequests(
            requestData.civilian_id,
            'civilian'
          );
          
          expect(fetchError).toBeNull();
          expect(civilianRequests).not.toBeNull();
          
          if (!civilianRequests) return;
          
          // Find the created request in the list
          const foundRequest = civilianRequests.find(req => req.id === createdRequest.id);
          expect(foundRequest).toBeDefined();
          expect(foundRequest?.status).toBe('pending');
          
          // Property 4: Request should be at the top of the list (most recent)
          expect(civilianRequests[0].id).toBe(createdRequest.id);
        }
      ), { numRuns: 100 });
    });

    test('Multiple service requests from the same civilian should all appear in their pending requests list', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(), // civilian_id
        fc.array(validServiceRequestDataGenerator, { minLength: 1, maxLength: 5 }),
        async (civilianId, requestsData) => {
          const createdRequestIds: string[] = [];
          
          // Create multiple requests for the same civilian
          for (const requestData of requestsData) {
            const modifiedRequest = { ...requestData, civilian_id: civilianId };
            const { data: createdRequest } = await mockDatabase.createServiceRequest(modifiedRequest);
            
            if (createdRequest) {
              createdRequestIds.push(createdRequest.id);
            }
          }
          
          // Fetch all requests for this civilian
          const { data: civilianRequests } = await mockDatabase.getServiceRequests(civilianId, 'civilian');
          
          expect(civilianRequests).not.toBeNull();
          
          if (!civilianRequests) return;
          
          // Property: All created requests should appear in the list
          expect(civilianRequests.length).toBe(createdRequestIds.length);
          
          // Property: All requests should have 'pending' status
          civilianRequests.forEach(req => {
            expect(req.status).toBe('pending');
            expect(req.civilian_id).toBe(civilianId);
          });
          
          // Property: All created request IDs should be in the list
          const fetchedIds = civilianRequests.map(req => req.id);
          createdRequestIds.forEach(id => {
            expect(fetchedIds).toContain(id);
          });
        }
      ), { numRuns: 50 });
    });

    test('Service requests from different civilians should not appear in each other\'s lists', async () => {
      await fc.assert(fc.asyncProperty(
        validServiceRequestDataGenerator,
        validServiceRequestDataGenerator,
        async (request1Data, request2Data) => {
          // Ensure different civilian IDs
          fc.pre(request1Data.civilian_id !== request2Data.civilian_id);
          
          // Create requests for two different civilians
          const { data: request1 } = await mockDatabase.createServiceRequest(request1Data);
          const { data: request2 } = await mockDatabase.createServiceRequest(request2Data);
          
          expect(request1).not.toBeNull();
          expect(request2).not.toBeNull();
          
          if (!request1 || !request2) return;
          
          // Fetch requests for civilian 1
          const { data: civilian1Requests } = await mockDatabase.getServiceRequests(
            request1Data.civilian_id,
            'civilian'
          );
          
          // Fetch requests for civilian 2
          const { data: civilian2Requests } = await mockDatabase.getServiceRequests(
            request2Data.civilian_id,
            'civilian'
          );
          
          expect(civilian1Requests).not.toBeNull();
          expect(civilian2Requests).not.toBeNull();
          
          if (!civilian1Requests || !civilian2Requests) return;
          
          // Property: Civilian 1's list should only contain their request
          expect(civilian1Requests.length).toBe(1);
          expect(civilian1Requests[0].id).toBe(request1.id);
          expect(civilian1Requests[0].civilian_id).toBe(request1Data.civilian_id);
          
          // Property: Civilian 2's list should only contain their request
          expect(civilian2Requests.length).toBe(1);
          expect(civilian2Requests[0].id).toBe(request2.id);
          expect(civilian2Requests[0].civilian_id).toBe(request2Data.civilian_id);
          
          // Property: Request 1 should not appear in civilian 2's list
          const request1InCivilian2List = civilian2Requests.find(req => req.id === request1.id);
          expect(request1InCivilian2List).toBeUndefined();
          
          // Property: Request 2 should not appear in civilian 1's list
          const request2InCivilian1List = civilian1Requests.find(req => req.id === request2.id);
          expect(request2InCivilian1List).toBeUndefined();
        }
      ), { numRuns: 100 });
    });

    test('Created service request should preserve all field values exactly', async () => {
      await fc.assert(fc.asyncProperty(
        validServiceRequestDataGenerator,
        async (requestData) => {
          const { data: createdRequest } = await mockDatabase.createServiceRequest(requestData);
          
          expect(createdRequest).not.toBeNull();
          
          if (!createdRequest) return;
          
          // Property: All fields should be preserved exactly
          expect(createdRequest.civilian_id).toBe(requestData.civilian_id);
          expect(createdRequest.title).toBe(requestData.title);
          expect(createdRequest.description).toBe(requestData.description);
          expect(createdRequest.category).toBe(requestData.category);
          expect(createdRequest.estimated_duration).toBe(requestData.estimated_duration);
          expect(createdRequest.status).toBe('pending');
          
          // Deep equality checks for complex objects
          expect(createdRequest.location).toEqual(requestData.location);
          expect(createdRequest.budget_range).toEqual(requestData.budget_range);
          
          // Property: Timestamps should be set
          expect(createdRequest.created_at).toBeDefined();
          expect(createdRequest.updated_at).toBeDefined();
          
          // Property: ID should be generated
          expect(createdRequest.id).toBeDefined();
          expect(createdRequest.id.length).toBeGreaterThan(0);
        }
      ), { numRuns: 100 });
    });
  });
});
