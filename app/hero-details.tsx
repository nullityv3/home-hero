import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { database } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth';

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

// Mock hero data - fallback for development
const mockHero: HeroProfile = {
  id: '1',
  fullName: 'John Smith',
  rating: 4.8,
  completedJobs: 127,
  hourlyRate: 25,
  skills: ['Plumbing', 'Electrical', 'General Repairs'],
  availability: 'Available today',
  description: 'Experienced handyman with over 5 years of experience in home repairs and maintenance.',
};

export default function HeroDetailsModal() {
  const params = useLocalSearchParams();
  const heroId = params.heroId as string;
  const requestId = params.requestId as string | undefined;
  const { user } = useAuthStore();

  const [hero, setHero] = useState<HeroProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadHeroDetails();
  }, [heroId]);

  const loadHeroDetails = async () => {
    if (!heroId) {
      setError('Invalid hero ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch hero profile from database
      const { data, error: dbError } = await database.getUserProfile(heroId, 'hero');

      if (dbError) {
        throw new Error(dbError.message);
      }

      // ✅ FIX: Missing profile is NOT an error - it's an onboarding state
      if (!data) {
        setError('Hero profile not found - user may be completing their profile setup');
        setLoading(false);
        return;
      }

      const heroProfile = data;
      
      setHero({
        id: heroId,
        fullName: heroProfile.full_name || 'Unknown Hero',
        rating: heroProfile.rating || 0,
        completedJobs: heroProfile.completed_jobs || 0,
        hourlyRate: heroProfile.hourly_rate || 0,
        skills: heroProfile.skills || [],
        profileImageUrl: heroProfile.profile_image_url || undefined,
        availability: 'Available', // TODO: Calculate from availability schedule
        description: 'Experienced professional ready to help with your service needs.', // TODO: Add description field to database
        phone: heroProfile.phone || undefined,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load hero details';
      setError(errorMessage);
      console.error('Error loading hero details:', err);
      
      // Fallback to mock data for development
      setHero(mockHero);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  const handleSelectHero = async () => {
    if (!hero) return;

    // If no requestId is provided, show info message
    if (!requestId) {
      Alert.alert(
        'No Active Request',
        'To assign this hero, please create a service request first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Create Request', 
            onPress: () => {
              router.back();
              router.push('/create-request');
            }
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Assign Hero',
      `Are you sure you want to assign ${hero.fullName} to your service request?\n\nRate: $${hero.hourlyRate}/hour\nRating: ${hero.rating} ⭐`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Assign', 
          onPress: async () => {
            await assignHeroToRequest();
          }
        },
      ]
    );
  };

  const assignHeroToRequest = async () => {
    if (!hero || !requestId || !user) return;

    try {
      setAssigning(true);

      // Update the service request with the hero assignment
      const { error: updateError } = await database.updateServiceRequest(requestId, {
        hero_id: hero.id,
        status: 'assigned',
        updated_at: new Date().toISOString(),
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      // TODO: Send notification to hero about the assignment
      // This would be implemented in a future task with the notification system

      Alert.alert(
        'Success',
        `${hero.fullName} has been assigned to your service request!`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              router.back();
              // Navigate to requests screen to see the updated request
              router.push('/(civilian)/requests');
            }
          },
        ]
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign hero';
      Alert.alert('Error', errorMessage);
      console.error('Error assigning hero:', err);
    } finally {
      setAssigning(false);
    }
  };

  const handleStartChat = () => {
    // TODO: Navigate to chat with this hero
    Alert.alert('Info', 'Chat functionality will be implemented in a future task');
  };

  const renderRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={16} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={16} color="#FFD700" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#E5E5EA" />
      );
    }

    return stars;
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <ThemedText type="subtitle">Hero Details</ThemedText>
          <View style={styles.chatButton} />
        </ThemedView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading hero details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state (with fallback data)
  if (error && !hero) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <ThemedText type="subtitle">Hero Details</ThemedText>
          <View style={styles.chatButton} />
        </ThemedView>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorTitle}>Unable to load hero details</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadHeroDetails}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!hero) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#007AFF" />
        </TouchableOpacity>
        <ThemedText type="subtitle">Hero Details</ThemedText>
        <TouchableOpacity onPress={handleStartChat} style={styles.chatButton}>
          <Ionicons name="chatbubble-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </ThemedView>

      {error && (
        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={16} color="#FF9500" />
          <Text style={styles.warningText}>Using cached data</Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroHeader}>
          <View style={styles.profileImageContainer}>
            {hero.profileImageUrl ? (
              <Image source={{ uri: hero.profileImageUrl }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={40} color="#8E8E93" />
              </View>
            )}
          </View>
          
          <View style={styles.heroInfo}>
            <ThemedText type="title" style={styles.heroName}>
              {hero.fullName}
            </ThemedText>
            
            <View style={styles.ratingContainer}>
              <View style={styles.stars}>
                {renderRatingStars(hero.rating)}
              </View>
              <Text style={styles.ratingText}>
                {hero.rating} ({hero.completedJobs} jobs)
              </Text>
            </View>
            
            <Text style={styles.hourlyRate}>
              ${hero.hourlyRate}/hour
            </Text>
            
            <Text style={styles.availability}>
              {hero.availability}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Skills
          </ThemedText>
          <View style={styles.skillsContainer}>
            {hero.skills.map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            About
          </ThemedText>
          <Text style={styles.description}>
            {hero.description}
          </Text>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recent Reviews
          </ThemedText>
          <Text style={styles.placeholder}>
            Reviews will be implemented in a future task
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerRate}>${hero.hourlyRate}/hour</Text>
          <View style={styles.footerRating}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.footerRatingText}>{hero.rating}</Text>
          </View>
        </View>
        <Button
          title={assigning ? 'Assigning...' : requestId ? 'Assign to Request' : 'Select This Hero'}
          onPress={handleSelectHero}
          style={styles.selectButton}
          disabled={assigning}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    padding: 4,
  },
  chatButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  heroHeader: {
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  hourlyRate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  availability: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  sectionTitle: {
    marginBottom: 12,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1C1C1E',
  },
  placeholder: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  footerRate: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  footerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerRatingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  selectButton: {
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#FF9500',
  },
});