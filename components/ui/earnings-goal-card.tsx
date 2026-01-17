import { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface EarningsGoalCardProps {
  currentEarnings: number;
  monthlyGoal: number;
  onGoalUpdate: (newGoal: number) => void;
}

export function EarningsGoalCard({ currentEarnings, monthlyGoal, onGoalUpdate }: EarningsGoalCardProps) {
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState(monthlyGoal.toString());

  const progressPercentage = Math.min((currentEarnings / monthlyGoal) * 100, 100);
  const remainingAmount = Math.max(monthlyGoal - currentEarnings, 0);
  const isGoalReached = currentEarnings >= monthlyGoal;

  const handleUpdateGoal = () => {
    const goalValue = parseFloat(newGoal);
    if (isNaN(goalValue) || goalValue <= 0) {
      Alert.alert('Invalid Goal', 'Please enter a valid goal amount');
      return;
    }
    onGoalUpdate(goalValue);
    setShowGoalModal(false);
  };

  const getProgressColor = () => {
    if (progressPercentage >= 100) return '#34C759';
    if (progressPercentage >= 75) return '#FF9500';
    if (progressPercentage >= 50) return '#007AFF';
    return '#FF3B30';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Monthly Goal</Text>
          <Text style={styles.goalAmount}>${monthlyGoal.toLocaleString()}</Text>
        </View>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setShowGoalModal(true)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${progressPercentage}%`,
                backgroundColor: getProgressColor()
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {progressPercentage.toFixed(1)}% Complete
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Earned</Text>
          <Text style={[styles.statValue, { color: getProgressColor() }]}>
            ${currentEarnings.toLocaleString()}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Remaining</Text>
          <Text style={styles.statValue}>
            ${remainingAmount.toLocaleString()}
          </Text>
        </View>
      </View>

      {isGoalReached && (
        <View style={styles.congratsContainer}>
          <Text style={styles.congratsText}>🎉 Goal Achieved!</Text>
        </View>
      )}

      {/* Goal Setting Modal */}
      <Modal
        visible={showGoalModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Monthly Goal</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Goal Amount ($)</Text>
              <TextInput
                style={styles.input}
                value={newGoal}
                onChangeText={setNewGoal}
                keyboardType="numeric"
                placeholder="Enter goal amount"
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowGoalModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdateGoal}
              >
                <Text style={styles.saveButtonText}>Save Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  goalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  editButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  congratsContainer: {
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  congratsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -6,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
});