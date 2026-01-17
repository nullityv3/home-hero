/**
 * **Feature: homeheroes-frontend, Property 6: Hero list sorting correctness**
 * **Validates: Requirements 2.3**
 * 
 * Property-based test to verify that when a civilian sorts the heroes list,
 * the sorted results are in the correct order according to the selected criteria.
 */

import * as fc from 'fast-check';

interface Hero {
  id: string;
  fullName: string;
  rating: number;
  completedJobs: number;
  hourlyRate: number;
  skills: string[];
  profileImageUrl?: string;
  availability: string;
}

type SortBy = 'default' | 'rating' | 'price';

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

// Generator for valid hero data
const validHeroGenerator = fc.record<Hero>({
  id: fc.uuid(),
  fullName: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
  rating: fc.double({ min: 0, max: 5, noNaN: true }),
  completedJobs: fc.integer({ min: 0, max: 1000 }),
  hourlyRate: fc.integer({ min: 10, max: 200 }),
  skills: fc.array(fc.constantFrom(...AVAILABLE_SKILLS), { minLength: 1, maxLength: 5 }).map(arr => [...new Set(arr)]),
  profileImageUrl: fc.option(fc.webUrl(), { nil: undefined }),
  availability: fc.constantFrom('Available today', 'Available tomorrow', 'Available this week', 'Unavailable'),
});

// Function to apply sorting (extracted from the component logic)
function applySorting(heroes: Hero[], sortBy: SortBy): Hero[] {
  const result = [...heroes];

  switch (sortBy) {
    case 'rating':
      result.sort((a, b) => b.rating - a.rating);
      break;
    case 'price':
      result.sort((a, b) => a.hourlyRate - b.hourlyRate);
      break;
    case 'default':
    default:
      // Keep original order (from database)
      break;
  }

  return result;
}

