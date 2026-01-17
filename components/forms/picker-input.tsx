import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface PickerOption {
  label: string;
  value: string;
}

interface PickerInputProps {
  label: string;
  value?: string;
  options: PickerOption[];
  onSelect: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
}

export const PickerInput: React.FC<PickerInputProps> = ({
  label,
  value,
  options,
  onSelect,
  error,
  required = false,
  placeholder = 'Select an option',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      
      <TouchableOpacity
        style={[styles.selector, error && styles.selectorError]}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={[styles.selectorText, !selectedOption && styles.placeholder]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons 
          name={isOpen ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#8E8E93" 
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                option.value === value && styles.optionSelected,
              ]}
              onPress={() => {
                onSelect(option.value);
                setIsOpen(false);
              }}
            >
              <Text
                style={[
                  styles.optionText,
                  option.value === value && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
              {option.value === value && (
                <Ionicons name="checkmark" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>
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
  optionsContainer: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 200,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  optionSelected: {
    backgroundColor: '#F2F2F7',
  },
  optionText: {
    fontSize: 16,
    color: '#000',
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
});
