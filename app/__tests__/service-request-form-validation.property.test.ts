/**
 * **Feature: homeheroes-frontend, Property 2: Form validation prevents invalid submissions**
 * **Validates: Requirements 1.3**
 * 
 * Property-based test to verify that service request form validation
 * prevents invalid submissions across all possible invalid input combinations.
 */

import { BudgetRange, Location, ServiceCategory } from '@/types';
import * as fc from 'fast-check';

interface ServiceRequestFormData {
  title?: string;
  description?: string;
  category?: ServiceCategory;
  location?: Location;
  scheduledDate?: Date;
  estimatedDuration?: number;
  budgetRange?: BudgetRange;
}

interface ValidationErrors {
  title?: string;
  description?: string;
  category?: string;
  location?: string;
  scheduledDate?: string;
  estimatedDuration?: string;
  budgetRange?: string;
}

// Validation functions extracted from create-request.tsx
const validateStep1 = (data: ServiceRequestFormData): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  if (!data.category) {
    errors.category = 'Please select a service category';
  }
  
  return errors;
};

const validateStep2 = (data: ServiceRequestFormData): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  if (!data.title?.trim()) {
    errors.title = 'Title is required';
  }
  if (!data.description?.trim()) {
    errors.description = 'Description is required';
  }
  if (!data.estimatedDuration || data.estimatedDuration <= 0) {
    errors.estimatedDuration = 'Please select estimated duration';
  }
  
  return errors;
};

const validateStep3 = (data: ServiceRequestFormData): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  if (!data.location) {
    errors.location = 'Location is required';
  }
  if (!data.scheduledDate) {
    errors.scheduledDate = 'Scheduled date is required';
  } else if (isNaN(data.scheduledDate.getTime())) {
    errors.scheduledDate = 'Invalid date';
  } else if (data.scheduledDate < new Date()) {
    errors.scheduledDate = 'Scheduled date must be in the future';
  }
  if (!data.budgetRange || data.budgetRange.min < 0) {
    errors.budgetRange = 'Budget cannot be negative';
  } else if (data.budgetRange.min === 0) {
    errors.budgetRange = 'Minimum budget must be greater than 0';
  } else if (data.budgetRange.max < data.budgetRange.min) {
    errors.budgetRange = 'Maximum budget must be at least equal to minimum';
  }
  
  return errors;
};

const validateCompleteForm = (data: ServiceRequestFormData): { isValid: boolean; errors: ValidationErrors } => {
  const errors = {
    ...validateStep1(data),
    ...validateStep2(data),
    ...validateStep3(data),
  };
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Generators for valid inputs
const validCategoryGenerator = fc.constantFrom<ServiceCategory>(
  'cleaning', 'repairs', 'delivery', 'tutoring', 'other'
);

// ✅ FIXED: Location generator matches actual Location interface
const validLocationGenerator = fc.record({
  address: fc.string({ minLength: 5, maxLength: 100 }),
  city: fc.string({ minLength: 2, maxLength: 50 }),
  state: fc.string({ minLength: 2, maxLength: 2 }),
  zipCode: fc.string({ minLength: 5, maxLength: 10 }),
  latitude: fc.double({ min: -90, max: 90 }),
  longitude: fc.double({ min: -180, max: 180 }),
}) as fc.Arbitrary<Location>;

// ✅ FIXED: BudgetRange generator uses min/max with proper validation
const validBudgetRangeGenerator = fc.record({
  min: fc.integer({ min: 1, max: 500 }),
  max: fc.integer({ min: 501, max: 1000 }),
  currency: fc.constantFrom('USD', 'EUR', 'GBP'),
}).filter(budget => budget.min <= budget.max) as fc.Arbitrary<BudgetRange>;

const futureDateGenerator = fc.date({ 
  min: new Date(Date.now() + 1000), // At least 1 second in the future
});

const validTitleGenerator = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
const validDescriptionGenerator = fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0);
const validDurationGenerator = fc.integer({ min: 1, max: 10 });

// Generators for invalid inputs
const invalidTitleGenerator = fc.oneof(
  fc.constant(undefined),
  fc.constant(''),
  fc.string().filter(s => s.trim() === ''), // Whitespace only
);

const invalidDescriptionGenerator = fc.oneof(
  fc.constant(undefined),
  fc.constant(''),
  fc.string().filter(s => s.trim() === ''), // Whitespace only
);

const invalidDurationGenerator = fc.oneof(
  fc.constant(undefined),
  fc.constant(0),
  fc.integer({ max: -1 }),
);

const pastDateGenerator = fc.date({ 
  max: new Date(Date.now() - 1000), // At least 1 second in the past
});

