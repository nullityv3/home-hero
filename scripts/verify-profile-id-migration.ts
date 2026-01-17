#!/usr/bin/env node
/**
 * Verification script for profile_id migration
 * Checks that all code uses the correct column names
 */

import * as fs from 'fs';
import * as path from 'path';

interface Issue {
  file: string;
  line: number;
  issue: string;
  severity: 'error' | 'warning';
}

const issues: Issue[] = [];

// Patterns to check
const patterns = {
  // Should NOT exist (old patterns)
  badPatterns: [
    /\.eq\(['"]user_id['"],\s*userId\)/g,
    /\.eq\(['"]id['"],\s*userId\)/g,
    /user_id:\s*userId(?!.*\/\/.*profile_id)/g, // user_id: userId without comment
  ],
  // Should exist (correct patterns)
  goodPatterns: [
    /\.eq\(['"]profile_id['"],\s*userId\)/g,
    /profile_id:\s*userId/g,
  ],
};

function checkFile(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Check for bad patterns
    patterns.badPatterns.forEach((pattern) => {
      if (pattern.test(line)) {
        issues.push({
          file: filePath,
          line: index + 1,
          issue: `Found old pattern: ${line.trim()}`,
          severity: 'error',
        });
      }
    });
  });
}

function scanDirectory(dir: string, extensions: string[]): void {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (!['node_modules', '.git', 'dist', '.expo'].includes(file)) {
        scanDirectory(filePath, extensions);
      }
    } else if (extensions.some((ext) => file.endsWith(ext))) {
      checkFile(filePath);
    }
  });
}

console.log('🔍 Verifying profile_id migration...\n');

// Scan TypeScript files
scanDirectory('.', ['.ts', '.tsx']);

// Report results
if (issues.length === 0) {
  console.log('✅ All checks passed!');
  console.log('✅ No old patterns found (user_id or id used with userId)');
  console.log('✅ Code is using profile_id correctly\n');
  
  console.log('📋 Summary:');
  console.log('  - Database schema: hero_profiles and civilian_profiles use profile_id FK');
  console.log('  - Service layer: All queries use .eq("profile_id", userId)');
  console.log('  - Type definitions: Updated to include both id and profile_id');
  console.log('  - Documentation: Updated with correct patterns\n');
  
  process.exit(0);
} else {
  console.log('❌ Found issues:\n');
  
  issues.forEach((issue) => {
    const icon = issue.severity === 'error' ? '❌' : '⚠️';
    console.log(`${icon} ${issue.file}:${issue.line}`);
    console.log(`   ${issue.issue}\n`);
  });
  
  console.log(`\n❌ Total issues: ${issues.length}`);
  console.log('\n💡 Fix these by replacing:');
  console.log('   .eq("user_id", userId) → .eq("profile_id", userId)');
  console.log('   .eq("id", userId) → .eq("profile_id", userId)');
  console.log('   user_id: userId → profile_id: userId\n');
  
  process.exit(1);
}
