import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateTimePickerInput } from '@/components/forms/date-time-picker';
import { LocationPicker } from '@/components/forms/location-picker';
import { PickerInput } from '@/components/forms/picker-input';
import { TextInput } from '@/components/forms/text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { database } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth';
import { BudgetRange, Location, ServiceCategory } from '@/types';

interface ServiceRequestData {
  title: string;
  description: string;
  category: ServiceCategory;
  location: Location;
  scheduledDate: Date;
  estimatedDuration: number;
  budgetRange: BudgetRange;
}

interface ValidationErrors {
  title?: string;
  description?: string;
  category?: string;
  location?: string;
  scheduledDate?: string;
  estimatedDuration?: string;
  budgetRange?: string;
}

const SERVICE_CATEGORIES = [
  { label: 'Cleaning', value: 'cleaning' },
  { label: 'Repairs', value: 'repairs' },
  { label: 'Delivery', value: 'delivery' },
  { label: 'Tutoring', value: 'tutoring' },
  { label: 'Other', value: 'other' },
];

const DURATION_OPTIONS = [
  { label: '1 hour', value: '1' },
  { label: '2 hours', value: '2' },
  { label: '3 hours', value: '3' },
  { label: '4 hours', value: '4' },
  { label: '5+ hours', value: '5' },
];

