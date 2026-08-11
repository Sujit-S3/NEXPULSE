export interface SecurityEventLike {
  id?: string;
  type: string;
  outcome: 'success' | 'failure' | 'denied';
  actorId?: string;
  ipAddress?: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface ThreatCandidate {
  ruleId: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  summary: string;
  score: number;
  fingerprint: string;
  eventIds: string[];
  indicators: Record<string, unknown>;
}

function unique(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function detectThreats(events: readonly SecurityEventLike[], now = new Date()): ThreatCandidate[] {
  const candidates: ThreatCandidate[] = [];
  const recent = events.filter((event) => now.getTime() - event.createdAt.getTime() <= 15 * 60_000);
  const authFailures = recent.filter((event) => (
    event.outcome !== 'success' &&
    ['authentication.denied', 'identity.login_failed', 'identity.mfa_failed'].includes(event.type)
  ));
  for (const ip of unique(authFailures.map((event) => event.ipAddress))) {
    const matches = authFailures.filter((event) => event.ipAddress === ip);
    const actors = unique(matches.map((event) => event.actorId));
    if (matches.length >= 10) {
      candidates.push({
        ruleId: actors.length >= 5 ? 'credential-stuffing' : 'brute-force',
        category: 'identity',
        severity: matches.length >= 25 ? 'critical' : 'high',
        title: actors.length >= 5 ? 'Possible credential stuffing campaign' : 'Repeated authentication failures',
        summary: `${matches.length} failed authentication attempts originated from one address within 15 minutes.`,
        score: Math.min(100, 60 + matches.length),
        fingerprint: `${actors.length >= 5 ? 'stuffing' : 'brute'}:${ip}`,
        eventIds: matches.map((event) => event.id).filter((id): id is string => Boolean(id)),
        indicators: { ipAddress: ip, attempts: matches.length, distinctActors: actors.length },
      });
    }
  }

  const replayEvents = recent.filter((event) => (
    ['session.refresh_reuse', 'oauth.token_replay', 'webhook.signature_replay'].includes(event.type)
  ));
  for (const event of replayEvents) {
    candidates.push({
      ruleId: 'token-replay',
      category: 'credential',
      severity: 'critical',
      title: 'Credential replay detected',
      summary: 'A previously consumed or revoked authentication artifact was presented again.',
      score: 95,
      fingerprint: `replay:${event.actorId ?? event.ipAddress ?? event.id ?? 'unknown'}`,
      eventIds: event.id ? [event.id] : [],
      indicators: { actorId: event.actorId, ipAddress: event.ipAddress, eventType: event.type },
    });
  }

  const authorizationDenials = recent.filter((event) => (
    event.type === 'authorization.permission_denied' || event.type === 'policy.deny'
  ));
  for (const actorId of unique(authorizationDenials.map((event) => event.actorId))) {
    const matches = authorizationDenials.filter((event) => event.actorId === actorId);
    if (matches.length >= 8) {
      candidates.push({
        ruleId: 'privilege-probing',
        category: 'authorization',
        severity: 'high',
        title: 'Privilege boundary probing',
        summary: `${matches.length} denied authorization attempts were recorded for one actor.`,
        score: Math.min(90, 55 + matches.length * 2),
        fingerprint: `privilege:${actorId}`,
        eventIds: matches.map((event) => event.id).filter((id): id is string => Boolean(id)),
        indicators: { actorId, deniedRequests: matches.length },
      });
    }
  }
  return candidates;
}
