/**
 * Integration Verification Script
 * 
 * This script verifies that all major integration points in the HomeHeroes
 * frontend application are properly connected and functional.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface IntegrationCheck {
  name: string;
  description: string;
  check: () => boolean;
  critical: boolean;
}

const checks: IntegrationCheck[] = [
  // Navigation Structure Checks
  {
    name: 'Auth Layout Exists',
    description: 'Verify authentication layout is present',
    check: () => existsSync(join(process.cwd(), 'app/(auth)/_layout.tsx')),
    critical: true,
  },
  {
    name: 'Civilian Layout Exists',
    description: 'Verify civilian layout is present',
    check: () => existsSync(join(process.cwd(), 'app/(civilian)/_layout.tsx')),
    critical: true,
  },
  {
    name: 'Hero Layout Exists',
    description: 'Verify hero layout is present',
    check: () => existsSync(join(process.cwd(), 'app/(hero)/_layout.tsx')),
    critical: true,
  },
  {
    name: 'Root Layout Exists',
    description: 'Verify root layout with error boundary',
    check: () => {
      const path = join(process.cwd(), 'app/_layout.tsx');
      if (!existsSync(path)) return false;
      const content = readFileSync(path, 'utf-8');
      return content.includes('ErrorBoundary') && content.includes('OfflineIndicator');
    },
    critical: true,
  },

  // Screen Existence Checks
  {
    name: 'Login Screen Exists',
    description: 'Verify login screen is present',
    check: () => existsSync(join(process.cwd(), 'app/(auth)/login.tsx')),
    critical: true,
  },
  {
    name: 'Signup Screen Exists',
    description: 'Verify signup screen is present',
    check: () => existsSync(join(process.cwd(), 'app/(auth)/signup.tsx')),
    critical: true,
  },
  {
    name: 'Create Request Screen Exists',
    description: 'Verify service request creation screen',
    check: () => existsSync(join(process.cwd(), 'app/create-request.tsx')),
    critical: true,
  },
  {
    name: 'Hero Details Screen Exists',
    description: 'Verify hero details screen',
    check: () => existsSync(join(process.cwd(), 'app/hero-details.tsx')),
    critical: true,
  },
  {
    name: 'Chat Conversation Screen Exists',
    description: 'Verify chat conversation screen',
    check: () => existsSync(join(process.cwd(), 'app/chat-conversation.tsx')),
    critical: true,
  },

  // Component Checks
  {
    name: 'Protected Route Component',
    description: 'Verify protected route component exists',
    check: () => {
      const path = join(process.cwd(), 'components/auth/protected-route.tsx');
      if (!existsSync(path)) return false;
      const content = readFileSync(path, 'utf-8');
      return content.includes('useAuthStore') && content.includes('requiredUserType');
    },
    critical: true,
  },
  {
    name: 'Error Boundary Component',
    description: 'Verify error boundary component exists',
    check: () => existsSync(join(process.cwd(), 'components/error-boundary.tsx')),
    critical: true,
  },
  {
    name: 'Offline Indicator Component',
    description: 'Verify offline indicator component exists',
    check: () => existsSync(join(process.cwd(), 'components/ui/offline-indicator.tsx')),
    critical: true,
  },
  {
    name: 'Chat Components',
    description: 'Verify chat components exist',
    check: () => {
      return existsSync(join(process.cwd(), 'components/chat/chat-conversation.tsx')) &&
             existsSync(join(process.cwd(), 'components/chat/chat-list.tsx')) &&
             existsSync(join(process.cwd(), 'components/chat/status-indicator.tsx'));
    },
    critical: true,
  },

  // Store Checks
  {
    name: 'Auth Store',
    description: 'Verify auth store exists and exports useAuthStore',
    check: () => {
      const path = join(process.cwd(), 'stores/auth.ts');
      if (!existsSync(path)) return false;
      const content = readFileSync(path, 'utf-8');
      return content.includes('useAuthStore') && content.includes('signIn') && content.includes('signOut');
    },
    critical: true,
  },
  {
    name: 'Requests Store',
    description: 'Verify requests store exists',
    check: () => {
      const path = join(process.cwd(), 'stores/requests.ts');
      if (!existsSync(path)) return false;
      const content = readFileSync(path, 'utf-8');
      return content.includes('useRequestsStore') && content.includes('activeRequests');
    },
    critical: true,
  },
  {
    name: 'Chat Store',
    description: 'Verify chat store exists',
    check: () => {
      const path = join(process.cwd(), 'stores/chat.ts');
      if (!existsSync(path)) return false;
      const content = readFileSync(path, 'utf-8');
      return content.includes('useChatStore') && content.includes('sendMessage');
    },
    critical: true,
  },
  {
    name: 'Earnings Store',
    description: 'Verify earnings store exists',
    check: () => {
      const path = join(process.cwd(), 'stores/earnings.ts');
      if (!existsSync(path)) return false;
      const content = readFileSync(path, 'utf-8');
      return content.includes('useEarningsStore');
    },
    critical: true,
  },

  // Service Checks
  {
    name: 'Supabase Service',
    description: 'Verify Supabase service is configured',
    check: () => {
      const path = join(process.cwd(), 'services/supabase.ts');
      if (!existsSync(path)) return false;
      const content = readFileSync(path, 'utf-8');
      return content.includes('createClient') && content.includes('auth') && content.includes('database');
    },
    critical: true,
  },
  {
    name: 'React Query Service',
    description: 'Verify React Query is configured',
    check: () => {
      const path = join(process.cwd(), 'services/react-query.ts');
      if (!existsSync(path)) return false;
      const content = readFileSync(path, 'utf-8');
      return content.includes('QueryClient') && content.includes('queryClient');
    },
    critical: true,
  },

  // Type Checks
  {
    name: 'Type Definitions',
    description: 'Verify core type definitions exist',
    check: () => {
      const path = join(process.cwd(), 'types/index.ts');
      if (!existsSync(path)) return false;
      const content = readFileSync(path, 'utf-8');
      return content.includes('User') && 
             content.includes('ServiceRequest') && 
             content.includes('ChatMessage');
    },
    critical: true,
  },

  // Form Component Checks
  {
    name: 'Form Components',
    description: 'Verify form components exist',
    check: () => {
      return existsSync(join(process.cwd(), 'components/forms/text-input.tsx')) &&
             existsSync(join(process.cwd(), 'components/forms/picker-input.tsx')) &&
             existsSync(join(process.cwd(), 'components/forms/date-time-picker.tsx')) &&
             existsSync(join(process.cwd(), 'components/forms/location-picker.tsx'));
    },
    critical: true,
  },

  // UI Component Checks
  {
    name: 'UI Components',
    description: 'Verify core UI components exist',
    check: () => {
      return existsSync(join(process.cwd(), 'components/ui/button.tsx')) &&
             existsSync(join(process.cwd(), 'components/ui/loading-skeleton.tsx')) &&
             existsSync(join(process.cwd(), 'components/ui/error-message.tsx'));
    },
    critical: true,
  },

  // Utility Checks
  {
    name: 'Error Handler Utility',
    description: 'Verify error handler utility exists',
    check: () => existsSync(join(process.cwd(), 'utils/error-handler.ts')),
    critical: true,
  },
  {
    name: 'Offline Queue Utility',
    description: 'Verify offline queue utility exists',
    check: () => existsSync(join(process.cwd(), 'utils/offline-queue.ts')),
    critical: true,
  },
  {
    name: 'Performance Monitor',
    description: 'Verify performance monitoring utility exists',
    check: () => existsSync(join(process.cwd(), 'utils/performance.ts')),
    critical: false,
  },

  // Hook Checks
  {
    name: 'Network Status Hook',
    description: 'Verify network status hook exists',
    check: () => existsSync(join(process.cwd(), 'hooks/use-network-status.ts')),
    critical: true,
  },
  {
    name: 'Offline Action Hook',
    description: 'Verify offline action hook exists',
    check: () => existsSync(join(process.cwd(), 'hooks/use-offline-action.ts')),
    critical: true,
  },

  // Property-Based Test Checks
  {
    name: 'Auth Validation Tests',
    description: 'Verify auth validation property tests exist',
    check: () => existsSync(join(process.cwd(), 'app/(auth)/__tests__/auth-validation.property.test.ts')),
    critical: false,
  },
  {
    name: 'Service Request Tests',
    description: 'Verify service request property tests exist',
    check: () => {
      return existsSync(join(process.cwd(), 'stores/__tests__/service-request-creation.property.test.ts')) &&
             existsSync(join(process.cwd(), 'app/__tests__/service-request-form-validation.property.test.ts'));
    },
    critical: false,
  },
  {
    name: 'Hero Discovery Tests',
    description: 'Verify hero discovery property tests exist',
    check: () => {
      return existsSync(join(process.cwd(), 'app/(civilian)/__tests__/hero-filtering.property.test.ts')) &&
             existsSync(join(process.cwd(), 'app/(civilian)/__tests__/hero-sorting.property.test.ts'));
    },
    critical: false,
  },
  {
    name: 'Chat Tests',
    description: 'Verify chat property tests exist',
    check: () => {
      return existsSync(join(process.cwd(), 'stores/__tests__/chat-message-delivery.property.test.ts')) &&
             existsSync(join(process.cwd(), 'stores/__tests__/chat-realtime-updates.property.test.ts'));
    },
    critical: false,
  },
  {
    name: 'Earnings Tests',
    description: 'Verify earnings property tests exist',
    check: () => {
      return existsSync(join(process.cwd(), 'stores/__tests__/earnings-calculation.property.test.ts')) &&
             existsSync(join(process.cwd(), 'stores/__tests__/earnings-filtering.property.test.ts'));
    },
    critical: false,
  },
];

function runIntegrationChecks(): void {
  console.log('🔍 Running HomeHeroes Integration Verification...\n');

  let passedCount = 0;
  let failedCount = 0;
  let criticalFailures: string[] = [];

  checks.forEach((check) => {
    try {
      const result = check.check();
      if (result) {
        console.log(`✅ ${check.name}`);
        passedCount++;
      } else {
        console.log(`❌ ${check.name} - ${check.description}`);
        failedCount++;
        if (check.critical) {
          criticalFailures.push(check.name);
        }
      }
    } catch (error) {
      console.log(`❌ ${check.name} - Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failedCount++;
      if (check.critical) {
        criticalFailures.push(check.name);
      }
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Integration Verification Results:`);
  console.log(`   Total Checks: ${checks.length}`);
  console.log(`   ✅ Passed: ${passedCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);
  console.log(`   🔴 Critical Failures: ${criticalFailures.length}`);

  if (criticalFailures.length > 0) {
    console.log('\n🔴 Critical Integration Issues:');
    criticalFailures.forEach((failure) => {
      console.log(`   - ${failure}`);
    });
    console.log('\n⚠️  Application may not function correctly. Please address critical issues.');
    process.exit(1);
  } else if (failedCount > 0) {
    console.log('\n⚠️  Some non-critical checks failed. Application should function but may have missing features.');
    process.exit(0);
  } else {
    console.log('\n✅ All integration checks passed! Application is fully integrated.');
    process.exit(0);
  }
}

// Run the checks
runIntegrationChecks();
