import { TextInput } from '@/components/forms/text-input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';
import { useRequestsStore } from '@/stores/requests';
import { useUserStore } from '@/stores/user';
import { AvailabilitySchedule } from '@/types';
import { logger } from '@/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<typeof DAYS[number], string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const DEFAULT_AVAILABILITY: AvailabilitySchedule = {
  monday: { start: '09:00', end: '17:00', available: false },
  tuesday: { start: '09:00', end: '17:00', available: false },
  wednesday: { start: '09:00', end: '17:00', available: false },
  thursday: { start: '09:00', end: '17:00', available: false },
  friday: { start: '09:00', end: '17:00', available: false },
  saturday: { start: '09:00', end: '17:00', available: false },
  sunday: { start: '09:00', end: '17:00', available: false },
};

/**
 * HeroProfileScreen - Default export component for Expo Router
 * 
 * ✅ DEFAULT EXPORT: Required by Expo Router for proper route handling
 * ✅ ROLE VALIDATION: Ensures user role is defined before querying hero_profiles
 * ✅ SAFE PROFILE QUERIES: Uses profile_id for hero_profiles queries, not id
 */
export default function HeroProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { heroProfile, isLoading, loadUserProfile, updateHeroProfile } = useUserStore();
  const { activeRequests, requestHistory, loadRequests } = useRequestsStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [availability, setAvailability] = useState<AvailabilitySchedule>(DEFAULT_AVAILABILITY);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState<{ full_name: string; phone: string; role: string } | null>(null);

  useEffect(() => {
    // ✅ ROLE VALIDATION: Ensure user ID and role are defined before querying
    // This prevents querying undefined_profiles and ensures safe database operations
    if (!user?.id || !user?.user_type) {
      console.warn('User ID or user_type is undefined, skipping profile data load');
      return;
    }

    // ✅ ROLE ASSERTION: Only proceed if user is confirmed hero
    if (user.user_type !== 'hero') {
      console.warn('User is not hero, profile data load may fail');
      return;
    }

    // ✅ SAFE PROFILE QUERY: Fetch profile data from public.profiles using RLS-compliant query
    const fetchProfileData = async () => {
      const { supabase } = await import('@/services/supabase');
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, role')
        .eq('id', user.id) // ✅ RLS COMPLIANT: Query by auth.uid() = profiles.id
        .maybeSingle();
      
      if (profile) {
        setProfileData(profile);
      }
    };
    
    fetchProfileData();
    loadUserProfile(user.id, 'hero'); // This will query hero_profiles using profile_id
    loadRequests(user.id, 'hero');
  }, [user?.id, user?.user_type, loadUserProfile, loadRequests]);

  // Calculate stats
  const stats = useMemo(() => {
    const pendingCount = activeRequests.filter(req => 
      req.status === 'pending' && (!req.hero_id || req.hero_id === user?.id)
    ).length;
    
    const activeCount = activeRequests.filter(req => 
      (req.status === 'active' || req.status === 'assigned') && req.hero_id === user?.id
    ).length;
    
    const completedCount = requestHistory.filter(req => 
      req.status === 'completed' && req.hero_id === user?.id
    ).length;
    
    const totalEarnings = requestHistory
      .filter(req => req.status === 'completed' && req.hero_id === user?.id && req.budget_range)
      .reduce((sum, req) => {
        const min = Number(req.budget_range?.min) || 0;
        const max = Number(req.budget_range?.max) || 0;
        return sum + ((min + max) / 2);
      }, 0);

    return { pendingCount, activeCount, completedCount, totalEarnings };
  }, [activeRequests, requestHistory, user?.id]);

  useEffect(() => {
    if (profileData) {
      setFullName(profileData.full_name || '');
      setPhone(profileData.phone || '');
    }
    if (heroProfile) {
      setSkills(heroProfile.skills || []);
      setHourlyRate(heroProfile.hourly_rate?.toString() || '');
      setAvailability(heroProfile.availability || DEFAULT_AVAILABILITY);
    }
  }, [heroProfile, profileData]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSave = async () => {
    if (!user?.id) return;

    // Validate required fields
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full name is required');
      return;
    }

    if (hourlyRate && isNaN(parseFloat(hourlyRate))) {
      Alert.alert('Validation Error', 'Hourly rate must be a valid number');
      return;
    }

    setIsSaving(true);
    
    // ✅ FIX 5: IDEMPOTENT PROFILE CREATION - Create hero profile if it doesn't exist
    const { supabase, database } = await import('@/services/supabase');
    const wasOnboarding = !heroProfile;
    
    if (!heroProfile) {
      try {
        logger.info('Creating hero profile for onboarding', { userId: user.id });
        const { error } = await database.createHeroProfile(user.id, {
          skills,
          hourly_rate: hourlyRate ? parseFloat(hourlyRate) : 0,
        });
        
        if (error) {
          logger.error('Failed to create hero profile', { userId: user.id, error });
          Alert.alert('Error', 'Failed to create profile. Please try again.');
          setIsSaving(false);
          return;
        }
        
        logger.info('Hero profile created successfully', { userId: user.id });
      } catch (error) {
        logger.error('Exception creating hero profile', { userId: user.id, error });
        Alert.alert('Error', 'Failed to create profile. Please try again.');
        setIsSaving(false);
        return;
      }
    }
    
    // Update profile data in public.profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim(),
      })
      .eq('id', user.id);

    if (profileError) {
      setIsSaving(false);
      Alert.alert('Error', 'Failed to update profile information');
      return;
    }

    // Update hero-specific data
    const result = await updateHeroProfile(user.id, {
      skills,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      availability,
    });

    setIsSaving(false);

    if (result.success) {
      // Update local profile data
      setProfileData(prev => prev ? {
        ...prev,
        full_name: fullName.trim(),
        phone: phone.trim()
      } : null);
      
      setIsEditing(false);
      
      // ✅ FIX 7: FINALIZE ONBOARDING - Reload to update isOnboarded state
      await loadUserProfile(user.id, 'hero');
      
      // ✅ FIX 8: NAVIGATE HOME AFTER ONBOARDING - Use replace to prevent back navigation
      if (wasOnboarding) {
        logger.info('Onboarding complete, navigating to dashboard', { userId: user.id });
        Alert.alert('Success', 'Profile created successfully! Welcome to HomeHeroes.', [
          {
            text: 'Continue',
            onPress: () => {
              router.replace('/(hero)/dashboard');
            },
          },
        ]);
      } else {
        Alert.alert('Success', 'Profile updated successfully');
      }
    } else {
      Alert.alert('Error', result.error || 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    if (profileData) {
      setFullName(profileData.full_name || '');
      setPhone(profileData.phone || '');
    }
    if (heroProfile) {
      setSkills(heroProfile.skills || []);
      setHourlyRate(heroProfile.hourly_rate?.toString() || '');
      setAvailability(heroProfile.availability || DEFAULT_AVAILABILITY);
    }
    setIsEditing(false);
  };

  const addSkill = () => {
    const trimmedSkill = skillInput.trim();
    if (trimmedSkill && !skills.includes(trimmedSkill)) {
      setSkills([...skills, trimmedSkill]);
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const toggleDayAvailability = (day: typeof DAYS[number]) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        available: !prev[day].available,
      },
    }));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Hero Profile</Text>
        <Text style={styles.subtitle}>Manage your professional profile</Text>
      </View>

      {user && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>User Type</Text>
            <Text style={[styles.value, { textTransform: 'capitalize' }]}>{profileData?.role || 'hero'}</Text>
          </View>
        </View>
      )}

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.pendingCard]}>
          <Ionicons name="time-outline" size={28} color="#FF9500" />
          <Text style={styles.statNumber}>{stats.pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>

        <View style={[styles.statCard, styles.activeCard]}>
          <Ionicons name="checkmark-circle-outline" size={28} color="#34C759" />
          <Text style={styles.statNumber}>{stats.activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>

        <View style={[styles.statCard, styles.completedCard]}>
          <Ionicons name="checkmark-done-outline" size={28} color="#007AFF" />
          <Text style={styles.statNumber}>{stats.completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>

        <View style={[styles.statCard, styles.earningsCard]}>
          <Ionicons name="cash-outline" size={28} color="#34C759" />
          <Text style={styles.statNumber}>${stats.totalEarnings.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Earnings</Text>
        </View>
      </View>

      {heroProfile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{heroProfile.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{heroProfile.completed_jobs}</Text>
              <Text style={styles.statLabel}>Total Jobs</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          {!isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <TextInput
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter your full name"
          editable={isEditing}
        />

        <TextInput
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="Enter your phone number"
          keyboardType="phone-pad"
          editable={isEditing}
        />

        <TextInput
          label="Hourly Rate ($)"
          value={hourlyRate}
          onChangeText={setHourlyRate}
          placeholder="Enter your hourly rate"
          keyboardType="decimal-pad"
          editable={isEditing}
        />

        {isEditing && (
          <View style={styles.buttonRow}>
            <Button
              title="Cancel"
              onPress={handleCancel}
              variant="secondary"
              style={styles.button}
            />
            <Button
              title={isSaving ? 'Saving...' : 'Save'}
              onPress={handleSave}
              disabled={isSaving}
              style={styles.button}
            />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skills</Text>
        
        {skills.length > 0 && (
          <View style={styles.skillsContainer}>
            {skills.map((skill, index) => (
              <View key={index} style={styles.skillChip}>
                <Text style={styles.skillText}>{skill}</Text>
                {isEditing && (
                  <TouchableOpacity onPress={() => removeSkill(skill)}>
                    <Text style={styles.removeSkill}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {isEditing && (
          <View style={styles.addSkillRow}>
            <TextInput
              label=""
              value={skillInput}
              onChangeText={setSkillInput}
              placeholder="Add a skill"
              style={styles.skillInput}
            />
            <Button
              title="Add"
              onPress={addSkill}
              variant="secondary"
              style={styles.addButton}
            />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Availability</Text>
        <Text style={styles.availabilityNote}>Set your weekly availability schedule</Text>
        
        {DAYS.map(day => (
          <TouchableOpacity
            key={day}
            style={styles.availabilityRow}
            onPress={() => isEditing && toggleDayAvailability(day)}
            disabled={!isEditing}
          >
            <View style={styles.dayInfo}>
              <Text style={styles.dayLabel}>{DAY_LABELS[day]}</Text>
              {availability[day].available && (
                <Text style={styles.timeRange}>
                  {availability[day].start} - {availability[day].end}
                </Text>
              )}
            </View>
            <View style={[styles.toggle, availability[day].available && styles.toggleActive]}>
              <View style={[styles.toggleThumb, availability[day].available && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="secondary"
          style={styles.signOutButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  editButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  activeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  completedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  earningsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  skillText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  removeSkill: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  addSkillRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  skillInput: {
    flex: 1,
  },
  addButton: {
    minWidth: 80,
  },
  availabilityNote: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayInfo: {
    flex: 1,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  timeRange: {
    fontSize: 14,
    color: '#666',
  },
  toggle: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: '#e0e0e0',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#34C759',
  },
  toggleThumb: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  signOutButton: {
    marginTop: 8,
  },
});