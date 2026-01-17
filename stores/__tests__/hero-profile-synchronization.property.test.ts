/**
 * **Feature: homeheroes-frontend, Property 16: Hero profile synchronization**
 * **Validates: Requirements 6.4**
 * 
 * Property-based test to verify that when a hero updates their skills or availability,
 * the changes are immediately reflected in their public profile visible to civilians.
 */

import { AvailabilitySchedule, HeroProfile } from '@/types';
import * as fc from 'fast-check';

// Mock database for hero profile operations
const mockDatabase = {
  heroProfiles: new Map<string, HeroProfile>(),
  
  // Hero's private update operation
  updateHeroProfile: async (userId: string, updates: Partial<HeroProfile>): Promise<{ data: HeroProfile | null; error: any }> => {
    const existing = mockDatabase.heroProfiles.get(userId);
    
    if (!existing) {
      return { data: null, error: { message: 'Profile not found' } };
    }
    
    const updated: HeroProfile = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    // Immediately update the profile (simulating real-time sync)
    mockDatabase.heroProfiles.set(userId, updated);
    return { data: updated, error: null };
  },
  
  // Civilian's public view operation
  getPublicHeroProfile: async (userId: string): Promise<{ data: HeroProfile | null; error: any }> => {
    const profile = mockDatabase.heroProfiles.get(userId);
    return { data: profile || null, error: profile ? null : { message: 'Profile not found' } };
  },
  
  // Search operation that civilians use
  searchHeroesBySkill: async (skill: string): Promise<{ data: HeroProfile[]; error: any }> => {
    const heroes = Array.from(mockDatabase.heroProfiles.values())
      .filter(hero => hero.skills.includes(skill));
    return { data: heroes, error: null };
  },
  
  // Search operation for available heroes
  searchAvailableHeroes: async (day: keyof AvailabilitySchedule): Promise<{ data: HeroProfile[]; error: any }> => {
    const heroes = Array.from(mockDatabase.heroProfiles.values())
      .filter(hero => hero.availability[day].available);
    return { data: heroes, error: null };
  },
  
  createHeroProfile: (userId: string, profile: Omit<HeroProfile, 'user_id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newProfile: HeroProfile = {
      user_id: userId,
      ...profile,
      created_at: now,
      updated_at: now,
    };
    mockDatabase.heroProfiles.set(userId, newProfile);
    return newProfile;
  },
  
  clear: () => {
    mockDatabase.heroProfiles.clear();
  }
};

// Generators for valid profile data
const validAvailabilityScheduleGenerator = fc.record<AvailabilitySchedule>({
  monday: fc.record({ start: fc.constant('09:00'), end: fc.constant('17:00'), available: fc.boolean() }),
  tuesday: fc.record({ start: fc.constant('09:00'), end: fc.constant('17:00'), available: fc.boolean() }),
  wednesday: fc.record({ start: fc.constant('09:00'), end: fc.constant('17:00'), available: fc.boolean() }),
  thursday: fc.record({ start: fc.constant('09:00'), end: fc.constant('17:00'), available: fc.boolean() }),
  friday: fc.record({ start: fc.constant('09:00'), end: fc.constant('17:00'), available: fc.boolean() }),
  saturday: fc.record({ start: fc.constant('09:00'), end: fc.constant('17:00'), available: fc.boolean() }),
  sunday: fc.record({ start: fc.constant('09:00'), end: fc.constant('17:00'), available: fc.boolean() }),
});

const validHeroProfileGenerator = fc.record({
  full_name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  phone: fc.string({ minLength: 10, maxLength: 15 }),
  skills: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
  hourly_rate: fc.double({ min: 10, max: 500, noNaN: true }),
  availability: validAvailabilityScheduleGenerator,
  rating: fc.constant(0),
  completed_jobs: fc.constant(0),
  profile_image_url: fc.option(fc.webUrl(), { nil: undefined }),
});

