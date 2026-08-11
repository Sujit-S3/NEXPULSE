import { config } from '../config/env.js';
import { getConfigurationReadiness } from '../operations/readiness.js';

const strict = process.argv.includes('--strict') || config.env === 'production';
const checks = getConfigurationReadiness();

console.log(`NEXPULSE configuration validation (${config.env}${strict ? ', strict' : ''})`);
for (const check of checks) {
  const state = !check.enabled ? 'DISABLED' : check.ready ? 'READY' : check.required || strict ? 'BLOCKED' : 'WARNING';
  console.log(`  ${state.padEnd(8)} ${check.id}: ${check.message}`);
}

const failures = checks.filter((check) => check.enabled && !check.ready && (check.required || strict));
if (failures.length > 0) {
  console.error(`Configuration validation failed: ${failures.map((check) => check.id).join(', ')}`);
  process.exit(1);
}

console.log('Configuration validation passed.');
