import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoots = ['client/src', 'server/src', 'scripts'];
const rules = [
  { id: 'dynamic-eval', severity: 'critical', pattern: /\beval\s*\(/ },
  { id: 'dynamic-function', severity: 'high', pattern: /\bnew\s+Function\s*\(/ },
  { id: 'unsafe-html', severity: 'high', pattern: /\bdangerouslySetInnerHTML\b/ },
  { id: 'tls-verification-disabled', severity: 'critical', pattern: /rejectUnauthorized\s*:\s*false/ },
  { id: 'mongoose-where', severity: 'high', pattern: /\$where\s*:/ },
  { id: 'shell-execution', severity: 'high', pattern: /\bexecSync?\s*\(|\bshell\s*:\s*true/ },
];

function sourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return /\.(?:c?m?js|jsx|ts|tsx)$/.test(entry.name) ? [absolute] : [];
  });
}

const findings = [];
for (const sourceRoot of sourceRoots) {
  for (const file of sourceFiles(path.join(root, sourceRoot))) {
    if (path.basename(file) === 'security-static-scan.mjs') continue;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (line.includes('security-scan:allow')) return;
      for (const rule of rules) {
        if (rule.pattern.test(line)) {
          findings.push({
            file: path.relative(root, file).replaceAll('\\', '/'),
            line: index + 1,
            ...rule,
          });
        }
      }
    });
  }
}

if (findings.length) {
  console.error(`Static security scan found ${findings.length} blocking pattern(s):`);
  findings.forEach((finding) => console.error(`  ${finding.severity} ${finding.id} ${finding.file}:${finding.line}`));
  process.exitCode = 1;
} else {
  console.log('Static security scan passed: no blocking source patterns detected.');
}
