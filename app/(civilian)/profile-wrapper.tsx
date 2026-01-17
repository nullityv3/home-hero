import { ProtectedRoute } from '@/components/auth/protected-route';
import { ReactNode } from 'react';

interface ProfileWrapperProps {
  children: ReactNode;
}

/**
 * ProfileWrapper - Allows access to profile page without complete onboarding
 * 
 * ✅ ONBOARDING BYPASS: Profile page needs access even when civilian_profiles is missing
 * ✅ AUTH REQUIRED: Still requires authentication and correct user type
 */
function ProfileWrapper({ children }: ProfileWrapperProps) {
  return (
    <ProtectedRoute requiredUserType="civilian" requiresOnboarding={false}>
      {children}
    </ProtectedRoute>
  );
}

export default ProfileWrapper;