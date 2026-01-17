/**
 * Test Signup Flow
 * 
 * This script tests the complete signup flow:
 * 1. Create a new user account
 * 2. Verify profile is auto-created by trigger
 * 3. Verify RLS policies allow access
 */

import { supabase } from '../services/supabase';

async function testSignupFlow() {
  console.log('🧪 Testing Signup Flow\n');
  
  const startTime = Date.now();
  
  // Generate unique test email
  const timestamp = Date.now();
  const testEmail = `test-${timestamp}@example.com`;
  const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
  
  // Mask email in logs for security
  const maskedEmail = testEmail.replace(/(.{3}).*(@.*)/, '$1***$2');
  
  try {
    // Test 1: Civilian Signup
    console.log('📝 Test 1: Civilian Signup');
    console.log(`   Email: ${maskedEmail}`);
    console.log(`   Type: civilian`);
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          user_type: 'civilian'
        }
      }
    });
    
    if (signupError) {
      console.error('   ❌ Signup failed:', signupError.message);
      return;
    }
    
    if (!signupData.user) {
      console.error('   ❌ No user returned from signup');
      return;
    }
    
    console.log('   ✅ User created:', signupData.user.id);
    console.log('   ✅ User type:', signupData.user.user_metadata?.user_type);
    
    // Validate user metadata
    if (signupData.user.user_metadata?.user_type !== 'civilian') {
      console.error('   ❌ User type not set correctly in metadata');
      return;
    }
    
    // Wait a moment for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Verify Profile Created
    console.log('\n📝 Test 2: Verify Profile Auto-Created');
    
    // Use retry logic with exponential backoff for trigger execution
    let profileData = null;
    let profileError = null;
    const maxAttempts = 5;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { data, error } = await supabase
        .from('civilian_profiles')
        .select('*')
        .eq('profile_id', signupData.user.id)  // ✅ FIXED: Use profile_id foreign key
        .single();
      
      if (data) {
        profileData = data;
        break;
      }
      
      profileError = error;
      
      if (attempt < maxAttempts - 1) {
        const delay = 500 * Math.pow(2, attempt);
        console.log(`   ⏳ Waiting ${delay}ms for trigger... (attempt ${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    if (profileError || !profileData) {
      console.error('   ❌ Profile not found after', maxAttempts, 'attempts:', profileError?.message);
      console.error('   ⚠️  This means the trigger did not execute!');
      return;
    }
    
    console.log('   ✅ Profile found:', profileData.id);
    console.log('   ✅ Trigger worked correctly!');
    
    // Test 3: Verify RLS Policies
    console.log('\n📝 Test 3: Verify RLS Policies');
    
    // User should be able to read their own profile
    const { data: rlsData, error: rlsError } = await supabase
      .from('civilian_profiles')
      .select('*')
      .eq('profile_id', signupData.user.id)  // ✅ FIXED: Use profile_id foreign key
      .single();
    
    if (rlsError) {
      console.error('   ❌ RLS policy blocking access:', rlsError.message);
      return;
    }
    
    console.log('   ✅ RLS policies allow user to read own profile');
    
    // Test 4: Update Profile
    console.log('\n📝 Test 4: Update Profile');
    
    const { data: updateData, error: updateError } = await supabase
      .from('civilian_profiles')
      .update({
        full_name: 'Test User',
        phone: '555-0123'
      })
      .eq('profile_id', signupData.user.id)  // ✅ FIXED: Use profile_id foreign key
      .select()
      .single();
    
    if (updateError) {
      console.error('   ❌ Update failed:', updateError.message);
      return;
    }
    
    console.log('   ✅ Profile updated successfully');
    console.log('   ✅ Full name:', updateData.full_name);
    console.log('   ✅ Phone:', updateData.phone);
    
    // Cleanup
    console.log('\n🧹 Cleaning up test user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      signupData.user.id
    );
    
    if (deleteError) {
      console.log('   ⚠️  Could not delete test user (requires admin privileges)');
      console.log('   ℹ️  You may need to manually delete:', testEmail);
    } else {
      console.log('   ✅ Test user deleted');
    }
    
    const duration = Date.now() - startTime;
    
    console.log('\n✅ All tests passed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Signup creates user');
    console.log('   ✅ User metadata stored correctly');
    console.log('   ✅ Trigger auto-creates profile');
    console.log('   ✅ RLS policies work correctly');
    console.log('   ✅ Profile updates work');
    console.log(`\n⏱️  Total duration: ${duration}ms`);
    
    if (duration > 10000) {
      console.warn('   ⚠️  Tests took longer than expected (>10s)');
    }
    
  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error);
  }
}

// Run the test
testSignupFlow().then(() => {
  console.log('\n✅ Test complete');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