const invalidBudgetRangeGenerator = fc.oneof(
  fc.constant(undefined),
  fc.record<BudgetRange>({
    min: fc.constant(-1),
    max: fc.integer({ min: 0, max: 100 }),
    currency: fc.constant('USD'),
  }),
  fc.record<BudgetRange>({
    min: fc.constant(0),
    max: fc.integer({ min: 0, max: 100 }),
    currency: fc.constant('USD'),
  }),
  fc.record<BudgetRange>({
    min: fc.integer({ min: 50, max: 100 }),
    max: fc.integer({ min: 1, max: 49 }),
    currency: fc.constant('USD'),
  }).filter(budget => budget.max < budget.min),
);

describe('Service Request Form Validation Properties', () => {
  describe('Property 2: Form validation prevents invalid submissions', () => {
    
    test('Form with missing category should always be invalid', () => {
      fc.assert(fc.property(
        validTitleGenerator,
        validDescriptionGenerator,
        validDurationGenerator,
        validLocationGenerator,
        futureDateGenerator,
        validBudgetRangeGenerator,
        (title, description, duration, location, date, budget) => {
          const formData: ServiceRequestFormData = {
            title,
            description,
            estimatedDuration: duration,
            location,
            scheduledDate: date,
            budgetRange: budget,
            // category is missing
          };
          
          const result = validateCompleteForm(formData);
          
          // Property: Missing category should make form invalid
          expect(result.isValid).toBe(false);
          expect(result.errors.category).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('Form with invalid title should always be invalid', () => {
      fc.assert(fc.property(
        invalidTitleGenerator,
        validCategoryGenerator,
        validDescriptionGenerator,
        validDurationGenerator,
        validLocationGenerator,
        futureDateGenerator,
        validBudgetRangeGenerator,
        (title, category, description, duration, location, date, budget) => {
          const formData: ServiceRequestFormData = {
            title,
            category,
            description,
            estimatedDuration: duration,
            location,
            scheduledDate: date,
            budgetRange: budget,
          };
          
          const result = validateCompleteForm(formData);
          
          // Property: Invalid title should make form invalid
          expect(result.isValid).toBe(false);
          expect(result.errors.title).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('Form with invalid description should always be invalid', () => {
      fc.assert(fc.property(
        validTitleGenerator,
        validCategoryGenerator,
        invalidDescriptionGenerator,
        validDurationGenerator,
        validLocationGenerator,
        futureDateGenerator,
        validBudgetRangeGenerator,
        (title, category, description, duration, location, date, budget) => {
          const formData: ServiceRequestFormData = {
            title,
            category,
            description,
            estimatedDuration: duration,
            location,
            scheduledDate: date,
            budgetRange: budget,
          };
          
          const result = validateCompleteForm(formData);
          
          // Property: Invalid description should make form invalid
          expect(result.isValid).toBe(false);
          expect(result.errors.description).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('Form with invalid estimated duration should always be invalid', () => {
      fc.assert(fc.property(
        validTitleGenerator,
        validCategoryGenerator,
        validDescriptionGenerator,
        invalidDurationGenerator,
        validLocationGenerator,
        futureDateGenerator,
        validBudgetRangeGenerator,
        (title, category, description, duration, location, date, budget) => {
          const formData: ServiceRequestFormData = {
            title,
            category,
            description,
            estimatedDuration: duration,
            location,
            scheduledDate: date,
            budgetRange: budget,
          };
          
          const result = validateCompleteForm(formData);
          
          // Property: Invalid duration should make form invalid
          expect(result.isValid).toBe(false);
          expect(result.errors.estimatedDuration).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('Form with missing location should always be invalid', () => {
      fc.assert(fc.property(
        validTitleGenerator,
        validCategoryGenerator,
        validDescriptionGenerator,
        validDurationGenerator,
        futureDateGenerator,
        validBudgetRangeGenerator,
        (title, category, description, duration, date, budget) => {
          const formData: ServiceRequestFormData = {
            title,
            category,
            description,
            estimatedDuration: duration,
            scheduledDate: date,
            budgetRange: budget,
            // location is missing
          };
          
          const result = validateCompleteForm(formData);
          
          // Property: Missing location should make form invalid
          expect(result.isValid).toBe(false);
          expect(result.errors.location).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('Form with missing scheduled date should always be invalid', () => {
      fc.assert(fc.property(
        validTitleGenerator,
        validCategoryGenerator,
        validDescriptionGenerator,
        validDurationGenerator,
        validLocationGenerator,
        validBudgetRangeGenerator,
        (title, category, description, duration, location, budget) => {
          const formData: ServiceRequestFormData = {
            title,
            category,
            description,
            estimatedDuration: duration,
            location,
            budgetRange: budget,
            // scheduledDate is missing
          };
          
          const result = validateCompleteForm(formData);
          
          // Property: Missing scheduled date should make form invalid
          expect(result.isValid).toBe(false);
          expect(result.errors.scheduledDate).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('Form with past scheduled date should always be invalid', () => {
      fc.assert(fc.property(
        validTitleGenerator,
        validCategoryGenerator,
        validDescriptionGenerator,
        validDurationGenerator,
        validLocationGenerator,
        pastDateGenerator,
        validBudgetRangeGenerator,
        (title, category, description, duration, location, date, budget) => {
          const formData: ServiceRequestFormData = {
            title,
            category,
            description,
            estimatedDuration: duration,
            location,
            scheduledDate: date,
            budgetRange: budget,
          };
          
          const result = validateCompleteForm(formData);
          
          // Property: Past date should make form invalid
          expect(result.isValid).toBe(false);
          expect(result.errors.scheduledDate).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('Form with invalid budget range should always be invalid', () => {
      fc.assert(fc.property(
        validTitleGenerator,
        validCategoryGenerator,
        validDescriptionGenerator,
        validDurationGenerator,
        validLocationGenerator,
        futureDateGenerator,
        invalidBudgetRangeGenerator,
        (title, category, description, duration, location, date, budget) => {
          const formData: ServiceRequestFormData = {
            title,
            category,
            description,
            estimatedDuration: duration,
            location,
            scheduledDate: date,
            budgetRange: budget,
          };
          
          const result = validateCompleteForm(formData);
          
          // Property: Invalid budget should make form invalid
          expect(result.isValid).toBe(false);
          expect(result.errors.budgetRange).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('Form with all valid fields should always be valid', () => {
      fc.assert(fc.property(
        validTitleGenerator,
        validCategoryGenerator,
        validDescriptionGenerator,
        validDurationGenerator,
        validLocationGenerator,
        futureDateGenerator,
        validBudgetRangeGenerator,
        (title, category, description, duration, location, date, budget) => {
          const formData: ServiceRequestFormData = {
            title,
            category,
            description,
            estimatedDuration: duration,
            location,
            scheduledDate: date,
            budgetRange: budget,
          };
          
          const result = validateCompleteForm(formData);
          
          // Property: All valid fields should make form valid
          expect(result.isValid).toBe(true);
          expect(Object.keys(result.errors)).toHaveLength(0);
        }
      ), { numRuns: 100 });
    });

    test('Form with multiple invalid fields should report all errors', () => {
      fc.assert(fc.property(
        invalidTitleGenerator,
        invalidDescriptionGenerator,
        invalidDurationGenerator,
        (title, description, duration) => {
          const formData: ServiceRequestFormData = {
            title,
            description,
            estimatedDuration: duration,
            // Missing all other required fields
          };
          
          const result = validateCompleteForm(formData);
          
          // Property: Multiple invalid fields should all be reported
          expect(result.isValid).toBe(false);
          expect(result.errors.title).toBeDefined();
          expect(result.errors.description).toBeDefined();
          expect(result.errors.estimatedDuration).toBeDefined();
          expect(result.errors.category).toBeDefined();
          expect(result.errors.location).toBeDefined();
          expect(result.errors.scheduledDate).toBeDefined();
          expect(result.errors.budgetRange).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    // ✅ RESTORED: Critical security-focused tests
    test('Form should handle malformed budget range gracefully', () => {
      fc.assert(fc.property(
        validTitleGenerator,
        validCategoryGenerator,
        validDescriptionGenerator,
        validDurationGenerator,
        validLocationGenerator,
        futureDateGenerator,
        (title, category, description, duration, location, date) => {
          const formData: ServiceRequestFormData = {
            title,
            category,
            description,
            estimatedDuration: duration,
            location,
            scheduledDate: date,
            budgetRange: null as any, // Malformed data
          };
          
          // Should not throw an error
          expect(() => {
            const result = validateCompleteForm(formData);
            expect(result.isValid).toBe(false);
          }).not.toThrow();
        }
      ), { numRuns: 50 });
    });

    test('Form should validate budget range min/max relationship', () => {
      fc.assert(fc.property(
        validTitleGenerator,
        validCategoryGenerator,
        validDescriptionGenerator,
        validDurationGenerator,
        validLocationGenerator,
        futureDateGenerator,
        fc.integer({ min: 100, max: 500 }),
        fc.integer({ min: 1, max: 99 }),
        (title, category, description, duration, location, date, min, max) => {
          const formData: ServiceRequestFormData = {
            title,
            category,
            description,
            estimatedDuration: duration,
            location,
            scheduledDate: date,
            budgetRange: { min, max, currency: 'USD' }, // min > max
          };
          
          const result = validateCompleteForm(formData);
          
          // Property: min > max should make form invalid
          expect(result.isValid).toBe(false);
          expect(result.errors.budgetRange).toBeDefined();
        }
      ), { numRuns: 50 });
    });
  });
});
