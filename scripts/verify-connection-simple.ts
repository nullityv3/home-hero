#!/usr/bin/env ts-node
/**
 * Simple Supabase Connection Verification
 */

import { createClient } from '@supabase/supabase-js';

async function verify() {
  console.log('🔍 Verifying Supabase Connection\n');
  console.log('='.repeat(60));

  // Load environment variables
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://htdaqadkqolmpvvbbmez.supabase.co';
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZGFxYWRrcW9sbXB2dmJibWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4OTU2NzYsImV4cCI6MjA4MDQ3MTY3Nn0.XKRtpnAuzPekjBuiUILDcMLQ49JoiBaNUYSXTAY7EBY';

  console.log('✅ Environment Variables');
  console.log(`   URL: ${url}`);
  console.log(`   Key: ${key.substring(0, 30)}...`);
  console.log();

  // Create client
  const supabase = createClient(url, key);

  // Test 1: Check auth
  console.log('📡 Test 1: Auth System');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error && !error.message.includes('no session')) {
      throw error;
    }
    console.log('   ✅ Auth system accessible');
  } catch (error: any) {
    console.log('   ❌ Auth failed:', error.message);
    return;
  }

  // Test 2: Check civilian_profiles table
  console.log('\n📡 Test 2: civilian_profiles Table');
  try {
    const { data, error } = await supabase
      .from('civilian_profiles')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    console.log(`   ✅ Table accessible (${data?.length || 0} rows found)`);
  } catch (error: any) {
    console.log('   ❌ Table error:', error.message);
    console.log('   ⚠️  Make sure you\'ve run the schema from xz.md');
  }

  // Test 3: Check hero_profiles table
  console.log('\n📡 Test 3: hero_profiles Table');
  try {
    const { data, error } = await supabase
      .from('hero_profiles')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    console.log(`   ✅ Table accessible (${data?.length || 0} rows found)`);
  } catch (error: any) {
    console.log('   ❌ Table error:', error.message);
  }

  // Test 4: Check service_requests table
  console.log('\n📡 Test 4: service_requests Table');
  try {
    const { data, error } = await supabase
      .from('service_requests')
      .select('id, status')
      .limit(1);
    
    if (error) throw error;
    console.log(`   ✅ Table accessible (${data?.length || 0} rows found)`);
  } catch (error: any) {
    console.log('   ❌ Table error:', error.message);
  }

  // Test 5: Check chat_messages table
  console.log('\n📡 Test 5: chat_messages Table');
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    console.log(`   ✅ Table accessible (${data?.length || 0} rows found)`);
  } catch (error: any) {
    console.log('   ❌ Table error:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Connection verification complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. If tables are missing, run the SQL from xz.md in Supabase SQL Editor');
  console.log('   2. Start your app: npm start');
  console.log('   3. Test signup/login functionality');
}

verify().catch(error => {
  console.error('\n❌ Verification failed:', error);
  process.exit(1);
});
