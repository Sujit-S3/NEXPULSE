import { config } from '../config/env.js';
import { logger } from '../logger/index.js';
import { getRuntimeReadiness, type RuntimeReadiness } from './readiness.js';

let previousState: RuntimeReadiness['state'] | undefined;
let lastAlertAt = 0;

async function sendAlert(readiness: RuntimeReadiness): Promise<void> {
  const webhookUrl = config.operations.alertWebhookUrl;
  if (!webhookUrl) return;

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'NEXPULSE-Operations/1.0',
    },
    body: JSON.stringify({
      service: config.app.name,
      environment: config.env,
      state: readiness.state,
      ready: readiness.ready,
      checkedAt: readiness.checkedAt,
      failingChecks: readiness.checks
        .filter((check) => check.enabled && !check.ready)
        .map((check) => ({ id: check.id, required: check.required, message: check.message })),
    }),
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) {
    throw new Error(`Alert webhook returned HTTP ${response.status}`);
  }
}

export async function runOperationsCheck(): Promise<RuntimeReadiness> {
  const readiness = getRuntimeReadiness();
  const now = Date.now();
  const stateChanged = readiness.state !== previousState;
  const cooldownElapsed = now - lastAlertAt >= config.operations.alertCooldownMs;

  if (readiness.state === 'ready') {
    logger.info('Operational readiness check passed', { state: readiness.state });
  } else {
    logger.warn('Operational readiness check detected unavailable integrations', {
      state: readiness.state,
      failingChecks: readiness.checks
        .filter((check) => check.enabled && !check.ready)
        .map((check) => check.id),
    });
  }

  if (stateChanged || (readiness.state !== 'ready' && cooldownElapsed)) {
    try {
      await sendAlert(readiness);
      if (config.operations.alertWebhookUrl) lastAlertAt = now;
    } catch (error) {
      logger.error('Operational alert delivery failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  previousState = readiness.state;
  return readiness;
}

export function startOperationsMonitor(): () => void {
  if (!config.operations.monitorEnabled) {
    logger.info('Operational readiness monitor is disabled');
    return () => undefined;
  }

  void runOperationsCheck();
  const interval = setInterval(() => {
    void runOperationsCheck();
  }, config.operations.checkIntervalMs);
  interval.unref();

  logger.info('Operational readiness monitor started', {
    intervalMs: config.operations.checkIntervalMs,
    webhookAlerts: Boolean(config.operations.alertWebhookUrl),
  });
  return () => clearInterval(interval);
}
