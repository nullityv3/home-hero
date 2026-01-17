import React, { useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle
} from 'react-native';

export interface ButtonProps {
  title: string;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  style?: ViewStyle;
}

export interface ButtonFeedbackState {
  isPressed: boolean;
  isLoading: boolean;
  showSuccess: boolean;
  showError: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  testID,
  style,
}) => {
  const [feedbackState, setFeedbackState] = useState<ButtonFeedbackState>({
    isPressed: false,
    isLoading: loading,
    showSuccess: false,
    showError: false,
  });

  const handlePress = async () => {
    if (disabled || feedbackState.isLoading) return;

    try {
      // Immediate press feedback
      setFeedbackState(prev => ({ ...prev, isPressed: true }));
      
      // Set loading state for async operations
      setFeedbackState(prev => ({ ...prev, isLoading: true, isPressed: false }));
      
      await onPress();
      
      // Success feedback
      setFeedbackState(prev => ({ ...prev, isLoading: false, showSuccess: true }));
      
      // Clear success feedback after delay
      setTimeout(() => {
        setFeedbackState(prev => ({ ...prev, showSuccess: false }));
      }, 1000);
      
    } catch (error) {
      // Error feedback
      setFeedbackState(prev => ({ 
        ...prev, 
        isLoading: false, 
        showError: true 
      }));
      
      // Clear error feedback after delay
      setTimeout(() => {
        setFeedbackState(prev => ({ ...prev, showError: false }));
      }, 2000);
    }
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle = styles.button;
    const variantStyle = styles[variant];
    const pressedStyle = feedbackState.isPressed ? styles.pressed : {};
    const disabledStyle = (disabled || feedbackState.isLoading) ? styles.disabled : {};
    const successStyle = feedbackState.showSuccess ? styles.success : {};
    const errorStyle = feedbackState.showError ? styles.error : {};

    return {
      ...baseStyle,
      ...variantStyle,
      ...pressedStyle,
      ...disabledStyle,
      ...successStyle,
      ...errorStyle,
      ...style,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle = styles.text;
    const variantTextStyle = styles[`${variant}Text`];
    const disabledTextStyle = (disabled || feedbackState.isLoading) ? styles.disabledText : {};

    return {
      ...baseStyle,
      ...variantTextStyle,
      ...disabledTextStyle,
    };
  };

  const renderContent = () => {
    if (feedbackState.isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="small" 
            color={variant === 'primary' ? '#FFFFFF' : '#007AFF'} 
          />
          <Text style={[getTextStyle(), styles.loadingText]}>Loading...</Text>
        </View>
      );
    }

    if (feedbackState.showSuccess) {
      return <Text style={getTextStyle()}>✓ Success</Text>;
    }

    if (feedbackState.showError) {
      return <Text style={getTextStyle()}>✗ Error</Text>;
    }

    return <Text style={getTextStyle()}>{title}</Text>;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      disabled={disabled || feedbackState.isLoading}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{
        disabled: disabled || feedbackState.isLoading,
        busy: feedbackState.isLoading,
      }}
      accessibilityLabel={
        feedbackState.isLoading 
          ? `${title} loading` 
          : feedbackState.showSuccess 
          ? `${title} completed successfully`
          : feedbackState.showError
          ? `${title} failed`
          : title
      }
      accessibilityHint={
        disabled 
          ? 'Button is disabled'
          : feedbackState.isLoading
          ? 'Please wait while the action completes'
          : `Double tap to ${title.toLowerCase()}`
      }
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: {
    backgroundColor: '#007AFF',
  },
  secondary: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#C7C7CC',
  },
  danger: {
    backgroundColor: '#FF3B30',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  success: {
    backgroundColor: '#34C759',
  },
  error: {
    backgroundColor: '#FF3B30',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#007AFF',
  },
  dangerText: {
    color: '#FFFFFF',
  },
  disabledText: {
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    marginLeft: 8,
  },
});