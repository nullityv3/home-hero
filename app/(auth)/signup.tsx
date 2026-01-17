import { useAuthStore } from '@/stores/auth';
import { Link, router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type UserType = 'civilian' | 'hero';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  userType: UserType;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  userType?: string;
  general?: string;
}

export default function SignupScreen() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'civilian',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signUp, isLoading } = useAuthStore();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation - Enhanced to match backend requirements
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 12) {
      newErrors.password = 'Password must be at least 12 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, number, and special character';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // User type validation - Ensure it's always valid
    if (!formData.userType || !['civilian', 'hero'].includes(formData.userType)) {
      newErrors.userType = 'Please select a valid account type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = useCallback((field: keyof FormData, value: string | UserType) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const handleSubmit = useCallback(async () => {
    // Clear any previous general errors
    setErrors(prev => ({ ...prev, general: undefined }));
    
    if (!validateForm()) {
      return;
    }

    // Prevent double submissions
    if (isSubmitting || isLoading) {
      return;
    }

    // Ensure user_type is always valid before sending
    const validUserType = ['civilian', 'hero'].includes(formData.userType) 
      ? formData.userType 
      : 'civilian';

    setIsSubmitting(true);
    
    try {
      // Pass user_type in raw_user_meta_data via the auth service
      const result = await signUp(formData.email.trim(), formData.password, validUserType);
      
      if (result.success) {
        // ✅ EMAIL VERIFICATION: Show message to verify email before logging in
        Alert.alert(
          '✅ Account Created!',
          `We've sent a verification email to ${formData.email}.\n\nPlease check your inbox and click the verification link to activate your account.\n\nOnce verified, return here to sign in and start using HomeHeroes.`,
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)/login'),
            },
          ],
          { cancelable: false }
        );
      } else {
        // Handle errors gracefully with user-friendly messages
        const errorMessage = result.error || 'An unexpected error occurred during signup';
        
        // Show error in the form instead of alert for better UX
        setErrors(prev => ({ ...prev, general: errorMessage }));
      }
    } catch (error: any) {
      // Handle network and other unexpected errors
      const errorMessage = error?.message?.includes('network') || error?.message?.includes('fetch')
        ? 'Network error occurred. Please check your connection and try again.'
        : 'An unexpected error occurred. Please try again.';
      
      setErrors(prev => ({ ...prev, general: errorMessage }));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isSubmitting, isLoading, signUp, validateForm]);

  const isFormValid = 
    formData.email.trim() && 
    formData.password && 
    formData.confirmPassword && 
    ['civilian', 'hero'].includes(formData.userType) && 
    Object.values(errors).every(error => !error);
  
  // Disable button during submission or loading, or if form is invalid
  const isButtonDisabled = !isFormValid || isSubmitting || isLoading;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join HomeHeroes and start connecting</Text>
        </View>

        <View style={styles.form}>
          {/* General Error Message */}
          {errors.general && (
            <View style={styles.generalErrorContainer}>
              <Text style={styles.generalErrorText}>{errors.general}</Text>
            </View>
          )}

          {/* User Type Selection */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>I want to</Text>
            <View style={styles.userTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  formData.userType === 'civilian' && styles.userTypeButtonActive,
                ]}
                onPress={() => handleInputChange('userType', 'civilian')}
                disabled={isSubmitting || isLoading}
              >
                <Text
                  style={[
                    styles.userTypeButtonText,
                    formData.userType === 'civilian' && styles.userTypeButtonTextActive,
                  ]}
                >
                  Request Services
                </Text>
                <Text style={styles.userTypeDescription}>Find heroes to help with tasks</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  formData.userType === 'hero' && styles.userTypeButtonActive,
                ]}
                onPress={() => handleInputChange('userType', 'hero')}
                disabled={isSubmitting || isLoading}
              >
                <Text
                  style={[
                    styles.userTypeButtonText,
                    formData.userType === 'hero' && styles.userTypeButtonTextActive,
                  ]}
                >
                  Provide Services
                </Text>
                <Text style={styles.userTypeDescription}>Offer your skills and earn money</Text>
              </TouchableOpacity>
            </View>
            {errors.userType && <Text style={styles.errorText}>{errors.userType}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting && !isLoading}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              placeholder="Create a strong password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting && !isLoading}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={[styles.input, errors.confirmPassword && styles.inputError]}
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange('confirmPassword', value)}
              placeholder="Confirm your password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting && !isLoading}
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isButtonDisabled && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isButtonDisabled}
          >
            <Text style={[styles.submitButtonText, isButtonDisabled && styles.submitButtonTextDisabled]}>
              {isSubmitting ? 'Signing up...' : isLoading ? 'Creating Account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 4,
  },
  generalErrorContainer: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ff4444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  generalErrorText: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  userTypeContainer: {
    gap: 12,
  },
  userTypeButton: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  userTypeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  userTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  userTypeButtonTextActive: {
    color: '#007AFF',
  },
  userTypeDescription: {
    fontSize: 14,
    color: '#999',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: '#999',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#666',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});