describe('Hero List Sorting Properties', () => {
  describe('Property 6: Hero list sorting correctness', () => {
    test('For any list of heroes and sort criteria, the sorted results should be in the correct order', () => {
      fc.assert(fc.property(
        fc.array(validHeroGenerator, { minLength: 3, maxLength: 20 }),
        fc.constantFrom<SortBy>('default', 'rating', 'price'),
        (heroes, sortBy) => {
          const sortedHeroes = applySorting(heroes, sortBy);

          // Property 1: Sorted list should have the same length as original
          expect(sortedHeroes.length).toBe(heroes.length);

          // Property 2: Sorted list should contain all original heroes
          heroes.forEach(hero => {
            expect(sortedHeroes.some(h => h.id === hero.id)).toBe(true);
          });

          // Property 3: Verify correct ordering based on sort criteria
          if (sortBy === 'rating') {
            // Should be sorted by rating in descending order (highest first)
            for (let i = 0; i < sortedHeroes.length - 1; i++) {
              expect(sortedHeroes[i].rating).toBeGreaterThanOrEqual(sortedHeroes[i + 1].rating);
            }
          } else if (sortBy === 'price') {
            // Should be sorted by hourly rate in ascending order (lowest first)
            for (let i = 0; i < sortedHeroes.length - 1; i++) {
              expect(sortedHeroes[i].hourlyRate).toBeLessThanOrEqual(sortedHeroes[i + 1].hourlyRate);
            }
          } else if (sortBy === 'default') {
            // Should maintain original order
            for (let i = 0; i < heroes.length; i++) {
              expect(sortedHeroes[i].id).toBe(heroes[i].id);
            }
          }
        }
      ), { numRuns: 100 });
    });

    test('Sorting by rating should place highest rated heroes first', () => {
      fc.assert(fc.property(
        fc.array(validHeroGenerator, { minLength: 5, maxLength: 15 }),
        (heroes) => {
          const sortedHeroes = applySorting(heroes, 'rating');

          // Property: First hero should have the highest or equal rating
          const maxRating = Math.max(...heroes.map(h => h.rating));
          expect(sortedHeroes[0].rating).toBe(maxRating);

          // Property: Last hero should have the lowest or equal rating
          const minRating = Math.min(...heroes.map(h => h.rating));
          expect(sortedHeroes[sortedHeroes.length - 1].rating).toBe(minRating);

          // Property: Each hero should have rating >= next hero
          for (let i = 0; i < sortedHeroes.length - 1; i++) {
            expect(sortedHeroes[i].rating).toBeGreaterThanOrEqual(sortedHeroes[i + 1].rating);
          }
        }
      ), { numRuns: 100 });
    });

    test('Sorting by price should place lowest priced heroes first', () => {
      fc.assert(fc.property(
        fc.array(validHeroGenerator, { minLength: 5, maxLength: 15 }),
        (heroes) => {
          const sortedHeroes = applySorting(heroes, 'price');

          // Property: First hero should have the lowest or equal price
          const minPrice = Math.min(...heroes.map(h => h.hourlyRate));
          expect(sortedHeroes[0].hourlyRate).toBe(minPrice);

          // Property: Last hero should have the highest or equal price
          const maxPrice = Math.max(...heroes.map(h => h.hourlyRate));
          expect(sortedHeroes[sortedHeroes.length - 1].hourlyRate).toBe(maxPrice);

          // Property: Each hero should have price <= next hero
          for (let i = 0; i < sortedHeroes.length - 1; i++) {
            expect(sortedHeroes[i].hourlyRate).toBeLessThanOrEqual(sortedHeroes[i + 1].hourlyRate);
          }
        }
      ), { numRuns: 100 });
    });

    test('Default sorting should preserve original order', () => {
      fc.assert(fc.property(
        fc.array(validHeroGenerator, { minLength: 3, maxLength: 15 }),
        (heroes) => {
          const sortedHeroes = applySorting(heroes, 'default');

          // Property: Order should be exactly the same as input
          expect(sortedHeroes.length).toBe(heroes.length);
          
          for (let i = 0; i < heroes.length; i++) {
            expect(sortedHeroes[i].id).toBe(heroes[i].id);
            expect(sortedHeroes[i]).toEqual(heroes[i]);
          }
        }
      ), { numRuns: 100 });
    });

    test('Sorting should not modify the original heroes array', () => {
      fc.assert(fc.property(
        fc.array(validHeroGenerator, { minLength: 3, maxLength: 15 }),
        fc.constantFrom<SortBy>('default', 'rating', 'price'),
        (heroes, sortBy) => {
          const originalHeroes = JSON.parse(JSON.stringify(heroes));
          
          applySorting(heroes, sortBy);

          // Property: Original array should remain unchanged
          expect(heroes).toEqual(originalHeroes);
        }
      ), { numRuns: 100 });
    });

    test('Sorting should be stable for heroes with equal values', () => {
      fc.assert(fc.property(
        fc.array(validHeroGenerator, { minLength: 5, maxLength: 15 }),
        (heroes) => {
          // Create heroes with identical ratings
          const sameRating = 4.5;
          const heroesWithSameRating = heroes.map((hero, index) => ({
            ...hero,
            rating: sameRating,
            // Add a sequence number to track original order
            originalIndex: index,
          }));

          const sortedByRating = applySorting(heroesWithSameRating, 'rating');

          // Property: All heroes should still have the same rating
          sortedByRating.forEach(hero => {
            expect(hero.rating).toBe(sameRating);
          });

          // Property: Relative order should be preserved (stable sort)
          // JavaScript's sort is stable as of ES2019
          for (let i = 0; i < sortedByRating.length - 1; i++) {
            if (sortedByRating[i].rating === sortedByRating[i + 1].rating) {
              expect(sortedByRating[i].originalIndex).toBeLessThan(sortedByRating[i + 1].originalIndex);
            }
          }
        }
      ), { numRuns: 50 });
    });

    test('Sorting multiple times with same criteria should produce same result', () => {
      fc.assert(fc.property(
        fc.array(validHeroGenerator, { minLength: 3, maxLength: 15 }),
        fc.constantFrom<SortBy>('rating', 'price'),
        (heroes, sortBy) => {
          const sorted1 = applySorting(heroes, sortBy);
          const sorted2 = applySorting(heroes, sortBy);

          // Property: Multiple sorts should produce identical results
          expect(sorted1.length).toBe(sorted2.length);
          
          for (let i = 0; i < sorted1.length; i++) {
            expect(sorted1[i].id).toBe(sorted2[i].id);
          }
        }
      ), { numRuns: 100 });
    });

    test('Sorting should handle edge cases correctly', () => {
      // Test with single hero
      const singleHero: Hero[] = [{
        id: '1',
        fullName: 'John Doe',
        rating: 4.5,
        completedJobs: 10,
        hourlyRate: 25,
        skills: ['Plumbing'],
        availability: 'Available today',
      }];

      ['default', 'rating', 'price'].forEach(sortBy => {
        const sorted = applySorting(singleHero, sortBy as SortBy);
        expect(sorted.length).toBe(1);
        expect(sorted[0].id).toBe('1');
      });

      // Test with empty array
      const emptyHeroes: Hero[] = [];
      ['default', 'rating', 'price'].forEach(sortBy => {
        const sorted = applySorting(emptyHeroes, sortBy as SortBy);
        expect(sorted.length).toBe(0);
      });
    });

    test('Sorting by rating handles ties correctly', () => {
      fc.assert(fc.property(
        fc.array(validHeroGenerator, { minLength: 5, maxLength: 15 }),
        (heroes) => {
          const sortedHeroes = applySorting(heroes, 'rating');

          // Property: Heroes with same rating can be in any order relative to each other,
          // but all heroes with higher rating should come before heroes with lower rating
          for (let i = 0; i < sortedHeroes.length - 1; i++) {
            for (let j = i + 1; j < sortedHeroes.length; j++) {
              if (sortedHeroes[i].rating !== sortedHeroes[j].rating) {
                expect(sortedHeroes[i].rating).toBeGreaterThan(sortedHeroes[j].rating);
              }
            }
          }
        }
      ), { numRuns: 100 });
    });

    test('Sorting by price handles ties correctly', () => {
      fc.assert(fc.property(
        fc.array(validHeroGenerator, { minLength: 5, maxLength: 15 }),
        (heroes) => {
          const sortedHeroes = applySorting(heroes, 'price');

          // Property: Heroes with same price can be in any order relative to each other,
          // but all heroes with lower price should come before heroes with higher price
          for (let i = 0; i < sortedHeroes.length - 1; i++) {
            for (let j = i + 1; j < sortedHeroes.length; j++) {
              if (sortedHeroes[i].hourlyRate !== sortedHeroes[j].hourlyRate) {
                expect(sortedHeroes[i].hourlyRate).toBeLessThan(sortedHeroes[j].hourlyRate);
              }
            }
          }
        }
      ), { numRuns: 100 });
    });
  });
});
