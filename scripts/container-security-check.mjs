import fs from 'node:fs';

const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
const failures = [];
if (/FROM\s+\S+:latest\b/i.test(dockerfile)) failures.push('Base images must not use the latest tag.');
if (!/HEALTHCHECK\b/i.test(dockerfile)) failures.push('Server image must declare a health check.');
for (const stage of ['server', 'client']) {
  const block = dockerfile.match(new RegExp(`FROM[^\\n]+ AS ${stage}\\r?\\n([\\s\\S]*?)(?=\\r?\\nFROM|$)`, 'i'))?.[1] ?? '';
  if (!/\bUSER\s+\S+/i.test(block)) failures.push(`${stage} production stage must run as a non-root user.`);
}
if (/COPY\s+\.\s+\./i.test(dockerfile)) failures.push('Production builds must use explicit copy boundaries.');

if (failures.length) {
  console.error('Container security policy failed:');
  failures.forEach((failure) => console.error(`  ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Container security policy passed: pinned tags, non-root runtimes, health check, explicit copy boundaries.');
}
