import { readdir, rm, rmdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const publicDirectory = path.join(root, 'client', 'public');
const legacyExportDirectory = path.join(root, 'logo-exports');
const prune = process.argv.includes('--prune');

const canonicalAssets = new Set([
  'branding/main-light.png',
  'branding/main-dark.png',
  'branding/ai-assistant.png',
  'manifest.json',
  'robots.txt',
]);

const legacyDirectories = [
  path.join(publicDirectory, 'logos'),
  legacyExportDirectory,
];

const legacyTopLevelAssets = [
  'ai-assistant-icon.svg',
  'app-icon-1024.png',
  'app-icon-1024.svg',
  'apple-touch-icon.png',
  'favicon.png',
  'favicon.ico',
  'favicon.svg',
  'index.html',
  'loading-logo-4k.png',
  'loading-logo-4k.svg',
  'logo-dark.svg',
  'logo-light.svg',
  'logo-outline.svg',
  'logo-preview.html',
  'logo-primary.svg',
  'nexpulse-ai-icon.png',
  'nexpulse-ai-icon.svg',
  'nexpulse-ai-logo-4k.png',
  'nexpulse-ai-logo-4k.svg',
  'sidebar-icon.svg',
  'social-preview.png',
].map((name) => path.join(publicDirectory, name));

const legacyScripts = [
  'export-brand-logos.mjs',
  'generate-brand-identity.mjs',
  'restore-original-logos.mjs',
].map((name) => path.join(root, 'scripts', name));

function inside(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function exists(candidate) {
  try {
    await stat(candidate);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(candidate));
    if (entry.isFile()) files.push(candidate);
  }
  return files;
}

async function emptyDirectories(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    await emptyDirectories(path.join(directory, entry.name));
  }
  await rmdir(directory);
}

async function pruneLegacyAssets() {
  const targets = [];
  for (const directory of legacyDirectories) {
    if (await exists(directory)) targets.push(...await filesBelow(directory));
  }
  for (const candidate of [...legacyTopLevelAssets, ...legacyScripts]) {
    if (await exists(candidate)) targets.push(candidate);
  }

  let bytes = 0;
  for (const target of targets) {
    const safe = inside(target, publicDirectory)
      || inside(target, legacyExportDirectory)
      || inside(target, path.join(root, 'scripts'));
    if (!safe) throw new Error(`Refusing to remove a file outside verified directories: ${target}`);
    bytes += (await stat(target)).size;
    await rm(target);
  }
  for (const directory of legacyDirectories) {
    if (await exists(directory)) await emptyDirectories(directory);
  }

  console.log(`Removed ${targets.length} verified legacy files (${(bytes / 1024 / 1024).toFixed(2)} MB).`);
}

if (prune) await pruneLegacyAssets();

const allPublicFiles = (await filesBelow(publicDirectory))
  .map((full) => path.relative(publicDirectory, full).replace(/\\/g, '/'));
const unexpected = allPublicFiles.filter((rel) => !canonicalAssets.has(rel));
if (await exists(legacyExportDirectory)) unexpected.push('logo-exports/');
const missing = [];
for (const asset of canonicalAssets) {
  if (!await exists(path.join(publicDirectory, asset))) missing.push(asset);
}

if (unexpected.length > 0 || missing.length > 0) {
  if (unexpected.length > 0) console.error(`Unexpected public assets: ${unexpected.join(', ')}`);
  if (missing.length > 0) console.error(`Missing canonical brand assets: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Brand assets verified: ${canonicalAssets.size} canonical sixth-logo files.`);
