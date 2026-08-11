import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const backupDirectory = path.join(root, 'artifacts', 'backups');
const retentionDays = Number.parseInt(process.env.BACKUP_RETENTION_DAYS ?? '14', 10);
const mongoUri = process.env.MONGO_BACKUP_URI;
const passphrase = process.env.BACKUP_ENCRYPTION_PASSPHRASE;
const checkOnly = process.argv.includes('--check');

function requireConfiguration() {
  const missing = [];
  if (!mongoUri) missing.push('MONGO_BACKUP_URI');
  if (!passphrase || passphrase.length < 24) missing.push('BACKUP_ENCRYPTION_PASSPHRASE (24+ characters)');
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 365) {
    missing.push('BACKUP_RETENTION_DAYS (integer from 1 to 365)');
  }
  if (missing.length > 0) {
    throw new Error(`Backup configuration is incomplete: ${missing.join(', ')}`);
  }
}

function requireCommand(command) {
  const result = spawnSync(command, ['--version'], { stdio: 'ignore', shell: false });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} is required for database backups`);
  }
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      ...options,
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code ?? 'unknown'}`));
    });
  });
}

async function removeExpiredBackups() {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const entries = await readdir(backupDirectory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.archive.gz.enc')) continue;
    const target = path.resolve(backupDirectory, entry.name);
    if (path.dirname(target) !== path.resolve(backupDirectory)) continue;
    const metadata = await stat(target);
    if (metadata.mtimeMs < cutoff) await rm(target);
  }
}

requireConfiguration();
requireCommand('mongodump');
requireCommand('openssl');

if (checkOnly) {
  console.log('Encrypted backup prerequisites are ready.');
  process.exit(0);
}

await mkdir(backupDirectory, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const archive = path.join(backupDirectory, `nexpulse-${timestamp}.archive.gz`);
const encryptedArchive = `${archive}.enc`;

try {
  await run('mongodump', [`--uri=${mongoUri}`, `--archive=${archive}`, '--gzip']);
  await run(
    'openssl',
    [
      'enc',
      '-aes-256-cbc',
      '-salt',
      '-pbkdf2',
      '-iter',
      '200000',
      '-in',
      archive,
      '-out',
      encryptedArchive,
      '-pass',
      'env:BACKUP_ENCRYPTION_PASSPHRASE',
    ],
    { env: process.env },
  );
} finally {
  if (path.dirname(path.resolve(archive)) === path.resolve(backupDirectory)) {
    await rm(archive, { force: true });
  }
}

await removeExpiredBackups();
console.log(`Encrypted database backup created: ${path.relative(root, encryptedArchive)}`);
