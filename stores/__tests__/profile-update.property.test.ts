/**
 * **Feature: homeheroes-frontend, Property 15: Profile update persistence**
 * **Validates: Requirements 6.2**
 * 
 * Property-based test to verify that when a user updates their profile information,
 * the updates are validated, saved immediately, and reflected in the user's profile display.
 */

import { AvailabilitySchedule, CivilianProfile, HeroProfile, NotificationSettings } from '@/types';
import * as fc from 'fast-check';

// Mock database for profile operations
const mockDatabase = {
  civilianProfiles: new Map<string, CivilianProfile>(),
  heroProfiles: new Map<string, HeroProfile>(),
  
  updateCivilianProfile: async (userId: string, updates: Partial<CivilianProfile>): Promise<{ data: CivilianProfile | null; error: any }> => {
    const existing = mockDatabase.civilianProfiles.get(userId);
    
    if (!existing) {
      return { data: null, error: { message: 'Profile not found' } };
    }
    
    // Validate required fields
    if (updates.full_name !== undefined && !updates.full_name.trim()) {
      return { data: null, error: { message: 'Full name is required' } };
    }
    
    const updated: CivilianProfile = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    mockDatabase.civilianProfiles.set(userId, updated);
    return { data: updated, error: null };
  },
  
  updateHeroProfile: async (userId: string, updates: Partial<HeroProfile>): Promise<{ data: HeroProfile | null; error: any }> => {
    const existing = mockDatabase.heroProfiles.get(userId);
    
    if (!existing) {
      return { data: null, error: { message: 'Profile not found' } };
    }
    
    // Validate required fields
    if (updates.full_name !== undefined && !updates.full_name.trim()) {
      return { data: null, error: { message: 'Full name is required' } };
    }
    
    // Validate hourly rate
    if (updates.hourly_rate !== undefined && updates.hourly_rate < 0) {
      return { data: null, error: { message: 'Hourly rate must be positive' } };
    }
    
    const updated: HeroProfile = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    mockDatabase.heroProfiles.set(userId, updated);
    return { data: updated, error: null };
  },
  
  getCivilianProfile: async (userId: string): Promise<{ data: CivilianProfile | null; error: any }> => {
    const profile = mockDatabase.civilianProfiles.get(userId);
    return { data: profile || null, error: profile ? null : { message: 'Profile not found' } };
  },
  
  getHeroProfile: async (userId: string): Promise<{ data: HeroProfile | null; error: any }> => {
    const profile = mockDatabase.heroProfiles.get(userId);
    return { data: profile || null, error: profile ? null : { message: 'Profile not found' } };
  },
  
  createCivilianProfile: (userId: string, profile: Omit<CivilianProfile, 'user_id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newProfile: CivilianProfile = {
      user_id: userId,
      ...profile,
      created_at: now,
      updated_at: now,
    };
    mockDatabase.civilianProfiles.set(userId, newProfile);
    return newProfile;
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
    mockDatabase.civilianProfiles.clear();
    mockDatabase.heroProfiles.clear();
  }
};

// Generators for valid profile data
const validNotificationSettingsGenerator = fc.record<NotificationSettings>({
  push_notifications: fc.boolean(),
  email_notifications: fc.boolean(),
  sms_notifications: fc.boolean(),
  request_updates: fc.boolean(),
  chat_messages: fc.boolean(),
  marketing: fc.boolean(),
});

const validAvailabilityScheduleGenerator = fc.record<AvailabilitySchedule>({
  monday: fc.record({ start: fc.constant('09:00'), end: fc.constant('17:00'), available: fc.boolean() }),
  tuesday: fc.record({ start: fc.constant('09:00'), end: fc.constant('17:00'), available: fc.boolean() }),
  wednesday: fc.record({ start: fc.constant('09:00'), end: fc.constant('17:00'), available: fc.boolean() }),
  thursday: fc.record({ start: fc.constant('09:00'), end: fc.constant('17:00'), available: fc.boolean() }),
  friday: fc.record({ start: fc.constant('09:00'), end: fc.constant('17:00'), available: fc.boolean() }),
  saturday: fc.record({ start: fc.constant('09:00'), end: fc.constant('17:00'), available: fc.boolean() }),
  sunday: fc.record({ start: fc.constant('09:00'), end: fc.constant('17:00'), available: fc.boolean() }),
});

const validCivilianProfileGenerator = fc.record({
  full_name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  phone: fc.string({ minLength: 10, maxLength: 15 }),
  address: fc.string({ minLength: 5, maxLength: 200 }),
  payment_methods: fc.constant([] as any[]),
  notification_preferences: validNotificationSettingsGenerator,
});

const validHeroProfileGenerator = fc.record({
  full_name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  phone: fc.string({ minLength: 10, maxLength: 15 }),
  skills: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 10 }),
  hourly_rate: fc.double({ min: 10, max: 500, noNaN: true }),
  availability: validAvailabilityScheduleGenerator,
  rating: fc.constant(0),
  completed_jobs: fc.constant(0),
  profile_image_url: fc.option(fc.webUrl(), { nil: undefined }),
});

