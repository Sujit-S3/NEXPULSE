import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const lockfiles = ['package-lock.json', 'client/package-lock.json', 'server/package-lock.json'];
const components = new Map();
const prohibitedLicenses = new Set(['AGPL-3.0', 'AGPL-3.0-only', 'SSPL-1.0']);

for (const lockfile of lockfiles) {
  const absolute = path.join(root, lockfile);
  if (!fs.existsSync(absolute)) continue;
  const lock = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  for (const [packagePath, value] of Object.entries(lock.packages ?? {})) {
    if (!packagePath || !packagePath.includes('node_modules/') || !value.version) continue;
    const name = packagePath.slice(packagePath.lastIndexOf('node_modules/') + 'node_modules/'.length);
    const key = `${name}@${value.version}`;
    if (components.has(key)) continue;
    components.set(key, {
      type: 'library',
      'bom-ref': `pkg:npm/${encodeURIComponent(name)}@${value.version}`,
      name,
      version: value.version,
      purl: `pkg:npm/${encodeURIComponent(name)}@${value.version}`,
      licenses: value.license ? [{ license: { id: value.license } }] : undefined,
      hashes: value.integrity ? [{
        alg: value.integrity.startsWith('sha512-') ? 'SHA-512' : 'SHA-1',
        content: value.integrity.split('-')[1],
      }] : undefined,
      properties: [{ name: 'nexpulse:source-lockfile', value: lockfile }],
    });
  }
}

const prohibited = [...components.values()].filter((component) => (
  component.licenses?.some((entry) => prohibitedLicenses.has(entry.license.id))
));
const timestamp = new Date().toISOString();
const serial = crypto.randomUUID();
const sbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  serialNumber: `urn:uuid:${serial}`,
  version: 1,
  metadata: {
    timestamp,
    tools: [{ vendor: 'NEXPULSE', name: 'security-sbom-generator', version: '1.0.0' }],
    component: { type: 'application', name: 'nexpulse-ai', version: '0.1.0' },
  },
  components: [...components.values()],
};
const outputDirectory = path.join(root, 'artifacts');
fs.mkdirSync(outputDirectory, { recursive: true });
const output = path.join(outputDirectory, 'nexpulse-sbom.cdx.json');
fs.writeFileSync(output, `${JSON.stringify(sbom, null, 2)}\n`);

console.log(`CycloneDX SBOM generated with ${components.size} components at ${path.relative(root, output)}.`);
if (prohibited.length) {
  console.error(`License policy failed: ${prohibited.map((component) => `${component.name}@${component.version}`).join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('License policy passed: no AGPL or SSPL packages declared by lockfiles.');
}
