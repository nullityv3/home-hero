import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { ListSkeleton } from '@/components/ui/loading-skeleton';
import { useAuthStore } from '@/stores/auth';
import { useRequestsStore } from '@/stores/requests';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HeroAcceptance {
  id: string;
  request_id: string;
  hero_id: string;
  accepted_at: string;
  chosen: boolean;
  profiles: {
    id: string;
    full_name: string;
    phone: string;
    hero_profiles: Array<{
      skills: string[];
      hourly_rate: number;
      rating: number;
      completed_jobs: number;
      profile_image_url: string | null;
    }>;
  };
}

export default function ChooseHeroAcceptancesScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const { user } = useAuthStore();
  const { getRequestAcceptances, chooseHero } = useRequestsStore();
  
  const [acceptances, setAcceptances] = useState<HeroAcceptance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChoosing, setIsChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.id || user.user_type !== 'civilian') {
      router.replace('/(auth)/login');
      return;
    }

    if (!requestId) {
      router.back();
      return;
    }

    loadAcceptances();
  }, [user?.id, user?.user_type, requestId]);

  const loadAcceptances = async () => {
    if (!requestId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getRequestAcceptances(requestId);
      
      if (result.success && result.data) {
        setAcceptances(result.data as HeroAcceptance[]);
      } else {
        setError(result.error || 'Failed to load hero acceptances');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAcceptances();
    setRefreshing(false);
  };

  const handleChooseHero = async (heroId: string, heroName: string) => {
    if (!user?.id || !requestId) return;

    Alert.alert(
      'Choose Hero',
      `Are you sure you want to choose ${heroName} for this request? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose Hero',
          style: 'default',
          onPress: async () => {
            setIsChoosing(true);
            setError(null);

            try {
              const result = await chooseHero(requestId, heroId, user.id);
              
              if (result.success) {
                Alert.alert(
                  'Hero Chosen!',
                  `${heroName} has been assigned to your request. You can now chat with them.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => router.back()
                    }
                  ]
                );
              } else {
                setError(result.error || 'Failed to choose hero');
              }
            } catch (err) {
              setError('An unexpected error occurred');
            } finally {
              setIsChoosing(false);
            }
          }
        }
      ]
    );
  };

  const renderHeroCard = (acceptance: HeroAcceptance) => {
    const hero = acceptance.profiles;
    const heroProfile = hero.hero_profiles?.[0];
    
    if (!heroProfile) return null;

    return (
      <View key={acceptance.id} style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroImageContainer}>
            {heroProfile.profile_image_url ? (
              <Image 
                source={{ uri: heroProfile.profile_image_url }} 
                style={styles.heroImage}
              />
            ) : (
              <View style={styles.heroImagePlaceholder}>
                <Ionicons name="person" size={32} color="#8E8E93" />
              </View>
            )}
          </View>
          
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{hero.full_name}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.rating}>{heroProfile.rating.toFixed(1)}</Text>
              <Text style={styles.jobsCount}>({heroProfile.completed_jobs} jobs)</Text>
            </View>
            <Text style={styles.hourlyRate}>${heroProfile.hourly_rate}/hour</Text>
          </View>
        </View>

        {/* Skills */}
        {heroProfile.skills && heroProfile.skills.length > 0 && (
          <View style={styles.skillsContainer}>
            <Text style={styles.skillsTitle}>Skills:</Text>
            <View style={styles.skillsWrapper}>
              {heroProfile.skills.slice(0, 3).map((skill, index) => (
                <View key={index} style={styles.skillBadge}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
              {heroProfile.skills.length > 3 && (
                <Text style={styles.moreSkills}>+{heroProfile.skills.length - 3} more</Text>
              )}
            </View>
          </View>
        )}

        {/* Acceptance Time */}
        <View style={styles.acceptanceInfo}>
          <Ionicons name="time-outline" size={16} color="#8E8E93" />
          <Text style={styles.acceptanceTime}>
            Accepted {new Date(acceptance.accepted_at).toLocaleDateString()}
          </Text>
        </View>

        {/* Choose Button */}
        <Button
          title="Choose This Hero"
          onPress={() => handleChooseHero(hero.id, hero.full_name)}
          disabled={isChoosing}
          style={styles.chooseButton}
        />
      </View>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Choose Your Hero</Text>
          <View style={styles.placeholder} />
        </View>

        <ListSkeleton count={3} type="hero" />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Choose Your Hero</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Error Display */}
      {error && (
        <ErrorMessage 
          error={error} 
          onDismiss={() => setError(null)} 
        />
      )}

      {/* Heroes List */}
      {acceptances.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyStateText}>No Heroes Yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Heroes who accept your request will appear here
          </Text>
        </View>
      ) : (
        <View style={styles.herosList}>
          <Text style={styles.subtitle}>
            {acceptances.length} hero{acceptances.length !== 1 ? 's' : ''} accepted your request
          </Text>
          {acceptances.map(renderHeroCard)}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  herosList: {
    padding: 16,
  },
  heroCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroImageContainer: {
    marginRight: 12,
  },
  heroImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  heroImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    color: '#000',
    marginLeft: 4,
    fontWeight: '500',
  },
  jobsCount: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4,
  },
  hourlyRate: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  skillsContainer: {
    marginBottom: 16,
  },
  skillsTitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  skillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  skillBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  skillText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  moreSkills: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  acceptanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  acceptanceTime: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4,
  },
  chooseButton: {
    backgroundColor: '#34C759',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
});