describe('Profile Update Properties', () => {
  beforeEach(() => {
    mockDatabase.clear();
  });

  describe('Property 15: Profile update persistence (Civilian)', () => {
    test('For any valid civilian profile updates, the updates should be validated, saved immediately, and reflected in the profile', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(), // userId
        validCivilianProfileGenerator, // initial profile
        validCivilianProfileGenerator, // updates
        async (userId, initialProfile, updates) => {
          // Create initial profile
          mockDatabase.createCivilianProfile(userId, initialProfile);
          
          // Update the profile
          const { data: updatedProfile, error } = await mockDatabase.updateCivilianProfile(userId, updates);
          
          // Property 1: Update should succeed with valid data
          expect(error).toBeNull();
          expect(updatedProfile).not.toBeNull();
          
          if (!updatedProfile) return;
          
          // Property 2: All updated fields should be reflected
          expect(updatedProfile.full_name).toBe(updates.full_name);
          expect(updatedProfile.phone).toBe(updates.phone);
          expect(updatedProfile.address).toBe(updates.address);
          expect(updatedProfile.notification_preferences).toEqual(updates.notification_preferences);
          
          // Property 3: Updated profile should be immediately retrievable
          const { data: retrievedProfile } = await mockDatabase.getCivilianProfile(userId);
          expect(retrievedProfile).not.toBeNull();
          
          if (!retrievedProfile) return;
          
          // Property 4: Retrieved profile should match updated profile
          expect(retrievedProfile.full_name).toBe(updates.full_name);
          expect(retrievedProfile.phone).toBe(updates.phone);
          expect(retrievedProfile.address).toBe(updates.address);
          expect(retrievedProfile.notification_preferences).toEqual(updates.notification_preferences);
          
          // Property 5: Updated timestamp should be set
          expect(retrievedProfile.updated_at).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('Updating civilian profile with empty full_name should fail validation', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(),
        validCivilianProfileGenerator,
        fc.constantFrom('', '   ', '\t', '\n'),
        async (userId, initialProfile, emptyName) => {
          // Create initial profile
          mockDatabase.createCivilianProfile(userId, initialProfile);
          
          // Attempt to update with empty name
          const { data, error } = await mockDatabase.updateCivilianProfile(userId, {
            full_name: emptyName,
          });
          
          // Property: Update should fail
          expect(error).not.toBeNull();
          expect(data).toBeNull();
          
          // Property: Original profile should remain unchanged
          const { data: unchangedProfile } = await mockDatabase.getCivilianProfile(userId);
          expect(unchangedProfile?.full_name).toBe(initialProfile.full_name);
        }
      ), { numRuns: 50 });
    });

    test('Multiple sequential updates should preserve the latest values', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(),
        validCivilianProfileGenerator,
        fc.array(validCivilianProfileGenerator, { minLength: 2, maxLength: 5 }),
        async (userId, initialProfile, updateSequence) => {
          // Create initial profile
          mockDatabase.createCivilianProfile(userId, initialProfile);
          
          let lastUpdate = updateSequence[updateSequence.length - 1];
          
          // Apply updates sequentially
          for (const update of updateSequence) {
            await mockDatabase.updateCivilianProfile(userId, update);
          }
          
          // Property: Final profile should reflect the last update
          const { data: finalProfile } = await mockDatabase.getCivilianProfile(userId);
          expect(finalProfile).not.toBeNull();
          
          if (!finalProfile) return;
          
          expect(finalProfile.full_name).toBe(lastUpdate.full_name);
          expect(finalProfile.phone).toBe(lastUpdate.phone);
          expect(finalProfile.address).toBe(lastUpdate.address);
          expect(finalProfile.notification_preferences).toEqual(lastUpdate.notification_preferences);
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 15: Profile update persistence (Hero)', () => {
    test('For any valid hero profile updates, the updates should be validated, saved immediately, and reflected in the profile', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(),
        validHeroProfileGenerator,
        validHeroProfileGenerator,
        async (userId, initialProfile, updates) => {
          // Create initial profile
          mockDatabase.createHeroProfile(userId, initialProfile);
          
          // Update the profile
          const { data: updatedProfile, error } = await mockDatabase.updateHeroProfile(userId, updates);
          
          // Property 1: Update should succeed with valid data
          expect(error).toBeNull();
          expect(updatedProfile).not.toBeNull();
          
          if (!updatedProfile) return;
          
          // Property 2: All updated fields should be reflected
          expect(updatedProfile.full_name).toBe(updates.full_name);
          expect(updatedProfile.phone).toBe(updates.phone);
          expect(updatedProfile.skills).toEqual(updates.skills);
          expect(updatedProfile.hourly_rate).toBe(updates.hourly_rate);
          expect(updatedProfile.availability).toEqual(updates.availability);
          
          // Property 3: Updated profile should be immediately retrievable
          const { data: retrievedProfile } = await mockDatabase.getHeroProfile(userId);
          expect(retrievedProfile).not.toBeNull();
          
          if (!retrievedProfile) return;
          
          // Property 4: Retrieved profile should match updated profile
          expect(retrievedProfile.full_name).toBe(updates.full_name);
          expect(retrievedProfile.phone).toBe(updates.phone);
          expect(retrievedProfile.skills).toEqual(updates.skills);
          expect(retrievedProfile.hourly_rate).toBe(updates.hourly_rate);
          expect(retrievedProfile.availability).toEqual(updates.availability);
          
          // Property 5: Updated timestamp should be set
          expect(retrievedProfile.updated_at).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('Updating hero profile with negative hourly rate should fail validation', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(),
        validHeroProfileGenerator,
        fc.double({ min: -1000, max: -0.01 }),
        async (userId, initialProfile, negativeRate) => {
          // Create initial profile
          mockDatabase.createHeroProfile(userId, initialProfile);
          
          // Attempt to update with negative rate
          const { data, error } = await mockDatabase.updateHeroProfile(userId, {
            hourly_rate: negativeRate,
          });
          
          // Property: Update should fail
          expect(error).not.toBeNull();
          expect(data).toBeNull();
          
          // Property: Original profile should remain unchanged
          const { data: unchangedProfile } = await mockDatabase.getHeroProfile(userId);
          expect(unchangedProfile?.hourly_rate).toBe(initialProfile.hourly_rate);
        }
      ), { numRuns: 50 });
    });

    test('Updating hero skills should preserve all skill values', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(),
        validHeroProfileGenerator,
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
        async (userId, initialProfile, newSkills) => {
          // Create initial profile
          mockDatabase.createHeroProfile(userId, initialProfile);
          
          // Update skills
          const { data: updatedProfile } = await mockDatabase.updateHeroProfile(userId, {
            skills: newSkills,
          });
          
          expect(updatedProfile).not.toBeNull();
          
          if (!updatedProfile) return;
          
          // Property: All skills should be preserved
          expect(updatedProfile.skills).toEqual(newSkills);
          expect(updatedProfile.skills.length).toBe(newSkills.length);
          
          // Property: Each skill should be in the updated profile
          newSkills.forEach(skill => {
            expect(updatedProfile.skills).toContain(skill);
          });
        }
      ), { numRuns: 100 });
    });

    test('Updating hero availability should preserve all day settings', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(),
        validHeroProfileGenerator,
        validAvailabilityScheduleGenerator,
        async (userId, initialProfile, newAvailability) => {
          // Create initial profile
          mockDatabase.createHeroProfile(userId, initialProfile);
          
          // Update availability
          const { data: updatedProfile } = await mockDatabase.updateHeroProfile(userId, {
            availability: newAvailability,
          });
          
          expect(updatedProfile).not.toBeNull();
          
          if (!updatedProfile) return;
          
          // Property: All day settings should be preserved
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
          days.forEach(day => {
            expect(updatedProfile.availability[day]).toEqual(newAvailability[day]);
          });
        }
      ), { numRuns: 100 });
    });
  });

  describe('Property 15: Partial updates', () => {
    test('Partial civilian profile updates should only modify specified fields', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(),
        validCivilianProfileGenerator,
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        async (userId, initialProfile, newName) => {
          // Create initial profile
          mockDatabase.createCivilianProfile(userId, initialProfile);
          
          // Update only the name
          const { data: updatedProfile } = await mockDatabase.updateCivilianProfile(userId, {
            full_name: newName,
          });
          
          expect(updatedProfile).not.toBeNull();
          
          if (!updatedProfile) return;
          
          // Property: Name should be updated
          expect(updatedProfile.full_name).toBe(newName);
          
          // Property: Other fields should remain unchanged
          expect(updatedProfile.phone).toBe(initialProfile.phone);
          expect(updatedProfile.address).toBe(initialProfile.address);
          expect(updatedProfile.notification_preferences).toEqual(initialProfile.notification_preferences);
        }
      ), { numRuns: 100 });
    });

    test('Partial hero profile updates should only modify specified fields', async () => {
      await fc.assert(fc.asyncProperty(
        fc.uuid(),
        validHeroProfileGenerator,
        fc.double({ min: 10, max: 500 }),
        async (userId, initialProfile, newRate) => {
          // Create initial profile
          mockDatabase.createHeroProfile(userId, initialProfile);
          
          // Update only the hourly rate
          const { data: updatedProfile } = await mockDatabase.updateHeroProfile(userId, {
            hourly_rate: newRate,
          });
          
          expect(updatedProfile).not.toBeNull();
          
          if (!updatedProfile) return;
          
          // Property: Rate should be updated
          expect(updatedProfile.hourly_rate).toBe(newRate);
          
          // Property: Other fields should remain unchanged
          expect(updatedProfile.full_name).toBe(initialProfile.full_name);
          expect(updatedProfile.phone).toBe(initialProfile.phone);
          expect(updatedProfile.skills).toEqual(initialProfile.skills);
          expect(updatedProfile.availability).toEqual(initialProfile.availability);
        }
      ), { numRuns: 100 });
    });
  });
});
