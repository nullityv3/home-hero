import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppError, handleError } from '../../utils/error-handler';

interface ErrorMessageProps {
  error: any;
  onRetry?: () => void;
  onDismiss?: () => void;
  style?: any;
}

/**
 * Reusable error message component
 * Displays user-friendly error messages with action buttons
 */
export function ErrorMessage({ error, onRetry, onDismiss, style }: ErrorMessageProps) {
  const appError: AppError = typeof error === 'string' 
    ? { category: 'unknown', message: error, suggestion: 'Please try again' }
    : handleError(error);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.message}>{appError.message}</Text>
        <Text style={styles.suggestion}>{appError.suggestion}</Text>
      </View>
      
      <View style={styles.actions}>
        {onRetry && (
          <TouchableOpacity 
            style={[styles.button, styles.retryButton]}
            onPress={onRetry}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}
        
        {onDismiss && (
          <TouchableOpacity 
            style={[styles.button, styles.dismissButton]}
            onPress={onDismiss}
          >
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  content: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    textAlign: 'center',
    marginBottom: 4,
  },
  suggestion: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#856404',
  },
  dismissButtonText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '600',
  },
});
