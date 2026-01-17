import { ServiceRequest } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RequestCardProps {
  request: ServiceRequest;
  onPress?: () => void;
  showChooseHero?: boolean;
  acceptanceCount?: number;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: '#FF9500',
    icon: 'time-outline' as const,
  },
  assigned: {
    label: 'Assigned',
    color: '#007AFF',
    icon: 'person-outline' as const,
  },
  active: {
    label: 'Active',
    color: '#34C759',
    icon: 'checkmark-circle-outline' as const,
  },
  completed: {
    label: 'Completed',
    color: '#8E8E93',
    icon: 'checkmark-done-outline' as const,
  },
  cancelled: {
    label: 'Cancelled',
    color: '#FF3B30',
    icon: 'close-circle-outline' as const,
  },
};

export function RequestCard({ request, onPress, showChooseHero = false, acceptanceCount = 0 }: RequestCardProps) {
  const statusConfig = STATUS_CONFIG[request.status];
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Service request: ${request.title}`}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {request.title}
          </Text>
          <Text style={styles.category}>{request.category}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
          <Ionicons name={statusConfig.icon} size={14} color="#fff" />
          <Text style={styles.statusText}>{statusConfig.label}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {request.description}
      </Text>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>{formatDate(request.scheduled_date)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>{request.estimated_duration} hour(s)</Text>
        </View>
      </View>

      {request.hero_id && (
        <View style={styles.heroInfo}>
          <Ionicons name="person-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.heroText}>Hero assigned</Text>
        </View>
      )}

      {showChooseHero && acceptanceCount > 0 && (
        <TouchableOpacity
          style={styles.chooseHeroButton}
          onPress={(e) => {
            e.stopPropagation();
            router.push({
              pathname: '/(civilian)/choose-hero-acceptances',
              params: { requestId: request.id }
            });
          }}
        >
          <Ionicons name="people" size={16} color="#fff" />
          <Text style={styles.chooseHeroText}>
            Choose Hero ({acceptanceCount})
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.footer}>
        <Text style={styles.budgetText}>
          ${request.budget_range.min} - ${request.budget_range.max}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: '#8E8E93',
    textTransform: 'capitalize',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  description: {
    fontSize: 14,
    color: '#3C3C43',
    marginBottom: 12,
    lineHeight: 20,
  },
  details: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  heroInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  heroText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  budgetText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  chooseHeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  chooseHeroText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
