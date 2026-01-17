import { StyleSheet, Text, View } from 'react-native';
import { EarningsPeriod } from '../../types';

interface EarningsTrendProps {
  data: EarningsPeriod[];
  title: string;
}

export function EarningsTrend({ data, title }: EarningsTrendProps) {
  if (!data || data.length < 2) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.noDataText}>Not enough data for trend analysis</Text>
      </View>
    );
  }

  // Calculate trend over the last few periods
  const recentPeriods = data.slice(-4); // Last 4 periods
  const firstPeriod = recentPeriods[0];
  const lastPeriod = recentPeriods[recentPeriods.length - 1];
  
  const trendPercentage = firstPeriod.amount > 0 
    ? ((lastPeriod.amount - firstPeriod.amount) / firstPeriod.amount) * 100 
    : 0;

  const isPositiveTrend = trendPercentage > 0;
  const isNeutralTrend = Math.abs(trendPercentage) < 5; // Less than 5% change

  const getTrendIcon = () => {
    if (isNeutralTrend) return '➡️';
    return isPositiveTrend ? '📈' : '📉';
  };

  const getTrendColor = () => {
    if (isNeutralTrend) return '#666';
    return isPositiveTrend ? '#34C759' : '#FF3B30';
  };

  const getTrendText = () => {
    if (isNeutralTrend) return 'Stable';
    const direction = isPositiveTrend ? 'up' : 'down';
    return `${direction} ${Math.abs(trendPercentage).toFixed(1)}%`;
  };

  // Calculate average for the period
  const average = recentPeriods.reduce((sum, period) => sum + period.amount, 0) / recentPeriods.length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.trendContainer}>
        <View style={styles.trendItem}>
          <Text style={styles.trendIcon}>{getTrendIcon()}</Text>
          <Text style={[styles.trendText, { color: getTrendColor() }]}>
            {getTrendText()}
          </Text>
        </View>
        
        <View style={styles.averageContainer}>
          <Text style={styles.averageLabel}>Avg</Text>
          <Text style={styles.averageValue}>${average.toFixed(0)}</Text>
        </View>
      </View>

      <View style={styles.periodComparison}>
        <View style={styles.comparisonItem}>
          <Text style={styles.comparisonLabel}>First</Text>
          <Text style={styles.comparisonValue}>${firstPeriod.amount.toFixed(0)}</Text>
        </View>
        <View style={styles.comparisonArrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>
        <View style={styles.comparisonItem}>
          <Text style={styles.comparisonLabel}>Latest</Text>
          <Text style={styles.comparisonValue}>${lastPeriod.amount.toFixed(0)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  trendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  trendText: {
    fontSize: 16,
    fontWeight: '600',
  },
  averageContainer: {
    alignItems: 'center',
  },
  averageLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  averageValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  periodComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  comparisonItem: {
    alignItems: 'center',
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  comparisonArrow: {
    marginHorizontal: 16,
  },
  arrowText: {
    fontSize: 18,
    color: '#666',
  },
});