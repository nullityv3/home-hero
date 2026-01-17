/**
 * Verify Supabase credentials are properly configured
 * Run with: npx ts-node scripts/verify-credentials.ts
 */

import { supabase } from '../services/supabase';

async function verifyCredentials() {
  console.log('🔍 Verifying Supabase Credentials\n');
  console.log('='.repeat(60));

  // Check environment variables
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  console.log('\n1. Environment Variables:');
  console.log(`   URL: ${url ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Key: ${key ? '✅ Set' : '❌ Missing'}`);

  if (!url || !key) {
    console.error('\n❌ Missing credentials in .env file');
    console.log('\nPlease ensure your .env file contains:');
    console.log('EXPO_PUBLIC_SUPABASE_URL=https://htdaqadkqolmpvvbbmez.supabase.co');
    console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
    process.exit(1);
  }

  // Verify URL format
  console.log('\n2. URL Format:');
  if (url.startsWith('https://') && url.includes('.supabase.co')) {
    console.log('   ✅ Valid Supabase URL format');
    console.log(`   Project: ${url.split('//')[1].split('.')[0]}`);
  } else {
    console.log('   ⚠️  URL format may be incorrect');
  }

  // Verify key format
  console.log('\n3. Anon Key Format:');
  if (key.startsWith('eyJ') && key.split('.').length === 3) {
    console.log('   ✅ Valid JWT token format');
  } else {
    console.log('   ⚠️  Key format may be incorrect');
  }

  // Test connection
  console.log('\n4. Testing Connection:');
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('   ⚠️  Connection test returned error:', error.message);
    } else {
      console.log('   ✅ Successfully connected to Supabase');
      console.log(`   Session: ${data.session ? 'Active' : 'No active session (expected)'}`);
    }
  } catch (error: any) {
    console.error('   ❌ Connection failed:', error.message);
    process.exit(1);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ Credentials Verification Complete\n');
  console.log('Your Supabase configuration:');
  console.log(`   Project URL: ${url}`);
  console.log(`   Project ID: ${url.split('//')[1].split('.')[0]}`);
  console.log('\nNext steps:');
  console.log('1. Deploy edge functions: npm run supabase:deploy');
  console.log('2. Set edge function secrets (see supabase/DEPLOYMENT_CHECKLIST.md)');
  console.log('3. Test your app: npm start');
  console.log('='.repeat(60));
}

verifyCredentials().catch(error => {
  console.error('\n💥 Verification failed:', error);
  process.exit(1);
});
