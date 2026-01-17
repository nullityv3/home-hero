import { CachedImage } from '@/components/ui/cached-image';
import { ListSkeleton } from '@/components/ui/loading-skeleton';
import { database } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  sortBy: 'default' | 'rating' | 'price';
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

// Mock heroes data
const mockHeroes: Hero[] = [
  {
    id: '1',
    fullName: 'John Smith',
    rating: 4.8,
    completedJobs: 127,
    hourlyRate: 25,
    skills: ['Plumbing', 'Electrical', 'General Repairs'],
    availability: 'Available today',
  },
  {
    id: '2',
    fullName: 'Sarah Johnson',
    rating: 4.9,
    completedJobs: 89,
    hourlyRate: 30,
    skills: ['Cleaning', 'Organization', 'Deep Cleaning'],
    availability: 'Available tomorrow',
  },
  {
    id: '3',
    fullName: 'Mike Wilson',
    rating: 4.7,
    completedJobs: 156,
    hourlyRate: 35,
    skills: ['Carpentry', 'Furniture Assembly', 'Home Repairs'],
    availability: 'Available today',
  },
];

export default function CivilianHeroesScreen() {
  const { user, isAuthenticated } = useAuthStore();
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [filteredHeroes, setFilteredHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<HeroFilters>({
    searchQuery: '',
    minRating: 0,
    maxPrice: 1000,
    selectedSkills: [],
    sortBy: 'default',
  });

  // Authentication and role check
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }
    
    if (user?.user_type !== 'civilian') {
      router.replace('/'); // Redirect to appropriate home based on user type
      return;
    }
  }, [isAuthenticated, user]);

  // Load heroes data
  useEffect(() => {
    loadHeroes();
  }, []);

  // Apply filters and sorting with debouncing for search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      applyFiltersAndSort();
    }, filters.searchQuery ? 300 : 0); // Debounce search, immediate for other filters

    return () => clearTimeout(timeoutId);
  }, [heroes, filters]);

  const loadHeroes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: dbError } = await database.getAvailableHeroes();
      
      if (dbError) {
        throw new Error(dbError.message);
      }
      
      // Validate and transform data - ensure data is always an array
      const safeData = Array.isArray(data) ? data : [];
      const validatedHeroes = safeData.map(hero => ({
        id: hero.id || '',
        fullName: hero.full_name || 'Unknown Hero',
        rating: typeof hero.rating === 'number' ? hero.rating : 0,
        completedJobs: typeof hero.completed_jobs === 'number' ? hero.completed_jobs : 0,
        hourlyRate: typeof hero.hourly_rate === 'number' ? hero.hourly_rate : 0,
        skills: Array.isArray(hero.skills) ? hero.skills : [],
        profileImageUrl: hero.profile_image_url || undefined,
        availability: hero.availability || 'Availability unknown',
      }));
      
      setHeroes(validatedHeroes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load heroes';
      setError(errorMessage);
      console.error('Error loading heroes:', err);
      
      // Fallback to mock data for development
      setHeroes(mockHeroes);
    } finally {
      setLoading(false);
    }
  };

  const handleHeroPress = (heroId: string) => {
    if (!heroId || typeof heroId !== 'string') {
      Alert.alert('Error', 'Invalid hero selection');
      return;
    }
    
    // Verify hero exists in current data - ensure heroes is an array
    const safeHeroes = Array.isArray(heroes) ? heroes : [];
    const heroExists = safeHeroes.some(hero => hero.id === heroId);
    if (!heroExists) {
      Alert.alert('Error', 'Hero not found. Please refresh and try again.');
      return;
    }
    
    try {
      // Add loading feedback for navigation
      const selectedHero = safeHeroes.find(hero => hero.id === heroId);
      console.log('Navigating to hero details:', {
        heroId,
        heroName: selectedHero?.fullName,
        timestamp: new Date().toISOString()
      });
      
      router.push(`/hero-details?heroId=${encodeURIComponent(heroId)}`);
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to navigate to hero details');
    }
  };  

  const handleRetry = () => {
    loadHeroes();
  };

  const applyFiltersAndSort = () => {
    // Ensure heroes is always an array
    const safeHeroes = Array.isArray(heroes) ? heroes : [];
    let result = [...safeHeroes];

    // Apply search query filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(hero =>
        hero.fullName.toLowerCase().includes(query) ||
        (Array.isArray(hero.skills) ? hero.skills : []).some(skill => skill.toLowerCase().includes(query))
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

    // Apply sorting
    switch (filters.sortBy) {
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

    setFilteredHeroes(result);
  };

  const handleSearchChange = useCallback((text: string) => {
    setFilters(prev => ({ ...prev, searchQuery: text }));
  }, []);

  const handleSortChange = (sortBy: 'default' | 'rating' | 'price') => {
    setFilters(prev => ({ ...prev, sortBy }));
  };

  const toggleSkillFilter = (skill: string) => {
    setFilters(prev => ({
      ...prev,
      selectedSkills: prev.selectedSkills.includes(skill)
        ? prev.selectedSkills.filter(s => s !== skill)
        : [...prev.selectedSkills, skill],
    }));
  };

  const clearFilters = () => {
    setFilters({
      searchQuery: '',
      minRating: 0,
      maxPrice: 1000,
      selectedSkills: [],
      sortBy: 'default',
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.searchQuery.trim() !== '' ||
      filters.minRating > 0 ||
      filters.maxPrice < 1000 ||
      filters.selectedSkills.length > 0 ||
      filters.sortBy !== 'default'
    );
  };

  const renderRatingStars = useCallback((rating: number) => {
    // Validate rating input
    const validRating = Math.max(0, Math.min(5, rating || 0));
    const stars = [];
    const fullStars = Math.floor(validRating);
    const hasHalfStar = validRating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={14} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color="#FFD700" />
      );
    }

    const emptyStars = 5 - Math.ceil(validRating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#E5E5EA" />
      );
    }

    return stars;
  }, []);

  const renderHeroCard = useCallback(({ item }: { item: Hero }) => (
    <TouchableOpacity 
      style={styles.heroCard} 
      onPress={() => handleHeroPress(item.id)}
      accessibilityRole="button"
      accessibilityLabel={`Select ${item.fullName}, rated ${item.rating} stars, ${item.hourlyRate} dollars per hour`}
      accessibilityHint="Tap to view hero details and book service"
    >
      <View style={styles.heroHeader}>
        <View style={styles.profileImageContainer}>
          <CachedImage
            uri={item.profileImageUrl}
            style={styles.profileImage}
            placeholderIcon="person"
            placeholderSize={24}
          />
        </View>
        
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{item.fullName}</Text>
          
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              {renderRatingStars(item.rating)}
            </View>
            <Text style={styles.ratingText}>
              {item.rating} ({item.completedJobs} jobs)
            </Text>
          </View>
          
          <Text style={styles.hourlyRate}>${item.hourlyRate}/hour</Text>
          <Text style={styles.availability}>{item.availability}</Text>
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      </View>
      
      <View style={styles.skillsContainer}>
        {(Array.isArray(item.skills) ? item.skills : []).slice(0, 3).map((skill, index) => (
          <View key={index} style={styles.skillTag}>
            <Text style={styles.skillText}>{skill}</Text>
          </View>
        ))}
        {(Array.isArray(item.skills) ? item.skills : []).length > 3 && (
          <Text style={styles.moreSkills}>+{(Array.isArray(item.skills) ? item.skills : []).length - 3} more</Text>
        )}
      </View>
    </TouchableOpacity>
  ), [handleHeroPress, renderRatingStars]);

  // Loading state with skeleton
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Find Heroes</Text>
          <Text style={styles.subtitle}>Loading service providers...</Text>
        </View>
        <ListSkeleton count={5} type="hero" />
      </SafeAreaView>
    );
  }

  // Error state
  if (error && heroes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Find Heroes</Text>
          <Text style={styles.subtitle}>Unable to load service providers</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Heroes</Text>
        <Text style={styles.subtitle}>
          {filteredHeroes.length > 0 
            ? `${filteredHeroes.length} service provider${filteredHeroes.length !== 1 ? 's' : ''} found`
            : heroes.length > 0
            ? 'No heroes match your filters'
            : 'Browse and select service providers'
          }
        </Text>
        {error && (
          <Text style={styles.warningText}>
            ⚠️ Using cached data. Some information may be outdated.
          </Text>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or skill..."
            value={filters.searchQuery}
            onChangeText={handleSearchChange}
            placeholderTextColor="#8E8E93"
          />
          {filters.searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, hasActiveFilters() && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options" size={20} color={hasActiveFilters() ? '#fff' : '#007AFF'} />
        </TouchableOpacity>
      </View>

      {/* Sort Options */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.sortContainer}
        contentContainerStyle={styles.sortContent}
      >
        <TouchableOpacity
          style={[styles.sortChip, filters.sortBy === 'default' && styles.sortChipActive]}
          onPress={() => handleSortChange('default')}
        >
          <Text style={[styles.sortChipText, filters.sortBy === 'default' && styles.sortChipTextActive]}>
            Default
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortChip, filters.sortBy === 'rating' && styles.sortChipActive]}
          onPress={() => handleSortChange('rating')}
        >
          <Ionicons name="star" size={14} color={filters.sortBy === 'rating' ? '#fff' : '#007AFF'} />
          <Text style={[styles.sortChipText, filters.sortBy === 'rating' && styles.sortChipTextActive]}>
            Rating
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortChip, filters.sortBy === 'price' && styles.sortChipActive]}
          onPress={() => handleSortChange('price')}
        >
          <Ionicons name="cash" size={14} color={filters.sortBy === 'price' ? '#fff' : '#007AFF'} />
          <Text style={[styles.sortChipText, filters.sortBy === 'price' && styles.sortChipTextActive]}>
            Price
          </Text>
        </TouchableOpacity>
        {hasActiveFilters() && (
          <TouchableOpacity
            style={styles.clearFiltersChip}
            onPress={clearFilters}
          >
            <Ionicons name="close" size={14} color="#FF3B30" />
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Heroes List */}
      {filteredHeroes.length === 0 && heroes.length > 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color="#C7C7CC" />
          <Text style={styles.emptyStateTitle}>No heroes found</Text>
          <Text style={styles.emptyStateMessage}>
            Try adjusting your filters or search terms
          </Text>
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredHeroes}
          renderItem={renderHeroCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={loadHeroes}
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.modalClear}>Clear</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Rating Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
              <View style={styles.ratingOptions}>
                {[0, 3, 4, 4.5].map(rating => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingOption,
                      filters.minRating === rating && styles.ratingOptionActive
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, minRating: rating }))}
                  >
                    <Text style={[
                      styles.ratingOptionText,
                      filters.minRating === rating && styles.ratingOptionTextActive
                    ]}>
                      {rating === 0 ? 'Any' : `${rating}+ ⭐`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                Max Price: ${filters.maxPrice === 1000 ? 'Any' : `${filters.maxPrice}/hr`}
              </Text>
              <View style={styles.priceOptions}>
                {[1000, 50, 40, 30, 20].map(price => (
                  <TouchableOpacity
                    key={price}
                    style={[
                      styles.priceOption,
                      filters.maxPrice === price && styles.priceOptionActive
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, maxPrice: price }))}
                  >
                    <Text style={[
                      styles.priceOptionText,
                      filters.maxPrice === price && styles.priceOptionTextActive
                    ]}>
                      {price === 1000 ? 'Any' : `$${price}/hr`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Skills Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Skills</Text>
              <View style={styles.skillsOptions}>
                {AVAILABLE_SKILLS.map(skill => (
                  <TouchableOpacity
                    key={skill}
                    style={[
                      styles.skillOption,
                      filters.selectedSkills.includes(skill) && styles.skillOptionActive
                    ]}
                    onPress={() => toggleSkillFilter(skill)}
                  >
                    <Text style={[
                      styles.skillOptionText,
                      filters.selectedSkills.includes(skill) && styles.skillOptionTextActive
                    ]}>
                      {skill}
                    </Text>
                    {filters.selectedSkills.includes(skill) && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>
                Apply Filters ({filteredHeroes.length} results)
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImageContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profileImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  hourlyRate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  availability: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillTag: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  moreSkills: {
    fontSize: 12,
    color: '#8E8E93',
    alignSelf: 'center',
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
  warningText: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  sortContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sortContent: {
    gap: 8,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    gap: 4,
  },
  sortChipActive: {
    backgroundColor: '#007AFF',
  },
  sortChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  sortChipTextActive: {
    color: '#fff',
  },
  clearFiltersChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
    gap: 4,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF3B30',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  clearFiltersButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearFiltersButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalCancel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalClear: {
    fontSize: 16,
    color: '#FF3B30',
  },
  modalContent: {
    flex: 1,
  },
  filterSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  ratingOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  ratingOptionActive: {
    backgroundColor: '#007AFF',
  },
  ratingOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  ratingOptionTextActive: {
    color: '#fff',
  },
  priceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  priceOptionActive: {
    backgroundColor: '#007AFF',
  },
  priceOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  priceOptionTextActive: {
    color: '#fff',
  },
  skillsOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    gap: 4,
  },
  skillOptionActive: {
    backgroundColor: '#007AFF',
  },
  skillOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  skillOptionTextActive: {
    color: '#fff',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  applyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});