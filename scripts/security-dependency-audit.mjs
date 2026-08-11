import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error('Run dependency policy through npm run security:dependencies.');
  process.exit(1);
}
const targets = [
  { name: 'root', directory: root },
  { name: 'client', directory: path.join(root, 'client') },
  { name: 'server', directory: path.join(root, 'server') },
];

const acceptedAdvisories = new Map([
  [
    'https://github.com/advisories/GHSA-qwww-vcr4-c8h2',
    'React Router RSC action processing is not reachable in this BrowserRouter-only SPA.',
  ],
]);

function isVerifiedSpa() {
  const main = readFileSync(path.join(root, 'client', 'src', 'main.tsx'), 'utf8');
  const authApp = readFileSync(path.join(root, 'client', 'src', 'AuthenticatedApplication.tsx'), 'utf8');
  const serverPackage = JSON.parse(readFileSync(path.join(root, 'server', 'package.json'), 'utf8'));
  return main.includes('createRoot(')
    && authApp.includes('<BrowserRouter>')
    && !serverPackage.dependencies?.['react-router']
    && !serverPackage.dependencies?.['react-router-dom'];
}

let failed = false;
for (const target of targets) {
  const result = spawnSync(process.execPath, [npmCli, 'audit', '--omit=dev', '--json'], {
    cwd: target.directory,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    shell: false,
  });

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    console.error(`${target.name}: npm audit did not return valid JSON.`);
    if (result.stderr) console.error(result.stderr.trim());
    failed = true;
    continue;
  }

  const blocking = Object.entries(report.vulnerabilities ?? {})
    .filter(([, vulnerability]) => ['high', 'critical'].includes(vulnerability.severity));
  if (blocking.length === 0) {
    console.log(`${target.name}: no high or critical dependency advisories.`);
    continue;
  }

  const advisoryUrls = blocking.flatMap(([, vulnerability]) =>
    (vulnerability.via ?? [])
      .filter((via) => typeof via === 'object' && via.url)
      .map((via) => via.url),
  );
  const packages = blocking.map(([name]) => name);
  const acceptedRscOnlyFinding = target.name === 'client'
    && isVerifiedSpa()
    && packages.every((name) => name === 'react-router' || name === 'react-router-dom')
    && advisoryUrls.length > 0
    && advisoryUrls.every((url) => acceptedAdvisories.has(url));

  if (acceptedRscOnlyFinding) {
    for (const url of new Set(advisoryUrls)) {
      console.warn(`${target.name}: accepted non-reachable advisory ${url} — ${acceptedAdvisories.get(url)}`);
    }
    continue;
  }

  failed = true;
  console.error(`${target.name}: blocking dependency advisories found in ${packages.join(', ')}.`);
  for (const url of new Set(advisoryUrls)) console.error(`  ${url}`);
}

if (failed) process.exit(1);
console.log('Production dependency security policy passed.');
