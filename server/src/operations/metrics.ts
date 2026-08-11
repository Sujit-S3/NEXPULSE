import type { NextFunction, Request, Response } from 'express';
import type { RuntimeReadiness } from './readiness.js';

let requestsTotal = 0;
let errorsTotal = 0;
let durationSecondsTotal = 0;

export function recordRequestMetrics(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startedAt = process.hrtime.bigint();
  res.once('finish', () => {
    requestsTotal += 1;
    if (res.statusCode >= 500) errorsTotal += 1;
    durationSecondsTotal += Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
  });
  next();
}

function gauge(value: boolean): number {
  return value ? 1 : 0;
}

export function renderMetrics(readiness: RuntimeReadiness): string {
  const memory = process.memoryUsage();
  const lines = [
    '# HELP nexpulse_up Whether the API process is running.',
    '# TYPE nexpulse_up gauge',
    'nexpulse_up 1',
    '# HELP nexpulse_ready Whether all required runtime checks pass.',
    '# TYPE nexpulse_ready gauge',
    `nexpulse_ready ${gauge(readiness.ready)}`,
    '# HELP nexpulse_http_requests_total Total completed HTTP requests.',
    '# TYPE nexpulse_http_requests_total counter',
    `nexpulse_http_requests_total ${requestsTotal}`,
    '# HELP nexpulse_http_errors_total Total completed HTTP responses with status 500 or above.',
    '# TYPE nexpulse_http_errors_total counter',
    `nexpulse_http_errors_total ${errorsTotal}`,
    '# HELP nexpulse_http_request_duration_seconds_sum Cumulative HTTP request duration.',
    '# TYPE nexpulse_http_request_duration_seconds_sum counter',
    `nexpulse_http_request_duration_seconds_sum ${durationSecondsTotal.toFixed(6)}`,
    '# HELP nexpulse_process_uptime_seconds API process uptime.',
    '# TYPE nexpulse_process_uptime_seconds gauge',
    `nexpulse_process_uptime_seconds ${process.uptime().toFixed(3)}`,
    '# HELP nexpulse_process_resident_memory_bytes Resident memory used by the API process.',
    '# TYPE nexpulse_process_resident_memory_bytes gauge',
    `nexpulse_process_resident_memory_bytes ${memory.rss}`,
  ];

  for (const check of readiness.checks) {
    lines.push(
      `nexpulse_readiness_check{check="${check.id}",required="${String(check.required)}"} ${gauge(check.ready)}`,
    );
  }

  return `${lines.join('\n')}\n`;
}

export function resetMetricsForTests(): void {
  requestsTotal = 0;
  errorsTotal = 0;
  durationSecondsTotal = 0;
}
