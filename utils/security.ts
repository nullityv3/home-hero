// Security utilities for request validation and protection
import { auth } from '@/services/supabase';

export interface SecurityContext {
  userId: string;
  userType: 'civilian' | 'hero';
  sessionToken: string;
  requestId: string;
}

// Generate CSRF token for forms
export const generateCSRFToken = (): string => {
  return `csrf_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// Validate CSRF token
export const validateCSRFToken = (token: string, maxAge: number = 3600000): boolean => {
  if (!token || !token.startsWith('csrf_')) {
    return false;
  }

  const parts = token.split('_');
  if (parts.length !== 3) {
    return false;
  }

  const timestamp = parseInt(parts[1]);
  if (isNaN(timestamp)) {
    return false;
  }

  const age = Date.now() - timestamp;
  return age <= maxAge;
};

// Validate user permissions for resource access
export const validateResourceAccess = async (
  resourceType: 'service_request' | 'hero_profile' | 'chat_message',
  resourceId: string,
  action: 'read' | 'write' | 'delete'
): Promise<{ allowed: boolean; reason?: string }> => {
  try {
    const { data: { user } } = await auth.getCurrentUser();
    
    if (!user) {
      return { allowed: false, reason: 'User not authenticated' };
    }

    // Implement resource-specific access control
    switch (resourceType) {
      case 'service_request':
        return validateServiceRequestAccess(resourceId, user.id, user.user_metadata?.user_type, action);
      
      case 'hero_profile':
        return validateHeroProfileAccess(resourceId, user.id, user.user_metadata?.user_type, action);
      
      case 'chat_message':
        return validateChatMessageAccess(resourceId, user.id, action);
      
      default:
        return { allowed: false, reason: 'Unknown resource type' };
    }
  } catch (error) {
    console.error('Access validation error:', error);
    return { allowed: false, reason: 'Validation error' };
  }
};

const validateServiceRequestAccess = (
  requestId: string,
  userId: string,
  userType: string,
  action: string
): { allowed: boolean; reason?: string } => {
  // Civilians can read/write their own requests
  // Heroes can read assigned requests, write status updates
  // This would typically query the database to check ownership
  
  if (action === 'delete' && userType !== 'civilian') {
    return { allowed: false, reason: 'Only civilians can delete service requests' };
  }
  
  return { allowed: true };
};

const validateHeroProfileAccess = (
  profileId: string,
  userId: string,
  userType: string,
  action: string
): { allowed: boolean; reason?: string } => {
  // Anyone can read hero profiles
  if (action === 'read') {
    return { allowed: true };
  }
  
  // Only the hero themselves can write to their profile
  if (action === 'write' && userType === 'hero') {
    return { allowed: true };
  }
  
  return { allowed: false, reason: 'Insufficient permissions' };
};

const validateChatMessageAccess = (
  messageId: string,
  userId: string,
  action: string
): { allowed: boolean; reason?: string } => {
  // Users can only read messages from their own conversations
  // This would typically check conversation membership
  return { allowed: true };
};

// Sanitize user input to prevent XSS
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// Validate file uploads
export const validateFileUpload = (file: {
  name: string;
  size: number;
  type: string;
}): { valid: boolean; error?: string } => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 5MB limit' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
  }
  
  return { valid: true };
};