import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onClear?: () => void;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
}: DateRangePickerProps) {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date>(startDate || new Date());
  const [tempEndDate, setTempEndDate] = useState<Date>(endDate || new Date());

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }
    
    if (selectedDate) {
      setTempStartDate(selectedDate);
      if (Platform.OS === 'android') {
        onStartDateChange(selectedDate);
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }
    
    if (selectedDate) {
      setTempEndDate(selectedDate);
      if (Platform.OS === 'android') {
        onEndDateChange(selectedDate);
      }
    }
  };

  const confirmStartDate = () => {
    onStartDateChange(tempStartDate);
    setShowStartPicker(false);
  };

  const confirmEndDate = () => {
    onEndDateChange(tempEndDate);
    setShowEndPicker(false);
  };

  const handleClear = () => {
    onStartDateChange(null);
    onEndDateChange(null);
    onClear?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.dateRow}>
        <View style={styles.dateInputContainer}>
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={[styles.dateText, !startDate && styles.placeholderText]}>
              {formatDate(startDate)}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateInputContainer}>
          <Text style={styles.label}>End Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={[styles.dateText, !endDate && styles.placeholderText]}>
              {formatDate(endDate)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {(startDate || endDate) && (
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearButtonText}>Clear Dates</Text>
        </TouchableOpacity>
      )}

      {/* Start Date Picker */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showStartPicker}
          transparent
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                  <Text style={styles.cancelButton}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Start Date</Text>
                <TouchableOpacity onPress={confirmStartDate}>
                  <Text style={styles.doneButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempStartDate}
                mode="date"
                display="spinner"
                onChange={handleStartDateChange}
                maximumDate={endDate || new Date()}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showStartPicker && (
          <DateTimePicker
            value={tempStartDate}
            mode="date"
            display="default"
            onChange={handleStartDateChange}
            maximumDate={endDate || new Date()}
          />
        )
      )}

      {/* End Date Picker */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showEndPicker}
          transparent
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                  <Text style={styles.cancelButton}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select End Date</Text>
                <TouchableOpacity onPress={confirmEndDate}>
                  <Text style={styles.doneButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempEndDate}
                mode="date"
                display="spinner"
                onChange={handleEndDateChange}
                minimumDate={startDate || undefined}
                maximumDate={new Date()}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showEndPicker && (
          <DateTimePicker
            value={tempEndDate}
            mode="date"
            display="default"
            onChange={handleEndDateChange}
            minimumDate={startDate || undefined}
            maximumDate={new Date()}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  dateInputContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateText: {
    fontSize: 14,
    color: '#000',
  },
  placeholderText: {
    color: '#999',
  },
  clearButton: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  doneButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});
