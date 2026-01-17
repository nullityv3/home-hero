/**
 * **Feature: homeheroes-frontend, Property 12: Earnings filtering consistency**
 * **Validates: Requirements 4.2**
 * 
 * Property-based test to verify that when a hero filters earnings by date range,
 * all displayed statistics (totals, graphs, job counts) only include data from
 * within the selected time period.
 */

import { BudgetRange, EarningsData, EarningsPeriod, Location, ServiceCategory, ServiceRequest } from '@/types';
import * as fc from 'fast-check';

// Helper function to calculate earnings from a service request
const calculateRequestEarnings = (request: ServiceRequest): number => {
  return (request.budget_range.min + request.budget_range.max) / 2;
};

// Helper function to check if a date is within a range
const isDateInRange = (date: string, startDate: string | null, endDate: string | null): boolean => {
  const dateTime = new Date(date).getTime();
  
  if (startDate && dateTime < new Date(startDate).getTime()) {
    return false;
  }
  
  if (endDate && dateTime > new Date(endDate).getTime()) {
    return false;
  }
  
  return true;
};

// Helper function to group earnings by period
const groupEarningsByPeriod = (
  requests: ServiceRequest[], 
  timeframe: 'daily' | 'weekly' | 'monthly'
): EarningsPeriod[] => {
  const grouped: { [key: string]: { amount: number; jobCount: number } } = {};
  
  requests.forEach(request => {
    const date = new Date(request.updated_at);
    let key: string;
    
    switch (timeframe) {
      case 'daily':
        key = date.toISOString().split('T')[0];
        break;
      case 'weekly':
        const monday = new Date(date);
        monday.setDate(date.getDate() - date.getDay() + 1);
        key = monday.toISOString().split('T')[0];
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
    }
    
    if (!grouped[key]) {
      grouped[key] = { amount: 0, jobCount: 0 };
    }
    
    grouped[key].amount += calculateRequestEarnings(request);
    grouped[key].jobCount += 1;
  });
  
  return Object.entries(grouped)
    .map(([date, data]) => ({
      date,
      amount: data.amount,
      jobCount: data.jobCount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

// Mock function to calculate earnings data with filtering
const calculateEarningsData = (
  requests: ServiceRequest[],
  startDate: string | null,
  endDate: string | null
): EarningsData => {
  // Filter requests by date range
  const filteredRequests = requests.filter(req => 
    req.status === 'completed' && isDateInRange(req.updated_at, startDate, endDate)
  );
  
  // Calculate total earnings
  const totalEarnings = filteredRequests.reduce((sum, req) => 
    sum + calculateRequestEarnings(req), 0
  );
  
  // Get completed jobs count
  const completedJobs = filteredRequests.length;
  
  // Group earnings by different timeframes
  const dailyEarnings = groupEarningsByPeriod(filteredRequests, 'daily');
  const weeklyEarnings = groupEarningsByPeriod(filteredRequests, 'weekly');
  const monthlyEarnings = groupEarningsByPeriod(filteredRequests, 'monthly');
  
  return {
    totalEarnings,
    completedJobs,
    averageRating: 0,
    dailyEarnings,
    weeklyEarnings,
    monthlyEarnings,
  };
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

// Generator for dates within a specific range
const dateInRangeGenerator = (minDate: Date, maxDate: Date) => 
  fc.date({ min: minDate, max: maxDate }).map(d => {
    // Ensure valid date
    if (isNaN(d.getTime())) {
      return new Date().toISOString();
    }
    return d.toISOString();
  });

const completedServiceRequestGenerator = (dateGenerator: fc.Arbitrary<string>) => 
  fc.record({
    id: fc.uuid(),
    civilian_id: fc.uuid(),
    hero_id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
    category: validServiceCategoryGenerator,
    location: validLocationGenerator,
    scheduled_date: dateGenerator,
    estimated_duration: fc.integer({ min: 1, max: 10 }),
    budget_range: validBudgetRangeGenerator,
    status: fc.constant('completed' as const),
    created_at: dateGenerator,
    updated_at: dateGenerator,
  });

describe('Earnings Filtering Properties', () => {
  describe('Property 12: Earnings filtering consistency', () => {
    test('For any date range filter, total earnings should only include jobs completed within that range', async () => {
      await fc.assert(fc.asyncProperty(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }).filter(d => !isNaN(d.getTime())),
        fc.date({ min: new Date('2024-06-01'), max: new Date('2024-12-31') }).filter(d => !isNaN(d.getTime())),
        fc.array(
          completedServiceRequestGenerator(
            dateInRangeGenerator(new Date('2024-01-01'), new Date('2024-12-31'))
          ),
          { minLength: 5, maxLength: 20 }
        ),
        async (startDate, endDate, requests) => {
          // Ensure start date is before end date
          if (startDate >= endDate) {
            [startDate, endDate] = [endDate, startDate];
          }
          
          const startDateStr = startDate.toISOString();
          const endDateStr = endDate.toISOString();
          
          // Calculate earnings with filter
          const earningsData = calculateEarningsData(requests, startDateStr, endDateStr);
          
          // Manually calculate expected values
          const expectedRequests = requests.filter(req => 
            isDateInRange(req.updated_at, startDateStr, endDateStr)
          );
          
          const expectedTotal = expectedRequests.reduce((sum, req) => 
            sum + calculateRequestEarnings(req), 0
          );
          
          // Property: Total earnings should match manually calculated total
          expect(earningsData.totalEarnings).toBeCloseTo(expectedTotal, 2);
          
          // Property: Completed jobs count should match filtered requests
          expect(earningsData.completedJobs).toBe(expectedRequests.length);
          
          // Property: All earnings in daily/weekly/monthly should be from filtered requests
          const allPeriodEarnings = [
            ...earningsData.dailyEarnings,
            ...earningsData.weeklyEarnings,
            ...earningsData.monthlyEarnings,
          ];
          
          const totalFromPeriods = earningsData.dailyEarnings.reduce((sum, p) => sum + p.amount, 0);
          expect(totalFromPeriods).toBeCloseTo(expectedTotal, 2);
        }
      ), { numRuns: 100 });
    });

    test('For any date range filter, job count should only include jobs completed within that range', async () => {
      await fc.assert(fc.asyncProperty(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }).filter(d => !isNaN(d.getTime())),
        fc.date({ min: new Date('2024-06-01'), max: new Date('2024-12-31') }).filter(d => !isNaN(d.getTime())),
        fc.array(
          completedServiceRequestGenerator(
            dateInRangeGenerator(new Date('2024-01-01'), new Date('2024-12-31'))
          ),
          { minLength: 5, maxLength: 20 }
        ),
        async (startDate, endDate, requests) => {
          if (startDate >= endDate) {
            [startDate, endDate] = [endDate, startDate];
          }
          
          const startDateStr = startDate.toISOString();
          const endDateStr = endDate.toISOString();
          
          // Calculate earnings with filter
          const earningsData = calculateEarningsData(requests, startDateStr, endDateStr);
          
          // Count jobs in range
          const jobsInRange = requests.filter(req => 
            isDateInRange(req.updated_at, startDateStr, endDateStr)
          ).length;
          
          // Property: Completed jobs should equal jobs in range
          expect(earningsData.completedJobs).toBe(jobsInRange);
          
          // Property: Sum of job counts in periods should equal total job count
          const totalJobsFromPeriods = earningsData.dailyEarnings.reduce((sum, p) => sum + p.jobCount, 0);
          expect(totalJobsFromPeriods).toBe(jobsInRange);
        }
      ), { numRuns: 100 });
    });

    test('Filtering with no date range should include all completed jobs', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(
          completedServiceRequestGenerator(
            dateInRangeGenerator(new Date('2024-01-01'), new Date('2024-12-31'))
          ),
          { minLength: 1, maxLength: 20 }
        ),
        async (requests) => {
          // Calculate earnings without filter
          const earningsData = calculateEarningsData(requests, null, null);
          
          // Calculate expected total
          const expectedTotal = requests.reduce((sum, req) => 
            sum + calculateRequestEarnings(req), 0
          );
          
          // Property: Should include all requests
          expect(earningsData.completedJobs).toBe(requests.length);
          expect(earningsData.totalEarnings).toBeCloseTo(expectedTotal, 2);
        }
      ), { numRuns: 100 });
    });

    test('Filtering with only start date should include all jobs from start date onwards', async () => {
      await fc.assert(fc.asyncProperty(
        fc.date({ min: new Date('2024-06-01'), max: new Date('2024-06-30') }),
        fc.array(
          completedServiceRequestGenerator(
            dateInRangeGenerator(new Date('2024-01-01'), new Date('2024-12-31'))
          ),
          { minLength: 5, maxLength: 20 }
        ),
        async (startDate, requests) => {
          const startDateStr = startDate.toISOString();
          
          // Calculate earnings with only start date
          const earningsData = calculateEarningsData(requests, startDateStr, null);
          
          // Count jobs from start date onwards
          const jobsFromStartDate = requests.filter(req => 
            new Date(req.updated_at).getTime() >= new Date(startDateStr).getTime()
          );
          
          const expectedTotal = jobsFromStartDate.reduce((sum, req) => 
            sum + calculateRequestEarnings(req), 0
          );
          
          // Property: Should include all jobs from start date onwards
          expect(earningsData.completedJobs).toBe(jobsFromStartDate.length);
          expect(earningsData.totalEarnings).toBeCloseTo(expectedTotal, 2);
        }
      ), { numRuns: 100 });
    });

    test('Filtering with only end date should include all jobs up to end date', async () => {
      await fc.assert(fc.asyncProperty(
        fc.date({ min: new Date('2024-06-01'), max: new Date('2024-06-30') }).filter(d => !isNaN(d.getTime())),
        fc.array(
          completedServiceRequestGenerator(
            dateInRangeGenerator(new Date('2024-01-01'), new Date('2024-12-31'))
          ),
          { minLength: 5, maxLength: 20 }
        ),
        async (endDate, requests) => {
          const endDateStr = endDate.toISOString();
          
          // Calculate earnings with only end date
          const earningsData = calculateEarningsData(requests, null, endDateStr);
          
          // Count jobs up to end date
          const jobsUpToEndDate = requests.filter(req => 
            new Date(req.updated_at).getTime() <= new Date(endDateStr).getTime()
          );
          
          const expectedTotal = jobsUpToEndDate.reduce((sum, req) => 
            sum + calculateRequestEarnings(req), 0
          );
          
          // Property: Should include all jobs up to end date
          expect(earningsData.completedJobs).toBe(jobsUpToEndDate.length);
          expect(earningsData.totalEarnings).toBeCloseTo(expectedTotal, 2);
        }
      ), { numRuns: 100 });
    });

    test('Empty date range should result in zero earnings and job count', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(
          completedServiceRequestGenerator(
            dateInRangeGenerator(new Date('2024-01-01'), new Date('2024-05-31'))
          ),
          { minLength: 1, maxLength: 10 }
        ),
        async (requests) => {
          // All requests are before June, filter for July onwards
          const startDateStr = new Date('2024-07-01').toISOString();
          
          // Calculate earnings with filter that excludes all requests
          const earningsData = calculateEarningsData(requests, startDateStr, null);
          
          // Count how many requests are actually in the filtered range
          const requestsInRange = requests.filter(req => 
            new Date(req.updated_at).getTime() >= new Date(startDateStr).getTime()
          ).length;
          
          // Property: Should have zero earnings and job count if no requests in range
          if (requestsInRange === 0) {
            expect(earningsData.totalEarnings).toBe(0);
            expect(earningsData.completedJobs).toBe(0);
            expect(earningsData.dailyEarnings).toHaveLength(0);
            expect(earningsData.weeklyEarnings).toHaveLength(0);
            expect(earningsData.monthlyEarnings).toHaveLength(0);
          }
        }
      ), { numRuns: 100 });
    });

    test('Period groupings should only contain data from filtered date range', async () => {
      await fc.assert(fc.asyncProperty(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }).filter(d => !isNaN(d.getTime())),
        fc.date({ min: new Date('2024-06-01'), max: new Date('2024-12-31') }).filter(d => !isNaN(d.getTime())),
        fc.array(
          completedServiceRequestGenerator(
            dateInRangeGenerator(new Date('2024-01-01'), new Date('2024-12-31'))
          ),
          { minLength: 5, maxLength: 20 }
        ),
        async (startDate, endDate, requests) => {
          if (startDate >= endDate) {
            [startDate, endDate] = [endDate, startDate];
          }
          
          const startDateStr = startDate.toISOString();
          const endDateStr = endDate.toISOString();
          
          // Calculate earnings with filter
          const earningsData = calculateEarningsData(requests, startDateStr, endDateStr);
          
          // Property: All dates in daily earnings should be within range (with day-level precision)
          earningsData.dailyEarnings.forEach(period => {
            // Compare at day level, not millisecond level
            const periodDateStr = period.date.split('T')[0]; // Get YYYY-MM-DD
            const startDateOnly = startDateStr.split('T')[0];
            const endDateOnly = endDateStr.split('T')[0];
            
            expect(periodDateStr >= startDateOnly).toBe(true);
            expect(periodDateStr <= endDateOnly).toBe(true);
          });
          
          // Property: Sum of amounts in all periods should equal total earnings
          const dailyTotal = earningsData.dailyEarnings.reduce((sum, p) => sum + p.amount, 0);
          expect(dailyTotal).toBeCloseTo(earningsData.totalEarnings, 2);
          
          // Property: Sum of job counts in all periods should equal total job count
          const dailyJobCount = earningsData.dailyEarnings.reduce((sum, p) => sum + p.jobCount, 0);
          expect(dailyJobCount).toBe(earningsData.completedJobs);
        }
      ), { numRuns: 100 });
    });
  });
});
