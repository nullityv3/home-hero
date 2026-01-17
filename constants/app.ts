// Application constants

// Service categories
export const SERVICE_CATEGORIES = [
  { id: 'cleaning', label: 'Cleaning', icon: 'broom' },
  { id: 'repairs', label: 'Repairs', icon: 'hammer' },
  { id: 'delivery', label: 'Delivery', icon: 'truck' },
  { id: 'tutoring', label: 'Tutoring', icon: 'book' },
  { id: 'other', label: 'Other', icon: 'help-circle' },
] as const;

// Request statuses
export const REQUEST_STATUSES = [
  { id: 'pending', label: 'Pending', color: '#FFA500' },
  { id: 'assigned', label: 'Assigned', color: '#4169E1' },
  { id: 'active', label: 'Active', color: '#32CD32' },
  { id: 'completed', label: 'Completed', color: '#228B22' },
  { id: 'cancelled', label: 'Cancelled', color: '#DC143C' },
] as const;

// User types
export const USER_TYPES = [
  { id: 'civilian', label: 'Civilian' },
  { id: 'hero', label: 'Hero' },
] as const;

// Default notification settings
export const DEFAULT_NOTIFICATION_SETTINGS = {
  push_notifications: true,
  email_notifications: true,
  sms_notifications: false,
  request_updates: true,
  chat_messages: true,
  marketing: false,
};

// Default availability schedule
export const DEFAULT_AVAILABILITY = {
  monday: { start: '09:00', end: '17:00', available: true },
  tuesday: { start: '09:00', end: '17:00', available: true },
  wednesday: { start: '09:00', end: '17:00', available: true },
  thursday: { start: '09:00', end: '17:00', available: true },
  friday: { start: '09:00', end: '17:00', available: true },
  saturday: { start: '10:00', end: '16:00', available: false },
  sunday: { start: '10:00', end: '16:00', available: false },
};

// App configuration
export const APP_CONFIG = {
  name: 'HomeHeroes',
  version: '1.0.0',
  supportEmail: 'support@homeheroes.com',
  maxRequestDistance: 50, // miles
  defaultSearchRadius: 25, // miles
  maxFileSize: 5 * 1024 * 1024, // 5MB
  supportedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
};

// API configuration
export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// Validation rules
export const VALIDATION_RULES = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  password: {
    required: true,
    minLength: 8,
    message: 'Password must be at least 8 characters long',
  },
  phone: {
    required: false,
    pattern: /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
    message: 'Please enter a valid phone number',
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    message: 'Name must be between 2 and 50 characters',
  },
  title: {
    required: true,
    minLength: 5,
    maxLength: 100,
    message: 'Title must be between 5 and 100 characters',
  },
  description: {
    required: true,
    minLength: 10,
    maxLength: 500,
    message: 'Description must be between 10 and 500 characters',
  },
};

// Theme colors (to be used with the existing theme system)
export const COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',
  light: '#F2F2F7',
  dark: '#1C1C1E',
  gray: '#8E8E93',
};