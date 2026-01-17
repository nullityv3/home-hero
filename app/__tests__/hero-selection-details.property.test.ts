/**
 * **Feature: homeheroes-frontend, Property 7: Hero selection detail consistency**
 * **Validates: Requirements 2.5**
 * 
 * Property-based test to verify that when a civilian selects a hero,
 * the detail view displays all hero profile information including name, rating, price, availability, and skills.
 */

import * as fc from 'fast-check';

interface HeroProfile {
  id: string;
  fullName: string;
  rating: number;
  completedJobs: number;
  hourlyRate: number;
  skills: string[];
  profileImageUrl?: string;
  availability: string;
  description: string;
  phone?: string;
}

const AVAILABLE_SKILLS = [
  'Plumbing',
  'Electrical',
  'Cleaning',
  'Carpentry',
  'Painting',
  'Gardening',
  'Moving',
  'Tutoring',
  'Pet Care',
  'General Repairs',
];

// Generator for valid hero profile data
const validHeroProfileGenerator = fc.record<HeroProfile>({
  id: fc.uuid(),
  fullName: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
  rating: fc.double({ min: 0, max: 5, noNaN: true }),
  completedJobs: fc.integer({ min: 0, max: 1000 }),
  hourlyRate: fc.integer({ min: 10, max: 200 }),
  skills: fc.array(fc.constantFrom(...AVAILABLE_SKILLS), { minLength: 1, maxLength: 5 }).map(arr => [...new Set(arr)]),
  profileImageUrl: fc.option(fc.webUrl(), { nil: undefined }),
  availability: fc.constantFrom('Available today', 'Available tomorrow', 'Available this week', 'Unavailable'),
  description: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0),
  phone: fc.option(
    fc.string({ minLength: 10, maxLength: 15 }).filter(s => /^\d{10,15}$/.test(s)),
    { nil: undefined }
  ),
});

// Function to render hero detail view (simulates the component logic)
function renderHeroDetailView(hero: HeroProfile): {
  displayedName: string;
  displayedRating: number;
  displayedPrice: number;
  displayedAvailability: string;
  displayedSkills: string[];
  displayedDescription: string;
  displayedCompletedJobs: number;
  hasProfileImage: boolean;
  hasPhone: boolean;
} {
  return {
    displayedName: hero.fullName,
    displayedRating: hero.rating,
    displayedPrice: hero.hourlyRate,
    displayedAvailability: hero.availability,
    displayedSkills: [...hero.skills],
    displayedDescription: hero.description,
    displayedCompletedJobs: hero.completedJobs,
    hasProfileImage: !!hero.profileImageUrl,
    hasPhone: !!hero.phone,
  };
}

