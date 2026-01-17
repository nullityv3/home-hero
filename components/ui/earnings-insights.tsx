import { StyleSheet, Text, View } from 'react-native';
import { EarningsData } from '../../types';

interface EarningsInsightsProps {
  earningsData: EarningsData;
  previousPeriodEarnings?: number;
}

export function EarningsInsights({ earningsData, previousPeriodEarnings = 0 }: EarningsInsightsProps) {
  const { totalEarnings, completedJobs, dailyEarnings } = earningsData;
  
  // Calculate insights
  const averagePerJob = completedJobs > 0 ? totalEarnings / completedJobs : 0;
  const growthPercentage = previousPeriodEarnings > 0 
    ? ((totalEarnings - previousPeriodEarnings) / previousPeriodEarnings) * 100 
    : 0;
  
  // Calculate daily average from recent data
  const recentDays = dailyEarnings.slice(-7); // Last 7 days
  const dailyAverage = recentDays.length > 0 
    ? recentDays.reduce((sum, day) => sum + day.amount, 0) / recentDays.length 
    : 0;
  
  // Calculate best performing day
  const bestDay = dailyEarnings.reduce((best: EarningsPeriod, current: EarningsPeriod) => 
    current.amount > best.amount ? current : best, 
    { date: '', amount: 0 }
  );

  // Generate recommendations
  const getRecommendations = () => {
    const recommendations = [];
    
    if (averagePerJob < 50) {
      recommendations.push({
        icon: '💡',
        title: 'Increase Job Value',
        description: 'Consider taking on higher-value jobs to boost your average earnings per job.'
      });
    }
    
    if (completedJobs < 10) {
      recommendations.push({
        icon: '🎯',
        title: 'Take More Jobs',
        description: 'Completing more jobs will increase your total earnings and improve your rating.'
      });
    }
    
    if (dailyAverage > 0 && dailyAverage < 30) {
      recommendations.push({
        icon: '📈',
        title: 'Boost Daily Activity',
        description: 'Try to complete at least one job per day to maintain steady income.'
      });
    }
    
    if (growthPercentage < 0) {
      recommendations.push({
        icon: '🔄',
        title: 'Focus on Growth',
        description: 'Your earnings have decreased. Consider improving your service quality or availability.'
      });
    }
    
    return recommendations;
  };

  const recommendations = getRecommendations();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Performance Insights</Text>
      
      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>💰</Text>
          <Text style={styles.metricValue}>${averagePerJob.toFixed(0)}</Text>
          <Text style={styles.metricLabel}>Avg per Job</Text>
        </View>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>📊</Text>
          <Text style={[
            styles.metricValue, 
            { color: growthPercentage >= 0 ? '#34C759' : '#FF3B30' }
          ]}>
            {growthPercentage >= 0 ? '+' : ''}{growthPercentage.toFixed(1)}%
          </Text>
          <Text style={styles.metricLabel}>Growth</Text>
        </View>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>⭐</Text>
          <Text style={styles.metricValue}>${dailyAverage.toFixed(0)}</Text>
          <Text style={styles.metricLabel}>Daily Avg</Text>
        </View>
      </View>

      {/* Best Performance */}
      {bestDay.amount > 0 && (
        <View style={styles.bestDayCard}>
          <Text style={styles.bestDayTitle}>🏆 Best Day</Text>
          <Text style={styles.bestDayAmount}>${bestDay.amount.toFixed(2)}</Text>
          <Text style={styles.bestDayDate}>
            {new Date(bestDay.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'short', 
              day: 'numeric' 
            })}
          </Text>
        </View>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <View style={styles.recommendationsSection}>
          <Text style={styles.recommendationsTitle}>Recommendations</Text>
          {recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationCard}>
              <Text style={styles.recommendationIcon}>{rec.icon}</Text>
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationTitle}>{rec.title}</Text>
                <Text style={styles.recommendationDescription}>{rec.description}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginHorizontal: -4,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  metricIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  bestDayCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  bestDayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 8,
  },
  bestDayAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 4,
  },
  bestDayDate: {
    fontSize: 14,
    color: '#BF360C',
  },
  recommendationsSection: {
    marginTop: 8,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  recommendationCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  recommendationIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});