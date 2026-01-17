import React, { useEffect, useState } from 'react';
import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

export interface InputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validator?: (value: string) => string | undefined;
  validateOnChange?: boolean;
  showSuccess?: boolean;
  testID?: string;
  style?: ViewStyle;
}

interface InputFeedbackState {
  isFocused: boolean;
  hasError: boolean;
  isValidating: boolean;
  showSuccess: boolean;
  validationMessage?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  required = false,
  validator,
  validateOnChange = false,
  showSuccess = false,
  testID,
  value,
  onChangeText,
  onFocus,
  onBlur,
  style,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(value || '');
  const [feedbackState, setFeedbackState] = useState<InputFeedbackState>({
    isFocused: false,
    hasError: false,
    isValidating: false,
    showSuccess: false,
  });

  // Update internal state when external value changes
  useEffect(() => {
    if (value !== undefined && value !== internalValue) {
      setInternalValue(value);
    }
  }, [value]);

  // Update error state when external error prop changes
  useEffect(() => {
    setFeedbackState(prev => ({
      ...prev,
      hasError: !!error,
      validationMessage: error,
      showSuccess: !error && showSuccess && internalValue.length > 0,
    }));
  }, [error, showSuccess, internalValue.length]);

  const handleChangeText = (text: string) => {
    setInternalValue(text);
    onChangeText?.(text);

    if (validateOnChange && validator) {
      // Simulate async validation delay
      setFeedbackState(prev => ({ ...prev, isValidating: true }));
      
      setTimeout(() => {
        const validationError = validator(text);
        setFeedbackState(prev => ({
          ...prev,
          isValidating: false,
          hasError: !!validationError,
          validationMessage: validationError,
          showSuccess: !validationError && text.length > 0,
        }));
      }, 300);
    }
  };

  const handleFocus = (e: any) => {
    setFeedbackState(prev => ({ ...prev, isFocused: true }));
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setFeedbackState(prev => ({ ...prev, isFocused: false }));
    
    // Validate on blur if validator is provided
    if (validator && !validateOnChange) {
      const validationError = validator(internalValue);
      setFeedbackState(prev => ({
        ...prev,
        hasError: !!validationError,
        validationMessage: validationError,
        showSuccess: !validationError && internalValue.length > 0,
      }));
    }
    
    onBlur?.(e);
  };

  const getContainerStyle = (): ViewStyle => {
    return {
      ...styles.container,
      ...(feedbackState.isFocused ? styles.focusedContainer : {}),
      ...(feedbackState.hasError ? styles.errorContainer : {}),
      ...(feedbackState.showSuccess ? styles.successContainer : {}),
      ...style,
    };
  };

  const getInputStyle = (): TextStyle => {
    return {
      ...styles.input,
      ...(feedbackState.isFocused ? styles.focusedInput : {}),
      ...(feedbackState.hasError ? styles.errorInput : {}),
      ...(feedbackState.showSuccess ? styles.successInput : {}),
    };
  };

  const getLabelStyle = (): TextStyle => {
    return {
      ...styles.label,
      ...(feedbackState.isFocused ? styles.focusedLabel : {}),
      ...(feedbackState.hasError ? styles.errorLabel : {}),
      ...(feedbackState.showSuccess ? styles.successLabel : {}),
    };
  };

  const renderFeedbackMessage = () => {
    if (feedbackState.isValidating) {
      return <Text style={styles.validatingText}>Validating...</Text>;
    }

    if (feedbackState.hasError && feedbackState.validationMessage) {
      return <Text style={styles.errorText}>{feedbackState.validationMessage}</Text>;
    }

    if (feedbackState.showSuccess) {
      return <Text style={styles.successText}>✓ Valid</Text>;
    }

    if (helperText) {
      return <Text style={styles.helperText}>{helperText}</Text>;
    }

    return null;
  };

  return (
    <View style={getContainerStyle()}>
      {label && (
        <Text style={getLabelStyle()}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <RNTextInput
        {...props}
        style={getInputStyle()}
        value={internalValue}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        testID={testID}
        accessibilityLabel={label}
        accessibilityState={{
          disabled: props.editable === false,
        }}
        accessibilityHint={
          feedbackState.isValidating 
            ? 'Input is validating'
            : feedbackState.hasError 
            ? `Error: ${feedbackState.validationMessage}`
            : feedbackState.showSuccess 
            ? 'Input is valid'
            : undefined
        }
      />
      
      {renderFeedbackMessage()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  focusedContainer: {
    // Add any container-level focus styles
  },
  successContainer: {
    // Add any container-level success styles
  },
  errorContainer: {
    // Add any container-level error styles
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  focusedLabel: {
    color: '#007AFF',
  },
  successLabel: {
    color: '#34C759',
  },
  errorLabel: {
    color: '#FF3B30',
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  focusedInput: {
    borderColor: '#007AFF',
  },
  successInput: {
    borderColor: '#34C759',
    borderWidth: 2,
  },
  errorInput: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  helperText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  validatingText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 4,
  },
  successText: {
    fontSize: 14,
    color: '#34C759',
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
});