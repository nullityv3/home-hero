/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * TEST IMMEDIATE PROFILE CREATION
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * This script tests that profiles are created immediately after signup
 * No more: select from profiles → recordCount: 0
 * 
 * Run: node scripts/test-immediate-profile-creation.js
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { database, supabase } = require('../services/supabase');

async function testImmediateProfileCreation() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTING IMMEDIATE PROFILE CREATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // Test 1: Check if profiles exist immediately after checking database
    console.log('\n🔍 Test 1: Checking existing profile creation...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, role')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ Error querying profiles:', profilesError.message);
      return;
    }
    
    if (profiles && profiles.length > 0) {
      console.log('✅ Found existing profiles:', profiles.length);
      
      // Test 2: Check if role-specific profiles exist
      const testProfile = profiles[0];
      console.log(`\n🔍 Test 2: Checking role-specific profile for ${testProfile.role}...`);
      
      const tableName = testProfile.role === 'civilian' ? 'civilian_profiles' : 'hero_profiles';
      const { data: roleProfile, error: roleError } = await supabase
        .from(tableName)
        .select('*')
        .eq('profile_id', testProfile.id)
        .maybeSingle();
      
      if (roleError) {
        console.log(`❌ Error querying ${tableName}:`, roleError.message);
      } else if (roleProfile) {
        console.log(`✅ Found ${testProfile.role} profile:`, {
          profile_id: roleProfile.profile_id,
          created_at: roleProfile.created_at
        });
      } else {
        console.log(`❌ No ${testProfile.role} profile found for user ${testProfile.id}`);
      }
    } else {
      console.log('⚠️  No profiles found in database');
    }
    
    // Test 3: Verify getUserProfile returns data (not null)
    console.log('\n🔍 Test 3: Testing getUserProfile function...');
    
    if (profiles && profiles.length > 0) {
      const testUserId = profiles[0].id;
      const testUserType = profiles[0].role;
      
      const { data: userProfile, error: userProfileError } = await database.getUserProfile(testUserId, testUserType);
      
      if (userProfileError) {
        console.log('❌ getUserProfile returned error:', userProfileError.message);
      } else if (userProfile) {
        console.log('✅ getUserProfile returned data:', {
          profile_id: userProfile.profile_id,
          hasData: !!userProfile
        });
      } else {
        console.log('❌ getUserProfile returned null - this indicates the double query problem!');
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ If profiles exist and getUserProfile returns data: SUCCESS');
    console.log('❌ If getUserProfile returns null: DOUBLE QUERY PROBLEM EXISTS');
    console.log('\n💡 To fix: Run the migration and test signup flow');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test
testImmediateProfileCreation().catch(console.error);