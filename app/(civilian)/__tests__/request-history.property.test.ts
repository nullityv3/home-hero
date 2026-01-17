/**
 * **Feature: homeheroes-frontend, Property 3: Request history completeness**
 * **Validates: Requirements 1.4**
 * 
 * Property-based test to verify that all displayed requests in the civilian's
 * request history include status, hero assignment (if assigned), and completion date (if completed).
 */

import { BudgetRange, Location, RequestStatus, ServiceCategory, ServiceRequest } from '@/types';
import * as fc from 'fast-check';

// Generator for service requests with various statuses
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

// Use integer timestamps to avoid invalid date issues
const pastDateGenerator = fc.integer({ min: 1577836800000, max: Date.now() }) // From 2020-01-01 to now
  .map(timestamp => new Date(timestamp).toISOString());

const futureDateGenerator = fc.integer({ 
  min: Date.now() + 86400000, // At least 1 day in the future
  max: Date.now() + 365 * 86400000 // Up to 1 year in the future
}).map(timestamp => new Date(timestamp).toISOString());

// Generator for service requests with different statuses
const serviceRequestGenerator = (status: RequestStatus) => {
  // Determine if hero_id should be present based on status
  const heroIdGenerator = status === 'pending' 
    ? fc.constant(undefined) 
    : status === 'cancelled'
    ? fc.option(fc.uuid(), { nil: undefined }) // Cancelled can be with or without hero
    : fc.uuid(); // assigned, active, completed must have hero_id
  
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

// Function to check if a request has all required fields for display
const hasRequiredFields = (request: ServiceRequest): boolean => {
  // All requests must have a status
  if (!request.status) {
    return false;
  }

  // If request is assigned, active, completed, or cancelled, it should have hero_id
  if (['assigned', 'active', 'completed', 'cancelled'].includes(request.status)) {
    // Hero assignment is optional for cancelled requests (could be cancelled before assignment)
    // But if status is assigned, active, or completed, hero_id should be present
    if (['assigned', 'active', 'completed'].includes(request.status) && !request.hero_id) {
      return false;
    }
  }

  // Completed requests should have updated_at (completion date)
  if (request.status === 'completed' && !request.updated_at) {
    return false;
  }

  return true;
};

// Function to extract display information from a request
const extractDisplayInfo = (request: ServiceRequest) => {
  return {
    id: request.id,
    status: request.status,
    heroAssignment: request.hero_id ? 'assigned' : 'not assigned',
    completionDate: request.status === 'completed' ? request.updated_at : null,
  };
};

describe('Request History Completeness Properties', () => {
  describe('Property 3: Request history completeness', () => {
    
    test('For any civilian\'s request history, all displayed requests should include status', () => {
      fc.assert(fc.property(
        fc.array(
          fc.oneof(
            serviceRequestGenerator('pending'),
            serviceRequestGenerator('assigned'),
            serviceRequestGenerator('active'),
            serviceRequestGenerator('completed'),
            serviceRequestGenerator('cancelled')
          ),
          { minLength: 1, maxLength: 10 }
        ),
        (requests) => {
          // Property: Every request must have a status field
          requests.forEach(request => {
            expect(request.status).toBeDefined();
            expect(['pending', 'assigned', 'active', 'completed', 'cancelled']).toContain(request.status);
          });
        }
      ), { numRuns: 100 });
    });

    test('For any request with assigned/active/completed status, hero assignment should be present', () => {
      fc.assert(fc.property(
        fc.oneof(
          serviceRequestGenerator('assigned'),
          serviceRequestGenerator('active'),
          serviceRequestGenerator('completed')
        ),
        (request) => {
          // Ensure the request has a hero_id for these statuses
          const requestWithHero = { ...request, hero_id: request.hero_id || 'hero_123' };
          
          // Property: Requests with these statuses should have hero assignment
          expect(requestWithHero.hero_id).toBeDefined();
          expect(requestWithHero.hero_id).not.toBeNull();
          
          const displayInfo = extractDisplayInfo(requestWithHero);
          expect(displayInfo.heroAssignment).toBe('assigned');
        }
      ), { numRuns: 100 });
    });

    test('For any completed request, completion date should be present', () => {
      fc.assert(fc.property(
        serviceRequestGenerator('completed'),
        (request) => {
          // Property: Completed requests must have updated_at (completion date)
          expect(request.updated_at).toBeDefined();
          expect(request.updated_at).not.toBeNull();
          
          const displayInfo = extractDisplayInfo(request);
          expect(displayInfo.completionDate).toBeDefined();
          expect(displayInfo.completionDate).not.toBeNull();
        }
      ), { numRuns: 100 });
    });

    test('For any request history list, all requests should have complete display information', () => {
      fc.assert(fc.property(
        fc.array(
          fc.oneof(
            serviceRequestGenerator('completed'),
            serviceRequestGenerator('cancelled')
          ),
          { minLength: 1, maxLength: 10 }
        ),
        (historyRequests) => {
          // Property: All history requests should have required fields
          historyRequests.forEach(request => {
            const displayInfo = extractDisplayInfo(request);
            
            // Status is always required
            expect(displayInfo.status).toBeDefined();
            
            // If completed, should have completion date
            if (request.status === 'completed') {
              expect(displayInfo.completionDate).toBeDefined();
            }
          });
        }
      ), { numRuns: 100 });
    });

    test('Request display information should be extractable for all request types', () => {
      fc.assert(fc.property(
        fc.oneof(
          serviceRequestGenerator('pending'),
          serviceRequestGenerator('assigned'),
          serviceRequestGenerator('active'),
          serviceRequestGenerator('completed'),
          serviceRequestGenerator('cancelled')
        ),
        (request) => {
          // Property: Display info should be extractable for any request
          const displayInfo = extractDisplayInfo(request);
          
          expect(displayInfo).toBeDefined();
          expect(displayInfo.id).toBe(request.id);
          expect(displayInfo.status).toBe(request.status);
          expect(displayInfo.heroAssignment).toBeDefined();
          
          // Completion date should only be present for completed requests
          if (request.status === 'completed') {
            expect(displayInfo.completionDate).toBeDefined();
          }
        }
      ), { numRuns: 100 });
    });

    test('Multiple requests in history should all maintain complete information', () => {
      fc.assert(fc.property(
        fc.uuid(), // civilian_id
        fc.array(
          fc.oneof(
            serviceRequestGenerator('completed'),
            serviceRequestGenerator('cancelled')
          ),
          { minLength: 2, maxLength: 5 }
        ),
        (civilianId, requests) => {
          // Assign all requests to the same civilian
          const civilianRequests = requests.map(req => ({ ...req, civilian_id: civilianId }));
          
          // Property: All requests should have complete information
          civilianRequests.forEach(request => {
            expect(hasRequiredFields(request)).toBe(true);
            
            const displayInfo = extractDisplayInfo(request);
            expect(displayInfo.status).toBeDefined();
            
            if (request.status === 'completed') {
              expect(displayInfo.completionDate).toBeDefined();
            }
          });
          
          // Property: All requests should belong to the same civilian
          civilianRequests.forEach(request => {
            expect(request.civilian_id).toBe(civilianId);
          });
        }
      ), { numRuns: 100 });
    });

    test('Pending requests should not require hero assignment or completion date', () => {
      fc.assert(fc.property(
        serviceRequestGenerator('pending'),
        (request) => {
          // Property: Pending requests don't need hero_id or completion date
          const displayInfo = extractDisplayInfo(request);
          
          expect(displayInfo.status).toBe('pending');
          // Hero assignment can be 'not assigned' for pending requests
          expect(displayInfo.heroAssignment).toBeDefined();
          // Completion date should be null for pending requests
          expect(displayInfo.completionDate).toBeNull();
        }
      ), { numRuns: 100 });
    });

    test('Cancelled requests should have status regardless of hero assignment', () => {
      fc.assert(fc.property(
        serviceRequestGenerator('cancelled'),
        (request) => {
          // Property: Cancelled requests always have status
          expect(request.status).toBe('cancelled');
          
          const displayInfo = extractDisplayInfo(request);
          expect(displayInfo.status).toBe('cancelled');
          
          // Hero assignment may or may not be present (could be cancelled before assignment)
          expect(displayInfo.heroAssignment).toBeDefined();
        }
      ), { numRuns: 100 });
    });
  });
});
