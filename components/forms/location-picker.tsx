import { Location } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button } from '../ui/button';
import { TextInput } from './text-input';

interface LocationPickerProps {
  label: string;
  value?: Location;
  onChange: (location: Location) => void;
  error?: string;
  required?: boolean;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  label,
  value,
  onChange,
  error,
  required = false,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [tempLocation, setTempLocation] = useState<Partial<Location>>(
    value || {}
  );
  const [locationErrors, setLocationErrors] = useState<Record<string, string>>({});

  const validateLocation = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!tempLocation.address?.trim()) {
      errors.address = 'Address is required';
    }
    if (!tempLocation.city?.trim()) {
      errors.city = 'City is required';
    }
    if (!tempLocation.state?.trim()) {
      errors.state = 'State is required';
    }
    if (!tempLocation.zipCode?.trim()) {
      errors.zipCode = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(tempLocation.zipCode)) {
      errors.zipCode = 'Invalid ZIP code format';
    }

    setLocationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (validateLocation()) {
      // For now, use placeholder coordinates
      // In a real app, you'd geocode the address
      onChange({
        address: tempLocation.address!,
        city: tempLocation.city!,
        state: tempLocation.state!,
        zipCode: tempLocation.zipCode!,
        latitude: 0,
        longitude: 0,
      });
      setIsModalVisible(false);
    }
  };

  const handleCancel = () => {
    setTempLocation(value || {});
    setLocationErrors({});
    setIsModalVisible(false);
  };

  const formatLocationDisplay = (loc: Location) => {
    return `${loc.address}, ${loc.city}, ${loc.state} ${loc.zipCode}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      
      <TouchableOpacity
        style={[styles.selector, error && styles.selectorError]}
        onPress={() => setIsModalVisible(true)}
      >
        <View style={styles.selectorContent}>
          <Ionicons name="location-outline" size={20} color="#8E8E93" />
          <Text style={[styles.selectorText, !value && styles.placeholder]}>
            {value ? formatLocationDisplay(value) : 'Select location'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Location</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            <TextInput
              label="Street Address"
              value={tempLocation.address || ''}
              onChangeText={(text) => setTempLocation({ ...tempLocation, address: text })}
              error={locationErrors.address}
              required
              placeholder="123 Main St"
            />

            <TextInput
              label="City"
              value={tempLocation.city || ''}
              onChangeText={(text) => setTempLocation({ ...tempLocation, city: text })}
              error={locationErrors.city}
              required
              placeholder="San Francisco"
            />

            <TextInput
              label="State"
              value={tempLocation.state || ''}
              onChangeText={(text) => setTempLocation({ ...tempLocation, state: text })}
              error={locationErrors.state}
              required
              placeholder="CA"
              maxLength={2}
              autoCapitalize="characters"
            />

            <TextInput
              label="ZIP Code"
              value={tempLocation.zipCode || ''}
              onChangeText={(text) => setTempLocation({ ...tempLocation, zipCode: text })}
              error={locationErrors.zipCode}
              required
              placeholder="94102"
              keyboardType="numeric"
              maxLength={10}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Save Location"
              onPress={handleSave}
            />
          </View>
        </View>
      </Modal>
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
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectorText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  placeholder: {
    color: '#8E8E93',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
});
