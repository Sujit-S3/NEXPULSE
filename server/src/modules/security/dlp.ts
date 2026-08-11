import crypto from 'node:crypto';

export type SensitiveDataType =
  | 'email'
  | 'phone'
  | 'payment_card'
  | 'government_id'
  | 'credential'
  | 'private_key';

export interface DlpFinding {
  type: SensitiveDataType;
  severity: 'medium' | 'high' | 'critical';
  path: string;
  fingerprint: string;
  preview: string;
}

const detectors: {
  type: SensitiveDataType;
  severity: DlpFinding['severity'];
  pattern: RegExp;
  valid?: (value: string) => boolean;
}[] = [
  { type: 'private_key', severity: 'critical', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  {
    type: 'credential',
    severity: 'critical',
    pattern: /\b(?:nxk|npt|nxs|nxo)_[A-Za-z0-9_-]{8,64}\.[A-Za-z0-9_-]{20,}\b/g,
  },
  { type: 'credential', severity: 'critical', pattern: /\b(?:sk|api)[-_][A-Za-z0-9_-]{20,}\b/gi },
  { type: 'email', severity: 'medium', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { type: 'phone', severity: 'medium', pattern: /(?<!\d)(?:\+\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}(?!\d)/g },
  { type: 'government_id', severity: 'high', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  {
    type: 'payment_card',
    severity: 'high',
    pattern: /\b(?:\d[ -]*?){13,19}\b/g,
    valid: (value) => luhn(value.replace(/\D/g, '')),
  },
];

function luhn(value: string): boolean {
  if (value.length < 13 || value.length > 19 || /^(\d)\1+$/.test(value)) return false;
  let sum = 0;
  let double = false;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function fingerprint(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 20);
}

function preview(value: string): string {
  if (value.length <= 4) return '****';
  return `${value.slice(0, 2)}${'*'.repeat(Math.min(8, value.length - 4))}${value.slice(-2)}`;
}

function scanText(value: string, path: string): DlpFinding[] {
  const findings: DlpFinding[] = [];
  for (const detector of detectors) {
    detector.pattern.lastIndex = 0;
    for (const match of value.matchAll(detector.pattern)) {
      const candidate = match[0];
      if (detector.valid && !detector.valid(candidate)) continue;
      findings.push({
        type: detector.type,
        severity: detector.severity,
        path,
        fingerprint: fingerprint(candidate),
        preview: preview(candidate),
      });
    }
  }
  return findings;
}

export function inspectSensitiveData(
  input: unknown,
  options: { maxDepth?: number; maxFindings?: number } = {},
): DlpFinding[] {
  const maxDepth = options.maxDepth ?? 8;
  const maxFindings = options.maxFindings ?? 100;
  const findings: DlpFinding[] = [];
  const seen = new WeakSet<object>();

  const visit = (value: unknown, path: string, depth: number) => {
    if (findings.length >= maxFindings || depth > maxDepth || value === null || value === undefined) return;
    if (typeof value === 'string') {
      findings.push(...scanText(value.slice(0, 100_000), path).slice(0, maxFindings - findings.length));
      return;
    }
    if (typeof value !== 'object') return;
    if (seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.slice(0, 1000).forEach((item, index) => visit(item, `${path}[${index}]`, depth + 1));
      return;
    }
    for (const [key, nested] of Object.entries(value).slice(0, 1000)) {
      visit(nested, path ? `${path}.${key}` : key, depth + 1);
    }
  };
  visit(input, '$', 0);
  return findings.slice(0, maxFindings);
}

const secretKey = /password|passwd|secret|token|authorization|cookie|api[-_]?key|private[-_]?key/i;

export function redactSensitiveData(input: unknown, depth = 0): unknown {
  if (depth > 8) return '[TRUNCATED]';
  if (typeof input === 'string') {
    let redacted = input.slice(0, 100_000);
    for (const detector of detectors) {
      detector.pattern.lastIndex = 0;
      redacted = redacted.replace(detector.pattern, (value) => (
        detector.valid && !detector.valid(value) ? value : `[REDACTED:${detector.type}]`
      ));
    }
    return redacted;
  }
  if (Array.isArray(input)) return input.slice(0, 1000).map((value) => redactSensitiveData(value, depth + 1));
  if (!input || typeof input !== 'object') return input;
  return Object.fromEntries(Object.entries(input).slice(0, 1000).map(([key, value]) => [
    key,
    secretKey.test(key) ? '[REDACTED]' : redactSensitiveData(value, depth + 1),
  ]));
}
