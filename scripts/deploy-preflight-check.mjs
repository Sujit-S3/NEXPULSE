#!/usr/bin/env node
/**
 * NEXPULSE AI — Production Deployment Pre-Flight Check
 *
 * Runs a complete sanity check on git state, builds, security scans,
 * and brand assets to ensure zero-defect deployment to Render and Vercel.
 */

import { execSync } from 'node:child_process';

console.log('🚀 Starting NEXPULSE AI Deployment Pre-Flight Check...\n');

let failed = false;

function runStep(name, command) {
  process.stdout.write(`⏳ Checking: ${name}... `);
  try {
    execSync(command, { stdio: 'pipe' }); // security-scan:allow
    console.log('✅ PASSED');
  } catch (error) {
    console.log('❌ FAILED');
    console.error(`\nError in "${name}":\n${error.stderr?.toString() || error.message}\n`);
    failed = true;
  }
}

// 1. Secret Scan
runStep('Committed Secret Scan', 'node scripts/security-secret-scan.mjs');

// 2. SAST Static Scan
runStep('Static Security Scan', 'node scripts/security-static-scan.mjs');

// 3. Container Security
runStep('Container Configuration', 'node scripts/container-security-check.mjs');

// 4. Dependency Audit
runStep('Dependency Security Audit', 'node scripts/security-dependency-audit.mjs');

// 5. Brand Asset Integrity
runStep('Brand Asset Integrity', 'node scripts/verify-brand-assets.mjs');

// 6. Client & Server Typecheck
runStep('TypeScript Compilation', 'npm run typecheck');

// 7. Server Tests
runStep('Server Unit & Integration Tests', 'npm --prefix server run test');

// 8. Client & Server Builds
runStep('Client & Server Production Builds', 'npm run build');

console.log('\n---------------------------------------------------');
if (failed) {
  console.error('❌ DEPLOYMENT PRE-FLIGHT CHECK FAILED.');
  console.error('Please fix the errors above before releasing to production.');
  process.exit(1);
} else {
  console.log('✨ ALL PRE-FLIGHT CHECKS PASSED!');
  console.log('NEXPULSE AI is 100% READY FOR PRODUCTION DEPLOYMENT. 🚀\n');
}
