import type { BillingSubscriptionStatus } from './types.js';

const terminal = new Set<BillingSubscriptionStatus>(['cancelled', 'completed', 'expired']);

export function shouldApplySubscriptionEvent(input: {
  currentStatus: BillingSubscriptionStatus;
  lastEventAt?: Date;
  incomingStatus: BillingSubscriptionStatus;
  incomingEventAt: Date;
}): boolean {
  if (terminal.has(input.currentStatus) && input.currentStatus !== input.incomingStatus) {
    return false;
  }
  if (input.lastEventAt && input.lastEventAt >= input.incomingEventAt) {
    return false;
  }
  return true;
}
