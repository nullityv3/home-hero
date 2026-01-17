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

  // âœ… Security: Enforce authentication AND role verification
  useEffect(() => {
    if (!isAuthenticated || !user) {
      logger.warn('Unauthorized access attempt to earnings page');
      router.replace('/(auth)/login');
      return;
    }
    
    // âœ… Role verification: Only heroes can access earnings
    if (user.user_type !== 'hero') {
      logger.warn('Non-hero user attempted to access earnings page', { userId: user.id, userType: user.user_type });
      router.replace('/(civilian)/home');
      return;
    }
  }, [isAuthenticated, user]);

  // âœ… Load wallet data with proper dependencies
  useEffect(() => {
    if (user?.id) {
      loadWallet(user.id);
    }
  }, [user?.id, loadWallet]);

  // âœ… Load transactions when wallet is loaded with proper dependencies
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

  // âœ… Memoized helper functions
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
      case 'cash_job_fee': return 'ðŸ’µ';
      case 'in_app_payment': return 'ðŸ’³';
      case 'withdrawal': return 'ðŸ¦';
      case 'fee_top_up': return 'âž•';
      case 'refund': return 'â†©ï¸';
      case 'adjustment': return 'âš™ï¸';
      default: return 'ðŸ“';
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

  // âœ… Security: Mask bank account numbers
  const maskAccountNumber = useCallback((accountNumber: string | null) => {
    if (!accountNumber || accountNumber.length < 4) return '****';
    return '****' + accountNumber.slice(-4);
  }, []);

  // âœ… Enhanced withdrawal handler with validation
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
    
    // âœ… Validate account number format (basic check)
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

  // âœ… Memoize withdrawal eligibility
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
      {/* 1ï¸âƒ£ Page Header */}
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
          <Text style={styles.refreshButtonText}>ðŸ”„</Text>
        </TouchableOpacity>
      </View>

      {!wallet ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>ðŸ’¼</Text>
          <Text style={styles.emptyTitle}>Wallet Not Found</Text>
          <Text style={styles.emptyText}>Your wallet will be created automatically when you complete your hero profile.</Text>
        </View>
      ) : (
        <>
          {/* 2ï¸âƒ£ Earnings Wallet Card (Primary Focus) */}
          <View style={styles.earningsCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Available Earnings</Text>
              <Text style={styles.cardIcon}>ðŸ’°</Text>
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
                <Text style={[
                  styles.primaryButtonText,
                  !withdrawalEligibility.allowed && styles.disabledButtonText
                ]}>
                  âœ… Withdraw
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => setShowHowItWorks(true)}
              >
                <Text style={styles.secondaryButtonText}>â„¹ï¸ How payouts work</Text>
              </TouchableOpacity>
            </View>
            
            {!withdrawalEligibility.allowed && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningIcon}>âš ï¸</Text>
                <Text style={styles.warningText}>{withdrawalEligibility.reason}</Text>
              </View>
            )}
          </View>

          {/* 3ï¸âƒ£ Fee Wallet Card (Secondary, but visible) */}
          <View style={[
            styles.feeCard,
            wallet.fee_balance < 0 && styles.feeCardNegative
          ]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Platform Fees</Text>
              <Text style={styles.cardIcon}>ðŸ“‹</Text>
            </View>
            <View style={styles.feeBalanceRow}>
              <Text style={[
                styles.feeAmount,
                wallet.fee_balance < 0 && styles.feeAmountNegative
              ]}>
                {formatCurrency(wallet.fee_balance)}
              </Text>
              {wallet.fee_balance < 0 && <Text style={styles.warningIcon}>âš ï¸</Text>}
            </View>
            <Text style={styles.helperText}>
              {wallet.fee_balance < 0 
                ? 'Fees owed from cash jobs' 
                : 'This is automatically settled from your work'}
            </Text>
            
            {wallet.fee_balance < wallet.fee_threshold && (
              <View style={styles.criticalBanner}>
                <Text style={styles.warningIcon}>ðŸ”’</Text>
                <Text style={styles.criticalText}>
                  Your fee balance is low. Top up to keep accepting jobs.
                </Text>
              </View>
            )}
            
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Top Up</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>View Breakdown</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4ï¸âƒ£ Quick Explanation Section */}
          <View style={styles.explanationCard}>
            <Text style={styles.explanationTitle}>How your money works</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletIcon}>ðŸ’µ</Text>
                <Text style={styles.bulletText}>
                  Cash jobs â†’ you get paid directly, fees are recorded here
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletIcon}>ðŸ’³</Text>
                <Text style={styles.bulletText}>
                  In-app jobs â†’ we pay you to your earnings balance
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletIcon}>ðŸ¦</Text>
                <Text style={styles.bulletText}>
                  Withdrawals go to your bank account (Bank Windhoek supported)
                </Text>
              </View>
            </View>
          </View>

          {/* 6ï¸âƒ£ Transactions List */}
          <View style={styles.transactionsSection}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            
            {/* Filters */}
            <View style={styles.filterTabs}>
              {(['all', 'earnings', 'fees', 'payouts'] as const).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterTab,
                    transactionFilter === filter && styles.filterTabActive
                  ]}
                  onPress={() => setTransactionFilter(filter)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${filter}`}
                  accessibilityState={{ selected: transactionFilter === filter }}
                >
                  <Text style={[
                    styles.filterTabText,
                    transactionFilter === filter && styles.filterTabTextActive
                  ]}>
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Transaction List */}
            {transactions.length === 0 ? (
              <View style={styles.emptyTransactions}>
                <Text style={styles.emptyIcon}>ðŸ“</Text>
                <Text style={styles.emptyTitle}>No transactions yet</Text>
                <Text style={styles.emptyText}>
                  Your transaction history will appear here once you start working
                </Text>
              </View>
            ) : (
              <FlatList
                data={transactions}
                keyExtractor={(item) => item.id}
                renderItem={({ item: transaction }) => (
                  <View style={styles.transactionItem}>
                    <View style={styles.transactionLeft}>
                      <Text style={styles.transactionIcon}>
                        {getTransactionIcon(transaction.type)}
                      </Text>
                      <View style={styles.transactionDetails}>
                        <Text style={styles.transactionDescription}>
                          {transaction.description}
                        </Text>
                        <Text style={styles.transactionDate}>
                          {formatDate(transaction.created_at)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={[
                        styles.transactionAmount,
                        transaction.wallet_type === 'earnings' 
                          ? styles.transactionAmountPositive 
                          : styles.transactionAmountNegative
                      ]}>
                        {transaction.wallet_type === 'earnings' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(transaction.status) + '20' }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: getStatusColor(transaction.status) }
                        ]}>
                          {transaction.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
                scrollEnabled={false}
              />
            )}
          </View>
        </>
      )}

      {/* Withdrawal Modal */}
      <Modal
        visible={showWithdrawModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Withdraw Earnings</Text>
            <TouchableOpacity 
              onPress={() => setShowWithdrawModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Close withdrawal modal"
            >
              <Text style={styles.closeButton}>âœ•</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>{formatCurrency(wallet?.earnings_balance || 0)}</Text>

            <Text style={styles.inputLabel}>Withdrawal Amount</Text>
            <TextInput
              style={styles.input}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              accessibilityLabel="Withdrawal amount input"
              accessibilityHint="Enter the amount you want to withdraw"
            />

            <Text style={styles.helperText}>
              Minimum: {formatCurrency(MIN_WITHDRAWAL)} â€¢ Maximum: {formatCurrency(MAX_WITHDRAWAL)}
            </Text>

            {wallet && (!wallet.bank_account_number || !wallet.bank_account_holder) && (
              <View style={styles.warningBox}>
                <Text style={styles.warningIcon}>âš ï¸</Text>
                <Text style={styles.warningText}>
                  Please add your bank details before withdrawing
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, styles.modalButton]}
              onPress={handleWithdraw}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Confirm withdrawal"
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? 'Processing...' : 'Confirm Withdrawal'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, styles.modalButton]}
              onPress={() => setShowBankDetailsModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Update bank details"
            >
              <Text style={styles.secondaryButtonText}>Update Bank Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bank Details Modal */}
      <Modal
        visible={showBankDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBankDetailsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bank Account Details</Text>
            <TouchableOpacity 
              onPress={() => setShowBankDetailsModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Close bank details modal"
            >
              <Text style={styles.closeButton}>âœ•</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Bank Name</Text>
            <TextInput
              style={styles.input}
              value={bankDetails.bank_name}
              onChangeText={(text) => setBankDetails({ ...bankDetails, bank_name: text })}
              placeholder="Bank Windhoek"
              accessibilityLabel="Bank name input"
            />

            <Text style={styles.inputLabel}>Account Number</Text>
            <TextInput
              style={styles.input}
              value={bankDetails.bank_account_number}
              onChangeText={(text) => setBankDetails({ ...bankDetails, bank_account_number: text })}
              keyboardType="number-pad"
              placeholder="Enter account number"
              accessibilityLabel="Account number input"
              secureTextEntry={false}
            />

            <Text style={styles.inputLabel}>Account Holder Name</Text>
            <TextInput
              style={styles.input}
              value={bankDetails.bank_account_holder}
              onChangeText={(text) => setBankDetails({ ...bankDetails, bank_account_holder: text })}
              placeholder="Full name as on account"
              accessibilityLabel="Account holder name input"
            />

            <TouchableOpacity
              style={[styles.primaryButton, styles.modalButton]}
              onPress={handleSaveBankDetails}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Save bank details"
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? 'Saving...' : 'Save Details'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* How It Works Modal */}
      <Modal
        visible={showHowItWorks}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHowItWorks(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>How Payouts Work</Text>
            <TouchableOpacity 
              onPress={() => setShowHowItWorks(false)}
              accessibilityRole="button"
              accessibilityLabel="Close how it works modal"
            >
              <Text style={styles.closeButton}>âœ•</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>ðŸ’° Earnings Wallet</Text>
              <Text style={styles.infoText}>
                Money from in-app payments goes directly to your earnings wallet. You can withdraw this anytime to your bank account.
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>ðŸ“‹ Platform Fees</Text>
              <Text style={styles.infoText}>
                For cash jobs, you receive payment directly from the client. We track the platform fee here, which is automatically settled from your future in-app earnings.
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>ðŸ¦ Withdrawals</Text>
              <Text style={styles.infoText}>
                â€¢ Minimum withdrawal: {formatCurrency(MIN_WITHDRAWAL)}{'\n'}
                â€¢ Processing time: 1-3 business days{'\n'}
                â€¢ Supported bank: Bank Windhoek{'\n'}
                â€¢ Identity verification required
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>ðŸ”’ Security</Text>
              <Text style={styles.infoText}>
                All transactions are encrypted and monitored. Your bank details are stored securely and never shared with third parties.
              </Text>
            </View>
          </ScrollView>
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
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
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
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
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
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
    marginTop: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  earningsCard: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  feeCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  feeCardNegative: {
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  cardIcon: {
    fontSize: 24,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 8,
  },
  feeBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feeAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000',
  },
  feeAmountNegative: {
    color: '#FF3B30',
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
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    opacity: 0.7,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningIcon: {
    fontSize: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
  },
  criticalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  criticalText: {
    flex: 1,
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  explanationCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  bulletList: {
    gap: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bulletIcon: {
    fontSize: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  transactionsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  emptyTransactions: {
    alignItems: 'center',
    padding: 32,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  transactionIcon: {
    fontSize: 24,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionAmountPositive: {
    color: '#34C759',
  },
  transactionAmountNegative: {
    color: '#FF3B30',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    fontSize: 24,
    color: '#8E8E93',
  },
  modalContent: {
    padding: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: '#000',
  },
  modalButton: {
    marginTop: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
});
