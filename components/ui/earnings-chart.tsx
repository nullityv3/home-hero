import { useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { EarningsPeriod } from '../../types';

interface EarningsChartProps {
  data: EarningsPeriod[];
  height?: number;
}

export function EarningsChart({ data, height = 200 }: EarningsChartProps) {
  const [selectedBar, setSelectedBar] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>No earnings data available</Text>
          <Text style={styles.emptySubtext}>Complete jobs to see your earnings here</Text>
        </View>
      </View>
    );
  }

  const maxAmount = Math.max(...data.map(d => d.amount), 1);
  const chartWidth = Dimensions.get('window').width - 64;
  const barWidth = Math.max(chartWidth / data.length - 8, 20);
  
  // Calculate average for reference line
  const average = data.reduce((sum, d) => sum + d.amount, 0) / data.length;

  return (
    <View style={[styles.container, { height }]}>
      {/* Chart Header */}
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Earnings Trend</Text>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
            <Text style={styles.legendText}>Earnings</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
            <Text style={styles.legendText}>Average</Text>
          </View>
        </View>
      </View>

      <View style={styles.chart}>
        {/* Average line */}
        <View 
          style={[
            styles.averageLine, 
            { 
              bottom: 30 + (average / maxAmount) * (height - 90),
            }
          ]} 
        />
        
        {data.map((period, index) => {
          const barHeight = (period.amount / maxAmount) * (height - 90);
          const isSelected = selectedBar === index;
          const isAboveAverage = period.amount > average;
          
          return (
            <TouchableOpacity
              key={period.date}
              style={styles.barContainer}
              onPress={() => setSelectedBar(isSelected ? null : index)}
              activeOpacity={0.7}
            >
              <View style={styles.barWrapper}>
                {(isSelected || period.amount > 0) && (
                  <View style={styles.tooltipContainer}>
                    <Text style={styles.tooltipAmount}>
                      ${period.amount.toFixed(2)}
                    </Text>
                    {period.jobCount && (
                      <Text style={styles.tooltipJobs}>
                        {period.jobCount} job{period.jobCount !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                )}
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: Math.max(barHeight, 2),
                      width: barWidth,
                      backgroundColor: isSelected 
                        ? '#FF6B35' 
                        : isAboveAverage 
                          ? '#34C759' 
                          : '#007AFF',
                      opacity: isSelected ? 1 : 0.8,
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.dateText, isSelected && styles.selectedDateText]} numberOfLines={1}>
                {formatDate(period.date)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected bar details */}
      {selectedBar !== null && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsText}>
            Tap bars to see details • Selected: {formatDate(data[selectedBar].date)}
          </Text>
        </View>
      )}
    </View>
  );
}

function formatDate(dateStr: string): string {
  // Handle different date formats
  if (dateStr.length === 7) {
    // YYYY-MM format
    const [year, month] = dateStr.split('-');
    return `${month}/${year.slice(2)}`;
  } else {
    // YYYY-MM-DD format
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#333',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  legendContainer: {
    flexDirection: 'row',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '100%',
    paddingBottom: 40,
    position: 'relative',
  },
  averageLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#FF9500',
    opacity: 0.6,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    position: 'relative',
  },
  bar: {
    borderRadius: 6,
    minHeight: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tooltipContainer: {
    position: 'absolute',
    top: -50,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
    alignItems: 'center',
    zIndex: 10,
  },
  tooltipAmount: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  tooltipJobs: {
    fontSize: 10,
    color: '#ccc',
  },
  dateText: {
    fontSize: 10,
    color: '#666',
    marginTop: 8,
    position: 'absolute',
    bottom: -32,
    fontWeight: '500',
  },
  selectedDateText: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
