#!/usr/bin/env ts-node
/**
 * Fix Duplicate Hero Profiles
 * 
 * This script identifies and removes duplicate hero profiles,
 * keeping only the most recently updated one for each user.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - EXPO_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findDuplicates(table: string) {
  console.log(`\n🔍 Checking for duplicates in ${table}...`);
  
  const { data, error } = await supabase
    .from(table)
    .select('id, created_at, updated_at')
    .order('id');
  
  if (error) {
    console.error(`❌ Error querying ${table}:`, error.message);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.log(`✅ No profiles found in ${table}`);
    return [];
  }
  
  // Group by ID to find duplicates
  const grouped = data.reduce((acc: any, profile: any) => {
    if (!acc[profile.id]) {
      acc[profile.id] = [];
    }
    acc[profile.id].push(profile);
    return acc;
  }, {});
  
  const duplicates = Object.entries(grouped)
    .filter(([_, profiles]: any) => profiles.length > 1)
    .map(([id, profiles]: any) => ({ id, profiles }));
  
  if (duplicates.length === 0) {
    console.log(`✅ No duplicates found in ${table}`);
  } else {
    console.log(`⚠️  Found ${duplicates.length} user(s) with duplicate profiles:`);
    duplicates.forEach(({ id, profiles }) => {
      console.log(`   User ${id}: ${profiles.length} profiles`);
    });
  }
  
  return duplicates;
}

async function cleanupDuplicates(table: string, duplicates: any[]) {
  if (duplicates.length === 0) {
    return;
  }
  
  console.log(`\n🧹 Cleaning up duplicates in ${table}...`);
  
  for (const { id, profiles } of duplicates) {
    // Sort by updated_at descending, keep the most recent
    const sorted = profiles.sort((a: any, b: any) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    
    const toKeep = sorted[0];
    const toDelete = sorted.slice(1);
    
    console.log(`\n   User ${id}:`);
    console.log(`   ✓ Keeping profile updated at: ${toKeep.updated_at}`);
    
    for (const profile of toDelete) {
      console.log(`   ✗ Deleting profile updated at: ${profile.updated_at}`);
      
      // Delete using created_at as a unique identifier
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('created_at', profile.created_at);
      
      if (error) {
        console.error(`   ❌ Error deleting profile: ${error.message}`);
      } else {
        console.log(`   ✅ Deleted successfully`);
      }
    }
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 Duplicate Profile Cleanup Tool');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Check civilian profiles
  const civilianDuplicates = await findDuplicates('civilian_profiles');
  
  // Check hero profiles
  const heroDuplicates = await findDuplicates('hero_profiles');
  
  // Cleanup if duplicates found
  if (civilianDuplicates.length > 0 || heroDuplicates.length > 0) {
    console.log('\n⚠️  Duplicates detected! Starting cleanup...');
    
    await cleanupDuplicates('civilian_profiles', civilianDuplicates);
    await cleanupDuplicates('hero_profiles', heroDuplicates);
    
    console.log('\n✅ Cleanup complete!');
    console.log('\n📋 Verifying results...');
    
    // Verify cleanup
    await findDuplicates('civilian_profiles');
    await findDuplicates('hero_profiles');
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ All done!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);
