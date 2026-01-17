import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../../stores/auth';
import { useUserStore } from '../../stores/user';
import { useWalletStore } from '../../stores/wallet';
import { logger } from '../../utils/logger';

const MIN_WITHDRAWAL = 50; // N$50 minimum
const MAX_WITHDRAWAL = 100000; // N$100,000 maximum

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

  // ✅ Security: Enforce authentication AND role verification
  useEffect(() => {
    if (!isAuthenticated || !user) {
      logger.warn('Unauthorized access attempt to earnings page');
      router.replace('/(auth)/login');
      return;
    }
    
    // ✅ Role verification: Only heroes can access earnings
    if (user.user_type !== 'hero') {
      logger.warn('Non-hero user attempted to access earnings page', { userId: user.id, userType: user.user_type });
      router.replace('/(civilian)/home');
      return;
    }
  }, [isAuthenticated, user]);

  // ✅ Load wallet data with proper dependencies
  useEffect(() => {
    if (user?.id) {
      loadWallet(user.id);
    }
  }, [user?.id, loadWallet]);

  // ✅ Load transactions when wallet is loaded with proper dependencies
  useEffect(() => {
    if (wallet?.id) {
      loadTransactions(wallet.id, { type: transactionFilter });
      loadWithdrawalRequests(wallet.id);
    }
  }, [wallet?.id, transactionFilter, loadTransactions, loadWithdrawalRequests]);

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

  // ✅ Memoized helper functions
  const formatCurrency = useCallback((amount: number) => {
    return `N$ ${amount.toFixed(2)}`;
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-NA', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getTransactionIcon = useCallback((type: string) => {
    switch (type) {
      case 'cash_job_fee': return '💵';
      case 'in_app_payment': return '💳';
      case 'withdrawal': return '🏦';
      case 'fee_top_up': return '➕';
      case 'refund': return '↩️';
      case 'adjustment': return '⚙️';
      default: return '📝';
    }
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed': return '#34C759';
      case 'pending': return '#FF9500';
      case 'failed': return '#FF3B30';
      case 'cancelled': return '#8E8E93';
      default: return '#8E8E93';
    }
  }, []);

  // ✅ Security: Mask bank account numbers
  const maskAccountNumber = useCallback((accountNumber: string | null) => {
    if (!accountNumber || accountNumber.length < 4) return '****';
    return '****' + accountNumber.slice(-4);
  }, []);

  // ✅ Enhanced withdrawal handler with validation
  const handleWithdraw = useCallback(async () => {
    if (!wallet) return;
    
    const amount = parseFloat(withdrawAmount);
    
    // Validation
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    
    if (amount < MIN_WITHDRAWAL) {
      Alert.alert('Amount Too Low', `Minimum withdrawal is ${formatCurrency(MIN_WITHDRAWAL)}`);
      return;
    }
    
    if (amount > MAX_WITHDRAWAL) {
      Alert.alert('Amount Too High', 'Please contact support for large withdrawals over N$100,000');
      return;
    }
    
    if (amount > wallet.earnings_balance) {
      Alert.alert('Insufficient Balance', 'You cannot withdraw more than your available earnings');
      return;
    }
    
    logger.info('Withdrawal requested', { amount, walletId: wallet.id });
    
    const result = await requestWithdrawal(wallet.id, amount);
    
    if (result.success) {
      logger.info('Withdrawal successful', { amount, walletId: wallet.id });
      Alert.alert('Withdrawal Requested', 'Your withdrawal request has been submitted. Funds will be transferred to your bank account within 1-3 business days.');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
    } else {
      logger.error('Withdrawal failed', { amount, walletId: wallet.id, error: result.error });
      Alert.alert('Withdrawal Failed', result.error || 'Unable to process withdrawal');
    }
  }, [wallet, withdrawAmount, formatCurrency, requestWithdrawal]);

  const handleSaveBankDetails = useCallback(async () => {
    if (!wallet) return;
    
    if (!bankDetails.bank_account_number || !bankDetails.bank_account_holder) {
      Alert.alert('Missing Information', 'Please fill in all bank account details');
      return;
    }
    
    // ✅ Validate account number format (basic check)
    if (bankDetails.bank_account_number.length < 8) {
      Alert.alert('Invalid Account Number', 'Please enter a valid bank account number');
      return;
    }
    
    logger.info('Updating bank details', { walletId: wallet.id });
    
    await updateBankDetails(wallet.id, bankDetails);
    setShowBankDetailsModal(false);
    Alert.alert('Success', 'Bank details updated successfully');
  }, [wallet, bankDetails, updateBankDetails]);

  const handleRefresh = useCallback(async () => {
    if (user?.id) {
      await refreshWallet(user.id);
    }
  }, [user?.id, refreshWallet]);

  // ✅ Memoize withdrawal eligibility
  const withdrawalEligibility = useMemo(() => canWithdraw(), [canWithdraw]);

  if (isLoading && !wallet) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  if (error && !wallet) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 1️⃣ Page Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Earnings</Text>
          <Text style={styles.subtitle}>Track your earnings, fees, and payouts</Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={isLoading}
        >
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {!wallet ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💼</Text>
          <Text style={styles.emptyTitle}>Wallet Not Found</Text>
          <Text style={styles.emptyText}>Your wallet will be created automatically when you complete your hero profile.</Text>
        </View>
      ) : (
        <>
          {/* 2️⃣ Earnings Wallet Card (Primary Focus) */}
          <View style={styles.earningsCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Available Earnings</Text>
              <Text style={styles.cardIcon}>💰</Text>
            </View>
            <Text style={styles.earningsAmount}>{formatCurrency(wallet.earnings_balance)}</Text>
            <Text style={styles.helperText}>Money earned from in-app payments</Text>
            
            <View style={styles.cardActions}>
              <TouchableOpacity 
                style={[
                  styles.primaryButton,
                  !withdrawalEligibility.allowed && styles.disabledButton
                ]}
                onPress={() => setShowWithdrawModal(true)}
                disabled={!withdrawalEligibility.allowed}
              >
                <Text style={styles.primaryButtonText}>Withdraw</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => setShowHowItWorks(true)}
              >
                <Text style={styles.secondaryButtonText}>How it works</Text>
              </TouchableOpacity>
            </View>
            
            {!withdrawalEligibility.allowed && (
              <Text style={styles.warningText}>
                {withdrawalEligibility.reason}
              </Text>
            )}
          </View>

          {/* 3️⃣ Fee Balance Card (Secondary) */}
          <View style={styles.feeCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Fee Balance</Text>
              <Text style={styles.cardIcon}>🔧</Text>
            </View>
            <Text style={styles.feeAmount}>{formatCurrency(wallet.fee_balance)}</Text>
            <Text style={styles.helperText}>Used for cash job service fees</Text>
            
            {!canAcceptJobs() && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  Your fee balance is low. Top up to keep accepting jobs.
                </Text>
              </View>
            )}
          </View>

          {/* 4️⃣ Bank Details Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bank Details</Text>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setShowBankDetailsModal(true)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.bankDetailsCard}>
              <Text style={styles.bankDetailLabel}>Bank</Text>
              <Text style={styles.bankDetailValue}>{bankDetails.bank_name}</Text>
              
              <Text style={styles.bankDetailLabel}>Account Number</Text>
              <Text style={styles.bankDetailValue}>{maskAccountNumber(bankDetails.bank_account_number)}</Text>
              
              <Text style={styles.bankDetailLabel}>Account Holder</Text>
              <Text style={styles.bankDetailValue}>{bankDetails.bank_account_holder || 'Not set'}</Text>
            </View>
          </View>

          {/* 5️⃣ Transaction History */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
            </View>
            
            {/* Filter Tabs */}
            <View style={styles.filterTabs}>
              {(['all', 'earnings', 'fees', 'payouts'] as const).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterTab,
                    transactionFilter === filter && styles.activeFilterTab
                  ]}
                  onPress={() => setTransactionFilter(filter)}
                >
                  <Text style={[
                    styles.filterTabText,
                    transactionFilter === filter && styles.activeFilterTabText
                  ]}>
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyTitle}>No Transactions</Text>
                <Text style={styles.emptyText}>Your transaction history will appear here</Text>
              </View>
            ) : (
              <FlatList
                data={transactions}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={styles.transactionItem}>
                    <Text style={styles.transactionIcon}>{getTransactionIcon(item.type)}</Text>
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionDescription}>{item.description}</Text>
                      <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
                    </View>
                    <View style={styles.transactionAmount}>
                      <Text style={[
                        styles.amountText,
                        item.type === 'withdrawal' || item.type === 'fee_top_up' ? styles.negativeAmount : styles.positiveAmount
                      ]}>
                        {item.type === 'withdrawal' || item.type === 'fee_top_up' ? '-' : '+'}{formatCurrency(item.amount)}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                      </View>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </>
      )}

      {/* Withdrawal Modal */}
      <Modal visible={showWithdrawModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Withdrawal</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />
            <Text style={styles.modalHelper}>Minimum: {formatCurrency(MIN_WITHDRAWAL)}</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowWithdrawModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleWithdraw}>
                <Text style={styles.modalConfirmText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bank Details Modal */}
      <Modal visible={showBankDetailsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Bank Details</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Account Number"
              value={bankDetails.bank_account_number}
              onChangeText={(text) => setBankDetails(prev => ({ ...prev, bank_account_number: text }))}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Account Holder"
              value={bankDetails.bank_account_holder}
              onChangeText={(text) => setBankDetails(prev => ({ ...prev, bank_account_holder: text }))}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowBankDetailsModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleSaveBankDetails}>
                <Text style={styles.modalConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 4,
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 20,
  },
  earningsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feeCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  cardIcon: {
    fontSize: 24,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 4,
  },
  feeAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF9500',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#C7C7CC',
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  warningText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 8,
  },
  warningContainer: {
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  editButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bankDetailsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  bankDetailLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  bankDetailValue: {
    fontSize: 16,
    color: '#000',
    marginBottom: 12,
  },
  filterTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeFilterTab: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  activeFilterTabText: {
    color: '#FFF',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  transactionDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '600',
  },
  positiveAmount: {
    color: '#34C759',
  },
  negativeAmount: {
    color: '#FF3B30',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  modalHelper: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  modalCancelText: {
    color: '#8E8E93',
    fontWeight: '600',
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  modalConfirmText: {
    color: '#FFF',
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
});
