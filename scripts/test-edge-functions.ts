/**
 * Test script for Supabase Edge Functions
 * Run with: npx ts-node scripts/test-edge-functions.ts
 */

import { supabase } from '../services/supabase';

interface TestResult {
  function: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

async function testCreateJob() {
  const startTime = Date.now();
  try {
    console.log('\n🧪 Testing create-job...');
    
    const { data, error } = await supabase.functions.invoke('create-job', {
      body: {
        title: 'Test Job - ' + new Date().toISOString(),
        description: 'This is a test job created by the test script',
        category: 'plumbing',
        location: {
          lat: 40.7128,
          lng: -74.0060,
          text: 'New York, NY'
        },
        estimated_duration: 60,
        budget_range: {
          min: 50,
          max: 100
        }
      }
    });

    if (error) throw error;

    const duration = Date.now() - startTime;
    console.log('✅ create-job passed:', data);
    results.push({
      function: 'create-job',
      status: 'pass',
      message: 'Job created successfully',
      duration
    });
    
    return data.job;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ create-job failed:', error.message);
    results.push({
      function: 'create-job',
      status: 'fail',
      message: error.message,
      duration
    });
    return null;
  }
}

async function testListJobs() {
  const startTime = Date.now();
  try {
    console.log('\n🧪 Testing list-jobs...');
    
    const { data, error } = await supabase.functions.invoke('list-jobs', {
      method: 'GET'
    });

    if (error) throw error;

    const duration = Date.now() - startTime;
    console.log(`✅ list-jobs passed: Found ${data.jobs?.length || 0} jobs`);
    results.push({
      function: 'list-jobs',
      status: 'pass',
      message: `Found ${data.jobs?.length || 0} jobs`,
      duration
    });
    
    return data.jobs;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ list-jobs failed:', error.message);
    results.push({
      function: 'list-jobs',
      status: 'fail',
      message: error.message,
      duration
    });
    return [];
  }
}

async function testExpressInterest(jobId: string) {
  const startTime = Date.now();
  try {
    console.log('\n🧪 Testing express-interest...');
    
    const { data, error } = await supabase.functions.invoke('express-interest', {
      body: { job_id: jobId }
    });

    if (error) throw error;

    const duration = Date.now() - startTime;
    console.log('✅ express-interest passed:', data);
    results.push({
      function: 'express-interest',
      status: 'pass',
      message: 'Interest expressed successfully',
      duration
    });
    
    return data.interest;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ express-interest failed:', error.message);
    results.push({
      function: 'express-interest',
      status: 'fail',
      message: error.message,
      duration
    });
    return null;
  }
}

async function testChooseHero(jobId: string, heroUserId: string) {
  const startTime = Date.now();
  try {
    console.log('\n🧪 Testing choose-hero...');
    
    const { data, error } = await supabase.functions.invoke('choose-hero', {
      body: {
        job_id: jobId,
        hero_user_id: heroUserId
      }
    });

    if (error) throw error;

    const duration = Date.now() - startTime;
    console.log('✅ choose-hero passed:', data);
    results.push({
      function: 'choose-hero',
      status: 'pass',
      message: 'Hero chosen successfully',
      duration
    });
    
    return data.success;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ choose-hero failed:', error.message);
    results.push({
      function: 'choose-hero',
      status: 'fail',
      message: error.message,
      duration
    });
    return false;
  }
}

async function testSendChat(requestId: string) {
  const startTime = Date.now();
  try {
    console.log('\n🧪 Testing send-chat...');
    
    const { data, error } = await supabase.functions.invoke('send-chat', {
      body: {
        request_id: requestId,
        message: 'Test message from edge function test script'
      }
    });

    if (error) throw error;

    const duration = Date.now() - startTime;
    console.log('✅ send-chat passed:', data);
    results.push({
      function: 'send-chat',
      status: 'pass',
      message: 'Message sent successfully',
      duration
    });
    
    return data.message;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ send-chat failed:', error.message);
    results.push({
      function: 'send-chat',
      status: 'fail',
      message: error.message,
      duration
    });
    return null;
  }
}

async function checkAuthentication() {
  console.log('\n🔐 Checking authentication...');
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.error('❌ No active session. Please log in first.');
    console.log('\nTo test edge functions, you need to:');
    console.log('1. Run your app');
    console.log('2. Log in as a user');
    console.log('3. Run this test script again');
    return false;
  }
  
  console.log('✅ Authenticated as:', session.user.email);
  return true;
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  
  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
  
  console.log('\nDetailed Results:');
  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${icon} ${result.function}${duration}: ${result.message}`);
  });
  
  console.log('\n' + '='.repeat(60));
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

async function main() {
  console.log('🚀 Starting Edge Functions Test Suite');
  console.log('='.repeat(60));
  
  // Check authentication first
  const isAuthenticated = await checkAuthentication();
  if (!isAuthenticated) {
    process.exit(1);
  }
  
  // Test create-job
  const createdJob = await testCreateJob();
  
  // Test list-jobs
  const jobs = await testListJobs();
  
  // Test express-interest (only if we have a job)
  if (createdJob?.id) {
    await testExpressInterest(createdJob.id);
  } else {
    console.log('\n⏭️  Skipping express-interest (no job created)');
    results.push({
      function: 'express-interest',
      status: 'skip',
      message: 'No job available to test with'
    });
  }
  
  // Test choose-hero (requires job and hero user)
  // This is complex to test automatically, so we'll skip it
  console.log('\n⏭️  Skipping choose-hero (requires manual setup)');
  results.push({
    function: 'choose-hero',
    status: 'skip',
    message: 'Requires manual testing with specific job and hero'
  });
  
  // Test send-chat (only if we have a job)
  if (createdJob?.id) {
    await testSendChat(createdJob.id);
  } else {
    console.log('\n⏭️  Skipping send-chat (no job created)');
    results.push({
      function: 'send-chat',
      status: 'skip',
      message: 'No request available to test with'
    });
  }
  
  // Print summary
  await printSummary();
}

// Run tests
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
