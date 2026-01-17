import React from 'react';
import {
    TextInput as RNTextInput,
    TextInputProps as RNTextInputProps,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface TextInputProps extends RNTextInputProps {
  label: string;
  error?: string;
  required?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  required = false,
  style,
  ...props
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <RNTextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor="#8E8E93"
        accessibilityLabel={label}
        accessibilityRequired={required}
        accessibilityInvalid={!!error}
        accessibilityHint={error || undefined}
        {...props}
      />
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
  input: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
});
