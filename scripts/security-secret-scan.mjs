import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const excludedDirectories = new Set([
  '.git', '.codex', 'node_modules', 'dist', 'build', 'coverage', 'artifacts', 'logo-exports',
]);
const excludedFiles = new Set([
  '.env', '.env.local', '.env.production', 'security-secret-scan.mjs',
]);
const textExtensions = new Set([
  '.cjs', '.css', '.env', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.ps1', '.py',
  '.sh', '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);
const signatures = [
  { name: 'private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', pattern: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{30,}\b/ },
  { name: 'OpenAI key', pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/ },
  { name: 'NEXPULSE credential', pattern: /\b(?:nxk|npt|nxs|nxo)_[A-Za-z0-9_-]{8,64}\.[A-Za-z0-9_-]{20,}\b/ },
  {
    name: 'hard-coded secret assignment',
    pattern: /\b(?:password|passwd|api[_-]?key|client[_-]?secret|access[_-]?token)\b\s*[:=]\s*["'][^"'$\s]{20,}["']/i,
  },
];
const placeholder = /replace|example|placeholder|dummy|sample|test[-_]|your[-_<{]|not-for-logs/i;

function files(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...files(absolute));
    else if (!excludedFiles.has(entry.name) && textExtensions.has(path.extname(entry.name).toLowerCase())) result.push(absolute);
  }
  return result;
}

const findings = [];
for (const file of files(root)) {
  if (fs.statSync(file).size > 2_000_000) continue;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes('secret-scan:allow') || placeholder.test(line)) return;
    for (const signature of signatures) {
      if (signature.pattern.test(line)) {
        findings.push({
          file: path.relative(root, file).replaceAll('\\', '/'),
          line: index + 1,
          type: signature.name,
        });
      }
    }
  });
}

if (findings.length) {
  console.error(`Secret scan failed with ${findings.length} potential credential exposure(s):`);
  findings.forEach((finding) => console.error(`  ${finding.file}:${finding.line} ${finding.type}`));
  process.exitCode = 1;
} else {
  console.log('Secret scan passed: no committed credential signatures detected.');
}
