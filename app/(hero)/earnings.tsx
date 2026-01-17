import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../../stores/auth';
import { useUserStore } from '../../stores/user';

export default function HeroEarningsScreen() {
  const { user, isAuthenticated } = useAuthStore();
  const { heroProfile } = useUserStore();
  const { 
    wallet,
    transactions,
    withdrawalRequests,
    isLoading, 
    error,
    loadWallet,
    loadTransactions,
    loadWithdrawalRequests,
    requestWithdrawal,
    canWithdraw,
    canAcceptJobs,
    updateBankDetails,
    refreshWallet
  } = useWalletStore();

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showBankDetailsModal, setShowBankDetailsModal] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bank_name: 'Bank Windhoek',
    bank_account_number: '',
    bank_account_holder: ''
  });
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'earnings' | 'fees' | 'payouts'>('all');
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Security: Enforce authentication and role-based access control
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace('/(auth)/signup');
      return;
    }
  }, [isAuthenticated, user]);

  // Load wallet data
  useEffect(() => {
    if (user?.id) {
      loadWallet(user.id);
    }
  }, [user?.id, loadWallet]);

  // Load transactions when wallet is loaded
  useEffect(() => {
    if (wallet?.id) {
      loadTransactions(wallet.id, { type: transactionFilter });
      loadWithdrawalRequests(wallet.id);
    }
  }, [wallet?.id, transactionFilter]);

  // Initialize bank details from wallet
  useEffect(() => {
    if (wallet) {
      setBankDetails({
        bank_name: wallet.bank_name || 'Bank Windhoek',
        bank_account_number: wallet.bank_account_number || '',
        bank_account_holder: wallet.bank_account_holder || ''
      });
    }
  }, [wallet]);

  const handleTimeframeChange = (timeframe: EarningsTimeframe) => {
    setActiveTab(timeframe);
    setTimeframe(timeframe);
  };

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
  };

  const handleClearDates = () => {
    setStartDate(null);
    setEndDate(null);
    setShowDatePicker(false);
  };

  const handleGoalUpdate = (newGoal: number) => {
    setMonthlyGoal(newGoal);
  };

  const handleRefresh = async () => {
    if (user?.id) {
      await refreshEarnings(user.id);
    }
  };

  const getCurrentMonthEarnings = () => {
    if (!earningsData?.dailyEarnings) return 0;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return earningsData.dailyEarnings
      .filter((day: EarningsPeriod) => {
        const date = new Date(day.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum: number, day: EarningsPeriod) => sum + day.amount, 0);
  };

  const handleExportData = async () => {
    if (!earningsData) return;
    
    const exportText = `Earnings Report
Generated: ${new Date().toLocaleDateString()}
Period: ${startDate?.toLocaleDateString() || 'All time'} - ${endDate?.toLocaleDateString() || 'Present'}

Summary:
- Total Earnings: $${earningsData.totalEarnings.toFixed(2)}
- Completed Jobs: ${earningsData.completedJobs}
- Average per Job: $${earningsData.completedJobs > 0 ? (earningsData.totalEarnings / earningsData.completedJobs).toFixed(2) : '0.00'}

Daily Breakdown:
${(earningsData.dailyEarnings || []).map((day: EarningsPeriod) => 
  `${day.date}: $${day.amount.toFixed(2)} (${day.jobCount || 0} jobs)`
).join('\n')}`;

    try {
      await Share.share({
        message: exportText,
        title: 'Earnings Report',
      });
    } catch (error) {
      Alert.alert('Export Failed', 'Unable to export earnings data');
    }
  };

  const getChartData = () => {
    if (!earningsData) return [];
    
    switch (activeTab) {
      case 'daily':
        return earningsData.dailyEarnings || [];
      case 'weekly':
        return earningsData.weeklyEarnings || [];
      case 'monthly':
        return earningsData.monthlyEarnings || [];
      default:
        return earningsData.dailyEarnings || [];
    }
  };

  if (isLoading && !earningsData) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading earnings data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => user?.id && loadEarnings(user.id)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Earnings Dashboard</Text>
          <Text style={styles.subtitle}>Track your income and performance</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={isLoading}
          >
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={handleExportData}
            disabled={!earningsData}
          >
            <Text style={styles.exportButtonText}>📊 Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Monthly Goal Card */}
      {earningsData && (
        <EarningsGoalCard
          currentEarnings={getCurrentMonthEarnings()}
          monthlyGoal={monthlyGoal}
          onGoalUpdate={handleGoalUpdate}
        />
      )}

      {/* Date Range Filter */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Text style={styles.sectionTitle}>Filter by Date Range</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(!showDatePicker)}>
            <Text style={styles.toggleText}>
              {showDatePicker ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        </View>
        {showDatePicker && (
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            onClear={handleClearDates}
          />
        )}
        {(startDate || endDate) && !showDatePicker && (
          <View style={styles.activeDateRange}>
            <Text style={styles.activeDateText}>
              {startDate ? startDate.toLocaleDateString() : 'Start'} - {endDate ? endDate.toLocaleDateString() : 'End'}
            </Text>
            <TouchableOpacity onPress={handleClearDates}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <View style={styles.statsColumn}>
            <StatsCard
              title="Total Earnings"
              value={`$${earningsData?.totalEarnings.toFixed(2) || '0.00'}`}
              icon="💰"
            />
          </View>
          <View style={styles.statsColumn}>
            <StatsCard
              title="Completed Jobs"
              value={earningsData?.completedJobs || 0}
              icon="✅"
            />
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statsColumn}>
            <StatsCard
              title="Average Rating"
              value={heroProfile?.rating?.toFixed(1) || '0.0'}
              subtitle={`${earningsData?.completedJobs || 0} reviews`}
              icon="⭐"
            />
          </View>
          <View style={styles.statsColumn}>
            <StatsCard
              title="This Month"
              value={`$${getCurrentMonthEarnings().toFixed(2)}`}
              subtitle="Current month"
              icon="📅"
            />
          </View>
        </View>
      </View>

      {/* Performance Insights */}
      {earningsData && earningsData.completedJobs > 0 && (
        <EarningsInsights earningsData={earningsData} />
      )}

      {/* Timeframe Selector */}
      <View style={styles.timeframeContainer}>
        <Text style={styles.sectionTitle}>Earnings Over Time</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'daily' && styles.activeTab]}
            onPress={() => handleTimeframeChange('daily')}
          >
            <Text style={[styles.tabText, activeTab === 'daily' && styles.activeTabText]}>
              Daily
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'weekly' && styles.activeTab]}
            onPress={() => handleTimeframeChange('weekly')}
          >
            <Text style={[styles.tabText, activeTab === 'weekly' && styles.activeTabText]}>
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'monthly' && styles.activeTab]}
            onPress={() => handleTimeframeChange('monthly')}
          >
            <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>
              Monthly
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Enhanced Earnings Chart */}
      <EarningsChart data={getChartData()} height={280} />

      {/* Earnings Trend Analysis */}
      {earningsData && getChartData().length > 1 && (
        <EarningsTrend 
          data={getChartData()} 
          title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Trend Analysis`}
        />
      )}

      {/* Performance Summary */}
      {earningsData && earningsData.completedJobs > 0 && (
        <View style={styles.summaryContainer}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Average per Job</Text>
              <Text style={styles.summaryValue}>
                ${(earningsData.totalEarnings / earningsData.completedJobs).toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Best Day</Text>
              <Text style={styles.summaryValue}>
                ${Math.max(...(earningsData.dailyEarnings || []).map((d: EarningsPeriod) => d.amount)).toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Success Rate</Text>
              <Text style={styles.summaryValue}>100%</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Goal Progress</Text>
              <Text style={[
                styles.summaryValue,
                { color: getCurrentMonthEarnings() >= monthlyGoal ? '#34C759' : '#FF9500' }
              ]}>
                {((getCurrentMonthEarnings() / monthlyGoal) * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  refreshButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  refreshButtonText: {
    fontSize: 16,
  },
  exportButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
    marginBottom: 8,
  },
  statsColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  timeframeContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  summaryContainer: {
    marginTop: 24,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  filterSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  activeDateRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  activeDateText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  clearText: {
    fontSize: 14,
    color: '#ff3b30',
    fontWeight: '600',
  },
});