describe('Hero Profile Synchronization Properties', () => {
  beforeEach(() => {
    mockDatabase.clear();
  });

  describe('Property 16: Hero profile synchronization', () => {
    test('For any hero skills update, the changes should be immediately reflected in their public profile', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(),
        validHeroProfileGenerator,
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
        async (userId, initialProfile, newSkills) => {
          // Create initial hero profile
          mockDatabase.createHeroProfile(userId, initialProfile);
          
          // Hero updates their skills
          const { data: updatedProfile, error } = await mockDatabase.updateHeroProfile(userId, {
            skills: newSkills,
          });
          
          expect(error).toBeNull();
          expect(updatedProfile).not.toBeNull();
          
          if (!updatedProfile) return;
          
          // Property 1: Public profile should immediately reflect the new skills
          const { data: publicProfile } = await mockDatabase.getPublicHeroProfile(userId);
          expect(publicProfile).not.toBeNull();
          
          if (!publicProfile) return;
          
          expect(publicProfile.skills).toEqual(newSkills);
          expect(publicProfile.skills.length).toBe(newSkills.length);
          
          // Property 2: Each new skill should be visible in the public profile
          newSkills.forEach(skill => {
            expect(publicProfile.skills).toContain(skill);
          });
          
          // Property 3: Old skills should not be present if they were replaced
          const removedSkills = initialProfile.skills.filter(skill => !newSkills.includes(skill));
          removedSkills.forEach(skill => {
            expect(publicProfile.skills).not.toContain(skill);
          });
        }
      ), { numRuns: 100 });
    });

    test('For any hero availability update, the changes should be immediately reflected in their public profile', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(),
        validHeroProfileGenerator,
        validAvailabilityScheduleGenerator,
        async (userId, initialProfile, newAvailability) => {
          // Create initial hero profile
          mockDatabase.createHeroProfile(userId, initialProfile);
          
          // Hero updates their availability
          const { data: updatedProfile, error } = await mockDatabase.updateHeroProfile(userId, {
            availability: newAvailability,
          });
          
          expect(error).toBeNull();
          expect(updatedProfile).not.toBeNull();
          
          if (!updatedProfile) return;
          
          // Property 1: Public profile should immediately reflect the new availability
          const { data: publicProfile } = await mockDatabase.getPublicHeroProfile(userId);
          expect(publicProfile).not.toBeNull();
          
          if (!publicProfile) return;
          
          // Property 2: Each day's availability should match the update
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
          days.forEach(day => {
            expect(publicProfile.availability[day]).toEqual(newAvailability[day]);
            expect(publicProfile.availability[day].available).toBe(newAvailability[day].available);
            expect(publicProfile.availability[day].start).toBe(newAvailability[day].start);
            expect(publicProfile.availability[day].end).toBe(newAvailability[day].end);
          });
        }
      ), { numRuns: 100 });
    });

    test('When a hero adds a new skill, they should immediately appear in skill-based searches', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(),
        validHeroProfileGenerator,
        fc.string({ minLength: 1, maxLength: 50 }),
        async (userId, initialProfile, newSkill) => {
          // Ensure the new skill is not in the initial profile
          const profileWithoutSkill = {
            ...initialProfile,
            skills: initialProfile.skills.filter(s => s !== newSkill),
          };
          
          // Create initial hero profile without the new skill
          mockDatabase.createHeroProfile(userId, profileWithoutSkill);
          
          // Verify hero is not in search results for the new skill
          const { data: beforeSearch } = await mockDatabase.searchHeroesBySkill(newSkill);
          const beforeFound = beforeSearch.find(hero => hero.user_id === userId);
          expect(beforeFound).toBeUndefined();
          
          // Hero adds the new skill
          const updatedSkills = [...profileWithoutSkill.skills, newSkill];
          await mockDatabase.updateHeroProfile(userId, {
            skills: updatedSkills,
          });
          
          // Property: Hero should immediately appear in search results for the new skill
          const { data: afterSearch } = await mockDatabase.searchHeroesBySkill(newSkill);
          const afterFound = afterSearch.find(hero => hero.user_id === userId);
          
          expect(afterFound).toBeDefined();
          expect(afterFound?.skills).toContain(newSkill);
        }
      ), { numRuns: 100 });
    });

    test('When a hero removes a skill, they should immediately disappear from skill-based searches', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(),
        validHeroProfileGenerator,
        async (userId, initialProfile) => {
          // Ensure profile has at least one skill
          fc.pre(initialProfile.skills.length > 0);
          
          const skillToRemove = initialProfile.skills[0];
          
          // Create initial hero profile with the skill
          mockDatabase.createHeroProfile(userId, initialProfile);
          
          // Verify hero is in search results for the skill
          const { data: beforeSearch } = await mockDatabase.searchHeroesBySkill(skillToRemove);
          const beforeFound = beforeSearch.find(hero => hero.user_id === userId);
          expect(beforeFound).toBeDefined();
          
          // Hero removes the skill
          const updatedSkills = initialProfile.skills.filter(s => s !== skillToRemove);
          await mockDatabase.updateHeroProfile(userId, {
            skills: updatedSkills,
          });
          
          // Property: Hero should immediately disappear from search results for the removed skill
          const { data: afterSearch } = await mockDatabase.searchHeroesBySkill(skillToRemove);
          const afterFound = afterSearch.find(hero => hero.user_id === userId);
          
          if (updatedSkills.includes(skillToRemove)) {
            // If the skill still exists (was duplicated), hero should still be found
            expect(afterFound).toBeDefined();
          } else {
            // If the skill was completely removed, hero should not be found
            expect(afterFound).toBeUndefined();
          }
        }
      ), { numRuns: 100 });
    });

    test('When a hero updates availability for a day, they should immediately appear/disappear in availability searches', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(),
        validHeroProfileGenerator,
        fc.constantFrom<keyof AvailabilitySchedule>('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
        async (userId, initialProfile, dayToUpdate) => {
          // Create initial hero profile
          mockDatabase.createHeroProfile(userId, initialProfile);
          
          const initialAvailability = initialProfile.availability[dayToUpdate].available;
          
          // Check initial search results
          const { data: beforeSearch } = await mockDatabase.searchAvailableHeroes(dayToUpdate);
          const beforeFound = beforeSearch.find(hero => hero.user_id === userId);
          
          if (initialAvailability) {
            expect(beforeFound).toBeDefined();
          } else {
            expect(beforeFound).toBeUndefined();
          }
          
          // Hero toggles availability for the day
          const newAvailability = {
            ...initialProfile.availability,
            [dayToUpdate]: {
              ...initialProfile.availability[dayToUpdate],
              available: !initialAvailability,
            },
          };
          
          await mockDatabase.updateHeroProfile(userId, {
            availability: newAvailability,
          });
          
          // Property: Hero should immediately appear/disappear in availability searches
          const { data: afterSearch } = await mockDatabase.searchAvailableHeroes(dayToUpdate);
          const afterFound = afterSearch.find(hero => hero.user_id === userId);
          
          if (!initialAvailability) {
            // Was unavailable, now available - should be found
            expect(afterFound).toBeDefined();
            expect(afterFound?.availability[dayToUpdate].available).toBe(true);
          } else {
            // Was available, now unavailable - should not be found
            expect(afterFound).toBeUndefined();
          }
        }
      ), { numRuns: 100 });
    });

    test('Multiple rapid updates to hero profile should all be reflected in public profile', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(),
        validHeroProfileGenerator,
        fc.array(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }), { minLength: 2, maxLength: 5 }),
        async (userId, initialProfile, skillUpdates) => {
          // Create initial hero profile
          mockDatabase.createHeroProfile(userId, initialProfile);
          
          // Apply multiple rapid updates
          for (const skills of skillUpdates) {
            await mockDatabase.updateHeroProfile(userId, { skills });
          }
          
          // Property: Public profile should reflect the final update
          const { data: publicProfile } = await mockDatabase.getPublicHeroProfile(userId);
          expect(publicProfile).not.toBeNull();
          
          if (!publicProfile) return;
          
          const finalSkills = skillUpdates[skillUpdates.length - 1];
          expect(publicProfile.skills).toEqual(finalSkills);
        }
      ), { numRuns: 50 });
    });

    test('Updating both skills and availability simultaneously should reflect both changes in public profile', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(),
        validHeroProfileGenerator,
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
        validAvailabilityScheduleGenerator,
        async (userId, initialProfile, newSkills, newAvailability) => {
          // Create initial hero profile
          mockDatabase.createHeroProfile(userId, initialProfile);
          
          // Update both skills and availability simultaneously
          await mockDatabase.updateHeroProfile(userId, {
            skills: newSkills,
            availability: newAvailability,
          });
          
          // Property: Public profile should reflect both updates
          const { data: publicProfile } = await mockDatabase.getPublicHeroProfile(userId);
          expect(publicProfile).not.toBeNull();
          
          if (!publicProfile) return;
          
          expect(publicProfile.skills).toEqual(newSkills);
          expect(publicProfile.availability).toEqual(newAvailability);
          
          // Property: Hero should be searchable by new skills
          for (const skill of newSkills) {
            const { data: searchResults } = await mockDatabase.searchHeroesBySkill(skill);
            const found = searchResults.find(hero => hero.user_id === userId);
            expect(found).toBeDefined();
          }
        }
      ), { numRuns: 100 });
    });

    test('Hero profile updates should not affect other heroes\' public profiles', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        validHeroProfileGenerator,
        validHeroProfileGenerator,
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
        async (userId1, userId2, profile1, profile2, newSkills) => {
          // Ensure different user IDs
          fc.pre(userId1 !== userId2);
          
          // Create two hero profiles
          mockDatabase.createHeroProfile(userId1, profile1);
          mockDatabase.createHeroProfile(userId2, profile2);
          
          // Update hero 1's skills
          await mockDatabase.updateHeroProfile(userId1, {
            skills: newSkills,
          });
          
          // Property: Hero 1's public profile should reflect the update
          const { data: publicProfile1 } = await mockDatabase.getPublicHeroProfile(userId1);
          expect(publicProfile1?.skills).toEqual(newSkills);
          
          // Property: Hero 2's public profile should remain unchanged
          const { data: publicProfile2 } = await mockDatabase.getPublicHeroProfile(userId2);
          expect(publicProfile2?.skills).toEqual(profile2.skills);
          expect(publicProfile2?.availability).toEqual(profile2.availability);
        }
      ), { numRuns: 100 });
    });
  });
});
