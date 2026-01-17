import { TextInput } from '@/components/forms/text-input';
import { Button } from '@/components/ui/button';
import { database } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth';
import { useUserStore } from '@/stores/user';
import { NotificationSettings } from '@/types';
import { logger } from '@/utils/logger';
import { requestNotificationPermissions, showPermissionDeniedAlert } from '@/utils/notifications';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * CivilianProfileContent - Profile management content
 * 
 * ✅ ONBOARDING SAFE: This component handles both complete and incomplete profiles
 * ✅ ROLE VALIDATION: Ensures user role is defined before querying civilian_profiles
 * ✅ SAFE PROFILE QUERIES: Uses profile_id for civilian_profiles queries, not id
 */
function CivilianProfileContent() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { profile, civilianProfile, isLoading, loadUserProfile, updateCivilianProfile } = useUserStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationSettings>({
    push_notifications: true,
    email_notifications: true,
    sms_notifications: false,
    request_updates: true,
    chat_messages: true,
    marketing: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // ✅ ROLE VALIDATION: Ensure user ID and role are defined before querying
    // This prevents querying undefined_profiles and ensures safe database operations
    if (!user?.id || !user?.user_type) {
      console.warn('User ID or user_type is undefined, skipping profile data load');
      return;
    }

    // ✅ ROLE ASSERTION: Only proceed if user is confirmed civilian
    if (user.user_type !== 'civilian') {
      console.warn('User is not civilian, profile data load may fail');
      return;
    }

    // ✅ SAFE PROFILE QUERY: Load user profile using role-specific table query
    // This will query civilian_profiles using profile_id, not id
    loadUserProfile(user.id, user.user_type);
  }, [user?.id, user?.user_type, loadUserProfile]);

  useEffect(() => {
    // Set form data from both canonical profile and civilian profile
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
    
    if (civilianProfile) {
      setAddress(civilianProfile.address || '');
      setNotificationPrefs(civilianProfile.notification_preferences || notificationPrefs);
    }
  }, [profile, civilianProfile]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
      console.error('Sign out error:', error);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    // Validate required fields
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full name is required');
      return;
    }

    // Validate phone number format if provided
    if (phone.trim()) {
      const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(phone.trim())) {
        Alert.alert('Validation Error', 'Please enter a valid phone number');
        return;
      }
    }

    setIsSaving(true);
    
    // ✅ FIX 5: IDEMPOTENT PROFILE CREATION - Create civilian profile if it doesn't exist
    const wasOnboarding = !civilianProfile;
    
    if (!civilianProfile) {
      try {
        logger.info('Creating civilian profile for onboarding', { userId: user.id });
        const { error } = await database.createCivilianProfile(user.id, {
          address: address.trim(),
        });
        
        if (error) {
          logger.error('Failed to create civilian profile', { userId: user.id, error });
          Alert.alert('Error', 'Failed to create profile. Please try again.');
          setIsSaving(false);
          return;
        }
        
        logger.info('Civilian profile created successfully', { userId: user.id });
      } catch (error) {
        logger.error('Exception creating civilian profile', { userId: user.id, error });
        Alert.alert('Error', 'Failed to create profile. Please try again.');
        setIsSaving(false);
        return;
      }
    }

    // Update canonical profile (full_name, phone)
    const profileResult = await database.updateProfile(user.id, {
      full_name: fullName.trim(),
      phone: phone.trim(),
    });

    if (profileResult.error) {
      Alert.alert('Error', profileResult.error?.message || 'Failed to update profile');
      setIsSaving(false);
      return;
    }

    // Update civilian-specific profile (address, preferences)
    const civilianResult = await updateCivilianProfile(user.id, {
      address: address.trim(),
      notification_preferences: notificationPrefs,
    });

    setIsSaving(false);

    if (civilianResult.success) {
      setIsEditing(false);
      
      // ✅ FIX 7: FINALIZE ONBOARDING - Reload to update isOnboarded state
      await loadUserProfile(user.id, 'civilian');
      
      // ✅ FIX 8: NAVIGATE HOME AFTER ONBOARDING - Use replace to prevent back navigation
      if (wasOnboarding) {
        logger.info('Onboarding complete, navigating to home', { userId: user.id });
        Alert.alert('Success', 'Profile created successfully! Welcome to HomeHeroes.', [
          {
            text: 'Continue',
            onPress: () => {
              router.replace('/(civilian)/home');
            },
          },
        ]);
      } else {
        Alert.alert('Success', 'Profile updated successfully');
      }
    } else {
      Alert.alert('Error', civilianResult.error || 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
    if (civilianProfile) {
      setAddress(civilianProfile.address || '');
      setNotificationPrefs(civilianProfile.notification_preferences || notificationPrefs);
    }
    setIsEditing(false);
  };

  const toggleNotification = async (key: keyof NotificationSettings) => {
    if (!isEditing) return; // Only allow changes in edit mode
    
    const newValue = !notificationPrefs[key];
    
    // If enabling push notifications, request permissions
    if (key === 'push_notifications' && newValue) {
      const { granted, canAskAgain } = await requestNotificationPermissions();
      
      if (!granted) {
        if (!canAskAgain) {
          showPermissionDeniedAlert();
        } else {
          Alert.alert(
            'Permission Required',
            'Please allow notifications to receive push notifications.'
          );
        }
        return;
      }
    }
    
    setNotificationPrefs(prev => ({
      ...prev,
      [key]: newValue,
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
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Manage your account settings</Text>
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
            <Text style={[styles.value, { textTransform: 'capitalize' }]}>{user.user_type}</Text>
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
          label="Address"
          value={address}
          onChangeText={setAddress}
          placeholder="Enter your address"
          multiline
          numberOfLines={3}
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
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <Text style={styles.placeholder}>No payment methods added yet</Text>
        <Button
          title="Add Payment Method"
          onPress={() => Alert.alert('Coming Soon', 'Payment method management will be available soon')}
          variant="secondary"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
        
        <TouchableOpacity
          style={styles.notificationRow}
          onPress={() => isEditing && toggleNotification('push_notifications')}
          disabled={!isEditing}
        >
          <View>
            <Text style={styles.notificationLabel}>Push Notifications</Text>
            <Text style={styles.notificationDescription}>Receive push notifications on your device</Text>
          </View>
          <View style={[styles.toggle, notificationPrefs.push_notifications && styles.toggleActive]}>
            <View style={[styles.toggleThumb, notificationPrefs.push_notifications && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notificationRow}
          onPress={() => isEditing && toggleNotification('email_notifications')}
          disabled={!isEditing}
        >
          <View>
            <Text style={styles.notificationLabel}>Email Notifications</Text>
            <Text style={styles.notificationDescription}>Receive updates via email</Text>
          </View>
          <View style={[styles.toggle, notificationPrefs.email_notifications && styles.toggleActive]}>
            <View style={[styles.toggleThumb, notificationPrefs.email_notifications && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notificationRow}
          onPress={() => isEditing && toggleNotification('sms_notifications')}
          disabled={!isEditing}
        >
          <View>
            <Text style={styles.notificationLabel}>SMS Notifications</Text>
            <Text style={styles.notificationDescription}>Receive text message updates</Text>
          </View>
          <View style={[styles.toggle, notificationPrefs.sms_notifications && styles.toggleActive]}>
            <View style={[styles.toggleThumb, notificationPrefs.sms_notifications && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notificationRow}
          onPress={() => isEditing && toggleNotification('request_updates')}
          disabled={!isEditing}
        >
          <View>
            <Text style={styles.notificationLabel}>Request Updates</Text>
            <Text style={styles.notificationDescription}>Get notified about request status changes</Text>
          </View>
          <View style={[styles.toggle, notificationPrefs.request_updates && styles.toggleActive]}>
            <View style={[styles.toggleThumb, notificationPrefs.request_updates && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notificationRow}
          onPress={() => isEditing && toggleNotification('chat_messages')}
          disabled={!isEditing}
        >
          <View>
            <Text style={styles.notificationLabel}>Chat Messages</Text>
            <Text style={styles.notificationDescription}>Get notified about new messages</Text>
          </View>
          <View style={[styles.toggle, notificationPrefs.chat_messages && styles.toggleActive]}>
            <View style={[styles.toggleThumb, notificationPrefs.chat_messages && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notificationRow}
          onPress={() => isEditing && toggleNotification('marketing')}
          disabled={!isEditing}
        >
          <View>
            <Text style={styles.notificationLabel}>Marketing</Text>
            <Text style={styles.notificationDescription}>Receive promotional offers and updates</Text>
          </View>
          <View style={[styles.toggle, notificationPrefs.marketing && styles.toggleActive]}>
            <View style={[styles.toggleThumb, notificationPrefs.marketing && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
  },
  placeholder: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  notificationDescription: {
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

/**
 * CivilianProfileScreen - Profile management for civilian users
 * 
 * ✅ ONBOARDING SAFE: Accessible even without complete civilian_profiles
 * ✅ ROUTE PROTECTION: Protected by parent layout's ProtectedRoute
 * ✅ NO WRAPPER NEEDED: Redirect guards in ProtectedRoute prevent loops
 */
export default function CivilianProfileScreen() {
  return <CivilianProfileContent />;
}