export default function CreateRequestModal() {
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [requestData, setRequestData] = useState<Partial<ServiceRequestData>>({
    budgetRange: { min: 0, max: 0, currency: 'USD' },
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    Alert.alert(
      'Discard Request?',
      'Are you sure you want to discard this service request?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {};

    if (step === 1) {
      if (!requestData.category) {
        newErrors.category = 'Please select a service category';
      }
    }

    if (step === 2) {
      if (!requestData.title?.trim()) {
        newErrors.title = 'Title is required';
      }
      if (!requestData.description?.trim()) {
        newErrors.description = 'Description is required';
      }
      if (!requestData.estimatedDuration || requestData.estimatedDuration <= 0) {
        newErrors.estimatedDuration = 'Please select estimated duration';
      }
    }

    if (step === 3) {
      if (!requestData.location) {
        newErrors.location = 'Location is required';
      }
      if (!requestData.scheduledDate) {
        newErrors.scheduledDate = 'Scheduled date is required';
      } else if (requestData.scheduledDate < new Date()) {
        newErrors.scheduledDate = 'Scheduled date must be in the future';
      }
      if (!requestData.budgetRange || requestData.budgetRange.min < 0) {
        newErrors.budgetRange = 'Budget cannot be negative';
      } else if (requestData.budgetRange.min === 0) {
        newErrors.budgetRange = 'Minimum budget must be greater than 0';
      } else if (requestData.budgetRange.max < requestData.budgetRange.min) {
        newErrors.budgetRange = 'Maximum budget must be at least equal to minimum';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
        setErrors({});
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) {
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a service request');
      return;
    }

    // ✅ PROFILE COMPLETION CHECK: Ensure civilian profile exists before allowing request creation
    if (user.user_type === 'civilian') {
      try {
        const { data: civilianProfile, error: profileError } = await database.getUserProfile(user.id, 'civilian');
        
        if (profileError || !civilianProfile) {
          Alert.alert(
            'Profile Incomplete', 
            'Please complete your profile before creating a service request.',
            [
              { text: 'Complete Profile', onPress: () => router.push('/(civilian)/profile') },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
          return;
        }
      } catch (error) {
        Alert.alert('Error', 'Unable to verify profile. Please try again.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // ✅ SCHEMA COMPLIANCE: civilian_id is now derived from authenticated user profile
      const requestPayload = {
        title: requestData.title!,
        description: requestData.description!,
        category: requestData.category!,
        location: requestData.location!,
        scheduled_date: requestData.scheduledDate!.toISOString(),
        estimated_duration: requestData.estimatedDuration!,
        budget_range: requestData.budgetRange!,
        status: 'pending' as const,
      };

      const { error } = await database.createServiceRequest(requestPayload);

      if (error) {
        // Enhanced error logging with context
        const errorContext = {
          message: error.message,
          code: error.code,
          timestamp: new Date().toISOString(),
          userId: user.id,
          action: 'create_service_request',
          requestData: {
            category: requestData.category,
            estimatedDuration: requestData.estimatedDuration,
            budgetRange: requestData.budgetRange ? `${requestData.budgetRange.min}-${requestData.budgetRange.max}` : null
          }
        };
        
        console.error('Service request creation failed:', errorContext);
        
        Alert.alert('Error', error.message || 'Failed to create service request. Please try again.');
        return;
      }

      // Track successful service request creation (anonymized)
      const analyticsData = {
        event: 'service_request_created',
        category: requestData.category,
        estimatedDuration: requestData.estimatedDuration,
        budgetRange: `${requestData.budgetRange?.min}-${requestData.budgetRange?.max}`,
        timestamp: new Date().toISOString(),
        userType: user.user_type
      };
      console.log('Service request created successfully:', analyticsData);

      Alert.alert('Success', 'Service request created successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Unexpected error during service request creation:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <View 
      style={styles.stepIndicator}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${currentStep} of 4`}
    >
      {[1, 2, 3, 4].map((step) => (
        <View
          key={step}
          style={[
            styles.stepDot,
            currentStep >= step && styles.stepDotActive,
          ]}
          accessible={true}
          accessibilityLabel={`Step ${step}${currentStep >= step ? ' completed' : ''}`}
        />
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <ThemedText type="title">Service Type</ThemedText>
            <ThemedText style={styles.stepDescription}>
              What type of service do you need?
            </ThemedText>
            
            <PickerInput
              label="Service Category"
              value={requestData.category}
              options={SERVICE_CATEGORIES}
              onSelect={(value: string) => setRequestData({ ...requestData, category: value as ServiceCategory })}
              error={errors.category}
              required
              placeholder="Select a service category"
            />
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <ThemedText type="title">Service Details</ThemedText>
            <ThemedText style={styles.stepDescription}>
              Provide details about your service request
            </ThemedText>
            
            <TextInput
              label="Service Title"
              value={requestData.title || ''}
              onChangeText={(text) => setRequestData({ ...requestData, title: text })}
              error={errors.title}
              required
              placeholder="e.g., House cleaning needed"
            />

            <TextInput
              label="Description"
              value={requestData.description || ''}
              onChangeText={(text) => setRequestData({ ...requestData, description: text })}
              error={errors.description}
              required
              placeholder="Describe what you need help with..."
              multiline
              numberOfLines={4}
              style={{ height: 100, textAlignVertical: 'top' }}
            />

            <PickerInput
              label="Estimated Duration"
              value={requestData.estimatedDuration?.toString()}
              options={DURATION_OPTIONS}
              onSelect={(value) => setRequestData({ ...requestData, estimatedDuration: parseInt(value) })}
              error={errors.estimatedDuration}
              required
              placeholder="How long will this take?"
            />
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContent}>
            <ThemedText type="title">Schedule & Location</ThemedText>
            <ThemedText style={styles.stepDescription}>
              When and where do you need this service?
            </ThemedText>
            
            <LocationPicker
              label="Service Location"
              value={requestData.location}
              onChange={(location) => setRequestData({ ...requestData, location })}
              error={errors.location}
              required
            />

            <DateTimePickerInput
              label="Scheduled Date & Time"
              value={requestData.scheduledDate}
              onChange={(date) => setRequestData({ ...requestData, scheduledDate: date })}
              mode="datetime"
              error={errors.scheduledDate}
              required
              minimumDate={new Date()}
            />

            <TextInput
              label="Minimum Budget ($)"
              value={requestData.budgetRange?.min.toString() || ''}
              onChangeText={(text) => {
                const min = parseFloat(text) || 0;
                setRequestData({
                  ...requestData,
                  budgetRange: { ...requestData.budgetRange!, min }
                });
              }}
              error={errors.budgetRange}
              required
              keyboardType="numeric"
              placeholder="0"
            />

            <TextInput
              label="Maximum Budget ($)"
              value={requestData.budgetRange?.max.toString() || ''}
              onChangeText={(text) => {
                const max = parseFloat(text) || 0;
                setRequestData({
                  ...requestData,
                  budgetRange: { ...requestData.budgetRange!, max }
                });
              }}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContent}>
            <ThemedText type="title">Review & Confirm</ThemedText>
            <ThemedText style={styles.stepDescription}>
              Review your service request details
            </ThemedText>
            
            <View style={styles.summarySection}>
              <Text style={styles.summaryLabel}>Service Type</Text>
              <Text style={styles.summaryValue}>
                {SERVICE_CATEGORIES.find(c => c.value === requestData.category)?.label || 'N/A'}
              </Text>
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summaryLabel}>Title</Text>
              <Text style={styles.summaryValue}>{requestData.title || 'N/A'}</Text>
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summaryLabel}>Description</Text>
              <Text style={styles.summaryValue}>{requestData.description || 'N/A'}</Text>
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={styles.summaryValue}>
                {requestData.estimatedDuration ? `${requestData.estimatedDuration} hour(s)` : 'N/A'}
              </Text>
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summaryLabel}>Location</Text>
              <Text style={styles.summaryValue}>
                {requestData.location 
                  ? `${requestData.location.address}, ${requestData.location.city}, ${requestData.location.state} ${requestData.location.zipCode}`
                  : 'N/A'}
              </Text>
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summaryLabel}>Scheduled Date</Text>
              <Text style={styles.summaryValue}>
                {requestData.scheduledDate 
                  ? requestData.scheduledDate.toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A'}
              </Text>
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summaryLabel}>Budget Range</Text>
              <Text style={styles.summaryValue}>
                {requestData.budgetRange 
                  ? `$${requestData.budgetRange.min} - $${requestData.budgetRange.max}`
                  : 'N/A'}
              </Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#007AFF" />
        </TouchableOpacity>
        <ThemedText type="subtitle">Create Service Request</ThemedText>
        <View style={styles.headerSpacer} />
      </ThemedView>

      {renderStepIndicator()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          {currentStep > 1 && (
            <Button
              title="Previous"
              onPress={handlePrevious}
              variant="secondary"
              style={styles.button}
            />
          )}
          {currentStep < 4 ? (
            <Button
              title="Next"
              onPress={handleNext}
              style={currentStep === 1 ? styles.fullWidthButton : styles.button}
            />
          ) : (
            <Button
              title={isSubmitting ? "Creating..." : "Create Request"}
              onPress={handleSubmit}
              style={styles.button}
              disabled={isSubmitting}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    padding: 4,
  },
  headerSpacer: {
    width: 32,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5EA',
  },
  stepDotActive: {
    backgroundColor: '#007AFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepContent: {
    paddingVertical: 20,
  },
  stepDescription: {
    marginTop: 8,
    marginBottom: 24,
    color: '#8E8E93',
  },
  summarySection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    color: '#000',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
  fullWidthButton: {
    flex: 1,
  },
});