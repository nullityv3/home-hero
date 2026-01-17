/**
 * Test script to verify signup flow works correctly
 * Tests:
 * 1. User signup creates auth.users record
 * 2. Trigger automatically creates profile (civilian or hero)
 * 3. Profile can be queried with RLS policies
 */

import { supabase } from '../services/supabase';

async function testSignup() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Testing Signup Flow');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Generate unique test email
  const timestamp = Date.now();
  const testEmail = `test-civilian-${timestamp}@example.com`;
  const testPassword = 'TestPassword123!@#';
  const userType = 'civilian';

  console.log(`📧 Test Email: ${testEmail}`);
  console.log(`👤 User Type: ${userType}\n`);

  try {
    // Step 1: Sign up
    console.log('Step 1: Creating user account...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          user_type: userType,
        },
      },
    });

    if (signUpError) {
      console.error('❌ Signup failed:', signUpError.message);
      return;
    }

    if (!signUpData.user) {
      console.error('❌ No user returned from signup');
      return;
    }

    console.log('✅ User created:', signUpData.user.id);
    console.log(`   Email: ${signUpData.user.email}`);
    console.log(`   Metadata: ${JSON.stringify(signUpData.user.user_metadata)}\n`);

    // Step 2: Wait a moment for trigger to execute
    console.log('Step 2: Waiting for trigger to create profile...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Check if profile was created
    console.log('Step 3: Checking if profile was created...');
    const tableName = userType === 'civilian' ? 'civilian_profiles' : 'hero_profiles';
    
    const { data: profileData, error: profileError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', signUpData.user.id)
      .single();

    if (profileError) {
      console.error(`❌ Profile query failed:`, profileError.message);
      console.error(`   Code: ${profileError.code}`);
      console.error(`   Details: ${profileError.details}`);
      console.error(`   Hint: ${profileError.hint}`);
      return;
    }

    if (!profileData) {
      console.error('❌ Profile not found - trigger may not have executed');
      return;
    }

    console.log('✅ Profile found:', profileData.id);
    console.log(`   Table: ${tableName}`);
    console.log(`   Data: ${JSON.stringify(profileData, null, 2)}\n`);

    // Step 4: Clean up - delete test user
    console.log('Step 4: Cleaning up test user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      signUpData.user.id
    );

    if (deleteError) {
      console.warn('⚠️  Could not delete test user (requires service_role key)');
      console.warn('   Please delete manually from Supabase dashboard');
      console.warn(`   User ID: ${signUpData.user.id}\n`);
    } else {
      console.log('✅ Test user deleted\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SIGNUP TEST PASSED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error: any) {
    console.error('❌ Test failed with exception:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testSignup().catch(console.error);
