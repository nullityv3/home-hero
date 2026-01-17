require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  console.log('1. Environment variables:');
  console.log(`   URL: ${url}`);
  console.log(`   Key: ${key ? key.substring(0, 20) + '...' : 'NOT SET'}\n`);

  if (!url || !key) {
    console.error('❌ Missing environment variables');
    return;
  }

  console.log('2. Creating Supabase client...');
  const supabase = createClient(url, key);
  console.log('✅ Client created\n');

  console.log('3. Testing connection...');
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    console.log('✅ Successfully connected to Supabase!');
    console.log(`   Session: ${data.session ? 'Active' : 'No active session (expected for new setup)'}\n`);

    // Try to query a table to verify database access
    console.log('4. Testing database access...');
    const { data: tables, error: dbError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (dbError) {
      console.log('⚠️  Database query note:', dbError.message);
      console.log('   (This is normal if tables don\'t exist yet)\n');
    } else {
      console.log('✅ Database access confirmed!\n');
    }

    console.log('🎉 Supabase connection is working!');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}

testConnection();
