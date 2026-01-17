import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface DateTimePickerInputProps {
  label: string;
  value?: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  error?: string;
  required?: boolean;
  minimumDate?: Date;
}

export const DateTimePickerInput: React.FC<DateTimePickerInputProps> = ({
  label,
  value,
  onChange,
  mode = 'datetime',
  error,
  required = false,
  minimumDate,
}) => {
  const [show, setShow] = useState(false);

  const formatDate = (date: Date) => {
    if (mode === 'time') {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    if (mode === 'date') {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleChange = (event: any, selectedDate?: Date) => {
    // Handle dismissal/cancellation
    if (event?.type === 'dismissed' || event?.type === 'neutralButtonPressed') {
      setShow(false);
      return;
    }
    
    if (Platform.OS === 'android') {
      setShow(false);
    }
    
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      
      <TouchableOpacity
        style={[styles.selector, error && styles.selectorError]}
        onPress={() => setShow(true)}
      >
        <Text style={[styles.selectorText, !value && styles.placeholder]}>
          {value ? formatDate(value) : `Select ${mode}`}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#8E8E93" />
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={value || new Date()}
          mode={mode === 'datetime' ? 'date' : mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
        />
      )}

      {Platform.OS === 'ios' && show && (
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => setShow(false)}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  selectorError: {
    borderColor: '#FF3B30',
  },
  selectorText: {
    fontSize: 16,
    color: '#000',
  },
  placeholder: {
    color: '#8E8E93',
  },
  doneButton: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
});