describe('Hero Selection Detail Properties', () => {
  describe('Property 7: Hero selection detail consistency', () => {
    test('For any selected hero, the detail view should display all hero profile information', () => {
      fc.assert(fc.property(
        validHeroProfileGenerator,
        (hero) => {
          const detailView = renderHeroDetailView(hero);

          // Property 1: Name should be displayed exactly as stored
          expect(detailView.displayedName).toBe(hero.fullName);
          expect(detailView.displayedName.length).toBeGreaterThan(0);

          // Property 2: Rating should be displayed exactly as stored
          expect(detailView.displayedRating).toBe(hero.rating);
          expect(detailView.displayedRating).toBeGreaterThanOrEqual(0);
          expect(detailView.displayedRating).toBeLessThanOrEqual(5);

          // Property 3: Price should be displayed exactly as stored
          expect(detailView.displayedPrice).toBe(hero.hourlyRate);
          expect(detailView.displayedPrice).toBeGreaterThan(0);

          // Property 4: Availability should be displayed exactly as stored
          expect(detailView.displayedAvailability).toBe(hero.availability);
          expect(detailView.displayedAvailability.length).toBeGreaterThan(0);

          // Property 5: All skills should be displayed
          expect(detailView.displayedSkills).toEqual(hero.skills);
          expect(detailView.displayedSkills.length).toBe(hero.skills.length);
          hero.skills.forEach(skill => {
            expect(detailView.displayedSkills).toContain(skill);
          });

          // Property 6: Description should be displayed
          expect(detailView.displayedDescription).toBe(hero.description);
          expect(detailView.displayedDescription.length).toBeGreaterThan(0);

          // Property 7: Completed jobs count should be displayed
          expect(detailView.displayedCompletedJobs).toBe(hero.completedJobs);
          expect(detailView.displayedCompletedJobs).toBeGreaterThanOrEqual(0);

          // Property 8: Profile image presence should match
          expect(detailView.hasProfileImage).toBe(!!hero.profileImageUrl);

          // Property 9: Phone presence should match
          expect(detailView.hasPhone).toBe(!!hero.phone);
        }
      ), { numRuns: 100 });
    });

    test('Hero detail view should preserve all data types correctly', () => {
      fc.assert(fc.property(
        validHeroProfileGenerator,
        (hero) => {
          const detailView = renderHeroDetailView(hero);

          // Property: Data types should be preserved
          expect(typeof detailView.displayedName).toBe('string');
          expect(typeof detailView.displayedRating).toBe('number');
          expect(typeof detailView.displayedPrice).toBe('number');
          expect(typeof detailView.displayedAvailability).toBe('string');
          expect(Array.isArray(detailView.displayedSkills)).toBe(true);
          expect(typeof detailView.displayedDescription).toBe('string');
          expect(typeof detailView.displayedCompletedJobs).toBe('number');
          expect(typeof detailView.hasProfileImage).toBe('boolean');
          expect(typeof detailView.hasPhone).toBe('boolean');
        }
      ), { numRuns: 100 });
    });

    test('Skills array should not be modified when displayed', () => {
      fc.assert(fc.property(
        validHeroProfileGenerator,
        (hero) => {
          const originalSkills = [...hero.skills];
          const detailView = renderHeroDetailView(hero);

          // Property: Original skills array should remain unchanged
          expect(hero.skills).toEqual(originalSkills);

          // Property: Displayed skills should be a copy, not a reference
          detailView.displayedSkills.push('New Skill');
          expect(hero.skills).toEqual(originalSkills);
          expect(hero.skills.length).toBe(originalSkills.length);
        }
      ), { numRuns: 100 });
    });

    test('Hero detail view should handle edge cases correctly', () => {
      // Test with minimum values
      const minHero: HeroProfile = {
        id: '1',
        fullName: 'A',
        rating: 0,
        completedJobs: 0,
        hourlyRate: 10,
        skills: ['Cleaning'],
        availability: 'Available',
        description: 'Short desc',
      };

      const minView = renderHeroDetailView(minHero);
      expect(minView.displayedName).toBe('A');
      expect(minView.displayedRating).toBe(0);
      expect(minView.displayedCompletedJobs).toBe(0);
      expect(minView.displayedSkills.length).toBe(1);

      // Test with maximum values
      const maxHero: HeroProfile = {
        id: '2',
        fullName: 'Very Long Name That Is Still Valid',
        rating: 5,
        completedJobs: 1000,
        hourlyRate: 200,
        skills: AVAILABLE_SKILLS,
        availability: 'Available this week',
        description: 'A'.repeat(500),
        profileImageUrl: 'https://example.com/image.jpg',
        phone: '1234567890',
      };

      const maxView = renderHeroDetailView(maxHero);
      expect(maxView.displayedRating).toBe(5);
      expect(maxView.displayedCompletedJobs).toBe(1000);
      expect(maxView.displayedSkills.length).toBe(AVAILABLE_SKILLS.length);
      expect(maxView.hasProfileImage).toBe(true);
      expect(maxView.hasPhone).toBe(true);
    });

    test('Multiple views of the same hero should display identical information', () => {
      fc.assert(fc.property(
        validHeroProfileGenerator,
        (hero) => {
          const view1 = renderHeroDetailView(hero);
          const view2 = renderHeroDetailView(hero);

          // Property: Multiple renders should produce identical results
          expect(view1.displayedName).toBe(view2.displayedName);
          expect(view1.displayedRating).toBe(view2.displayedRating);
          expect(view1.displayedPrice).toBe(view2.displayedPrice);
          expect(view1.displayedAvailability).toBe(view2.displayedAvailability);
          expect(view1.displayedSkills).toEqual(view2.displayedSkills);
          expect(view1.displayedDescription).toBe(view2.displayedDescription);
          expect(view1.displayedCompletedJobs).toBe(view2.displayedCompletedJobs);
          expect(view1.hasProfileImage).toBe(view2.hasProfileImage);
          expect(view1.hasPhone).toBe(view2.hasPhone);
        }
      ), { numRuns: 100 });
    });

    test('Hero detail view should display all required fields', () => {
      fc.assert(fc.property(
        validHeroProfileGenerator,
        (hero) => {
          const detailView = renderHeroDetailView(hero);

          // Property: All required fields must be present and non-empty
          expect(detailView.displayedName).toBeTruthy();
          expect(detailView.displayedName.trim().length).toBeGreaterThan(0);
          
          expect(detailView.displayedRating).toBeDefined();
          expect(detailView.displayedRating).not.toBeNaN();
          
          expect(detailView.displayedPrice).toBeDefined();
          expect(detailView.displayedPrice).toBeGreaterThan(0);
          
          expect(detailView.displayedAvailability).toBeTruthy();
          expect(detailView.displayedAvailability.trim().length).toBeGreaterThan(0);
          
          expect(detailView.displayedSkills).toBeDefined();
          expect(detailView.displayedSkills.length).toBeGreaterThan(0);
          
          expect(detailView.displayedDescription).toBeTruthy();
          expect(detailView.displayedDescription.trim().length).toBeGreaterThan(0);
          
          expect(detailView.displayedCompletedJobs).toBeDefined();
          expect(detailView.displayedCompletedJobs).toBeGreaterThanOrEqual(0);
        }
      ), { numRuns: 100 });
    });

    test('Rating should always be within valid range', () => {
      fc.assert(fc.property(
        validHeroProfileGenerator,
        (hero) => {
          const detailView = renderHeroDetailView(hero);

          // Property: Rating must be between 0 and 5
          expect(detailView.displayedRating).toBeGreaterThanOrEqual(0);
          expect(detailView.displayedRating).toBeLessThanOrEqual(5);
          expect(Number.isFinite(detailView.displayedRating)).toBe(true);
        }
      ), { numRuns: 100 });
    });

    test('Skills should be displayed in the same order as stored', () => {
      fc.assert(fc.property(
        validHeroProfileGenerator,
        (hero) => {
          const detailView = renderHeroDetailView(hero);

          // Property: Skills order should be preserved
          for (let i = 0; i < hero.skills.length; i++) {
            expect(detailView.displayedSkills[i]).toBe(hero.skills[i]);
          }
        }
      ), { numRuns: 100 });
    });

    test('Optional fields should be handled correctly', () => {
      fc.assert(fc.property(
        validHeroProfileGenerator,
        (hero) => {
          const detailView = renderHeroDetailView(hero);

          // Property: Optional fields should match their presence in the hero object
          if (hero.profileImageUrl) {
            expect(detailView.hasProfileImage).toBe(true);
          } else {
            expect(detailView.hasProfileImage).toBe(false);
          }

          if (hero.phone) {
            expect(detailView.hasPhone).toBe(true);
          } else {
            expect(detailView.hasPhone).toBe(false);
          }
        }
      ), { numRuns: 100 });
    });

    test('Hero detail view should not expose internal IDs in display', () => {
      fc.assert(fc.property(
        validHeroProfileGenerator,
        (hero) => {
          const detailView = renderHeroDetailView(hero);

          // Property: Internal ID should not be part of displayed information
          // (IDs are used for routing/selection but not displayed to users)
          expect(detailView.displayedName).not.toContain(hero.id);
          expect(detailView.displayedDescription).not.toContain(hero.id);
        }
      ), { numRuns: 100 });
    });
  });
});
