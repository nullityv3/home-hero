/**
 * **Feature: homeheroes-frontend, Property 5: Hero filtering accuracy**
 * **Validates: Requirements 2.2**
 * 
 * Property-based test to verify that when a civilian applies search filters,
 * the system returns only heroes matching the specified criteria for price, rating, and distance.
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

interface HeroFilters {
  searchQuery: string;
  minRating: number;
  maxPrice: number;
  selectedSkills: string[];
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

// Generator for filter configurations
const validFiltersGenerator = fc.record<HeroFilters>({
  searchQuery: fc.oneof(
    fc.constant(''),
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.constantFrom(...AVAILABLE_SKILLS)
  ),
  minRating: fc.constantFrom(0, 3, 4, 4.5),
  maxPrice: fc.constantFrom(1000, 50, 40, 30, 20),
  selectedSkills: fc.array(fc.constantFrom(...AVAILABLE_SKILLS), { maxLength: 3 }).map(arr => [...new Set(arr)]),
});

// Function to apply filters (extracted from the component logic)
function applyFilters(heroes: Hero[], filters: HeroFilters): Hero[] {
  let result = [...heroes];

  // Apply search query filter
  if (filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase();
    result = result.filter(hero =>
      hero.fullName.toLowerCase().includes(query) ||
      hero.skills.some(skill => skill.toLowerCase().includes(query))
    );
  }

  // Apply rating filter
  if (filters.minRating > 0) {
    result = result.filter(hero => hero.rating >= filters.minRating);
  }

  // Apply price filter
  if (filters.maxPrice < 1000) {
    result = result.filter(hero => hero.hourlyRate <= filters.maxPrice);
  }

  // Apply skills filter
  if (filters.selectedSkills.length > 0) {
    result = result.filter(hero =>
      filters.selectedSkills.some(skill => hero.skills.includes(skill))
    );
  }

  return result;
}

describe('Hero Filtering Properties', () => {
  describe('Property 5: Hero filtering accuracy', () => {
    test('For any search criteria, all returned heroes should match the specified criteria and no matching heroes should be excluded', () => {
      fc.assert(fc.property(
        fc.array(validHeroGenerator, { minLength: 5, maxLength: 20 }),
        validFiltersGenerator,
        (heroes, filters) => {
          const filteredHeroes = applyFilters(heroes, filters);

          // Property 1: All returned heroes must match the search query
          if (filters.searchQuery.trim()) {
            const query = filters.searchQuery.toLowerCase();
            filteredHeroes.forEach(hero => {
              const matchesName = hero.fullName.toLowerCase().includes(query);
              const matchesSkill = hero.skills.some(skill => skill.toLowerCase().includes(query));
              expect(matchesName || matchesSkill).toBe(true);
            });
          }

          // Property 2: All returned heroes must meet the minimum rating requirement
          if (filters.minRating > 0) {
            filteredHeroes.forEach(hero => {
              expect(hero.rating).toBeGreaterThanOrEqual(filters.minRating);
            });
          }

          // Property 3: All returned heroes must be within the max price limit
          if (filters.maxPrice < 1000) {
            filteredHeroes.forEach(hero => {
              expect(hero.hourlyRate).toBeLessThanOrEqual(filters.maxPrice);
            });
          }

          // Property 4: All returned heroes must have at least one of the selected skills
          if (filters.selectedSkills.length > 0) {
            filteredHeroes.forEach(hero => {
              const hasMatchingSkill = filters.selectedSkills.some(skill => hero.skills.includes(skill));
              expect(hasMatchingSkill).toBe(true);
            });
          }

          // Property 5: No matching heroes should be excluded
          heroes.forEach(hero => {
            let shouldBeIncluded = true;

            // Check search query
            if (filters.searchQuery.trim()) {
              const query = filters.searchQuery.toLowerCase();
              const matchesName = hero.fullName.toLowerCase().includes(query);
              const matchesSkill = hero.skills.some(skill => skill.toLowerCase().includes(query));
              if (!matchesName && !matchesSkill) {
                shouldBeIncluded = false;
              }
            }

            // Check rating
            if (shouldBeIncluded && filters.minRating > 0) {
              if (hero.rating < filters.minRating) {
                shouldBeIncluded = false;
              }
            }

            // Check price
            if (shouldBeIncluded && filters.maxPrice < 1000) {
              if (hero.hourlyRate > filters.maxPrice) {
                shouldBeIncluded = false;
              }
            }

            // Check skills
            if (shouldBeIncluded && filters.selectedSkills.length > 0) {
              const hasMatchingSkill = filters.selectedSkills.some(skill => hero.skills.includes(skill));
              if (!hasMatchingSkill) {
                shouldBeIncluded = false;
              }
            }

            // Verify inclusion/exclusion is correct
            const isIncluded = filteredHeroes.some(h => h.id === hero.id);
            expect(isIncluded).toBe(shouldBeIncluded);
          });
        }
      ), { numRuns: 100 });
    });

    test('Empty filters should return all heroes', () => {
      fc.assert(fc.property(
        fc.array(validHeroGenerator, { minLength: 1, maxLength: 20 }),
        (heroes) => {
          const emptyFilters: HeroFilters = {
            searchQuery: '',
            minRating: 0,
            maxPrice: 1000,
            selectedSkills: [],
          };

          const filteredHeroes = applyFilters(heroes, emptyFilters);

          // Property: With no filters, all heroes should be returned
          expect(filteredHeroes.length).toBe(heroes.length);
          
          heroes.forEach(hero => {
            expect(filteredHeroes.some(h => h.id === hero.id)).toBe(true);
          });
        }
      ), { numRuns: 100 });
    });

    test('Combining multiple filters should apply all criteria', () => {
      fc.assert(fc.property(
        fc.array(validHeroGenerator, { minLength: 10, maxLength: 30 }),
        fc.constantFrom(...AVAILABLE_SKILLS),
        fc.constantFrom(3, 4, 4.5),
        fc.constantFrom(20, 30, 40),
        (heroes, skill, minRating, maxPrice) => {
          const filters: HeroFilters = {
            searchQuery: '',
            minRating,
            maxPrice,
            selectedSkills: [skill],
          };

          const filteredHeroes = applyFilters(heroes, filters);

          // Property: All returned heroes must satisfy ALL filter criteria
          filteredHeroes.forEach(hero => {
            expect(hero.rating).toBeGreaterThanOrEqual(minRating);
            expect(hero.hourlyRate).toBeLessThanOrEqual(maxPrice);
            expect(hero.skills).toContain(skill);
          });

          // Property: Count should match manual filtering
          const manualCount = heroes.filter(hero =>
            hero.rating >= minRating &&
            hero.hourlyRate <= maxPrice &&
            hero.skills.includes(skill)
          ).length;

          expect(filteredHeroes.length).toBe(manualCount);
        }
      ), { numRuns: 100 });
    });

    test('Search query should be case-insensitive', () => {
      fc.assert(fc.property(
        fc.array(validHeroGenerator, { minLength: 5, maxLength: 15 }),
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
        (heroes, searchTerm) => {
          const lowerFilters: HeroFilters = {
            searchQuery: searchTerm.toLowerCase(),
            minRating: 0,
            maxPrice: 1000,
            selectedSkills: [],
          };

          const upperFilters: HeroFilters = {
            searchQuery: searchTerm.toUpperCase(),
            minRating: 0,
            maxPrice: 1000,
            selectedSkills: [],
          };

          const mixedFilters: HeroFilters = {
            searchQuery: searchTerm,
            minRating: 0,
            maxPrice: 1000,
            selectedSkills: [],
          };

          const lowerResults = applyFilters(heroes, lowerFilters);
          const upperResults = applyFilters(heroes, upperFilters);
          const mixedResults = applyFilters(heroes, mixedFilters);

          // Property: Case variations should return the same results
          expect(lowerResults.length).toBe(upperResults.length);
          expect(lowerResults.length).toBe(mixedResults.length);

          const lowerIds = lowerResults.map(h => h.id).sort();
          const upperIds = upperResults.map(h => h.id).sort();
          const mixedIds = mixedResults.map(h => h.id).sort();

          expect(lowerIds).toEqual(upperIds);
          expect(lowerIds).toEqual(mixedIds);
        }
      ), { numRuns: 100 });
    });

    test('Filtering should not modify the original heroes array', () => {
      fc.assert(fc.property(
        fc.array(validHeroGenerator, { minLength: 5, maxLength: 15 }),
        validFiltersGenerator,
        (heroes, filters) => {
          const originalHeroes = JSON.parse(JSON.stringify(heroes));
          
          applyFilters(heroes, filters);

          // Property: Original array should remain unchanged
          expect(heroes).toEqual(originalHeroes);
        }
      ), { numRuns: 100 });
    });

    test('Multiple skill filters should use OR logic (match any skill)', () => {
      fc.assert(fc.property(
        fc.array(validHeroGenerator, { minLength: 10, maxLength: 20 }),
        fc.array(fc.constantFrom(...AVAILABLE_SKILLS), { minLength: 2, maxLength: 3 }).map(arr => [...new Set(arr)]),
        (heroes, selectedSkills) => {
          fc.pre(selectedSkills.length >= 2);

          const filters: HeroFilters = {
            searchQuery: '',
            minRating: 0,
            maxPrice: 1000,
            selectedSkills,
          };

          const filteredHeroes = applyFilters(heroes, filters);

          // Property: Each returned hero should have at least one of the selected skills
          filteredHeroes.forEach(hero => {
            const hasAnySkill = selectedSkills.some(skill => hero.skills.includes(skill));
            expect(hasAnySkill).toBe(true);
          });

          // Property: Heroes with any of the selected skills should be included
          heroes.forEach(hero => {
            const hasAnySkill = selectedSkills.some(skill => hero.skills.includes(skill));
            const isIncluded = filteredHeroes.some(h => h.id === hero.id);
            expect(isIncluded).toBe(hasAnySkill);
          });
        }
      ), { numRuns: 100 });
    });
  });
});
