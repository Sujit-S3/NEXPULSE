export type PolicyTarget = "access" | "resource" | "api" | "workspace" | "organization" | "automation" | "ai";
export type Severity = "low" | "medium" | "high" | "critical";

export interface SecurityDashboard {
  postureScore: number;
  generatedAt: string;
  metrics: {
    policies: number;
    enforcedPolicies: number;
    secrets: number;
    rotationDue: number;
    assets: number;
    restrictedAssets: number;
    openThreats: number;
    criticalThreats: number;
    activeIncidents: number;
    deniedDecisions24h: number;
  };
  compliance: {
    frameworks: ComplianceFramework[];
    totals: { controls: number; passing: number; attention: number; failing: number };
  };
  recentEvents: {
    id: string;
    type: string;
    outcome: "success" | "failure" | "denied";
    actorType: string;
    createdAt: string;
    metadata: Record<string, unknown>;
  }[];
}

export interface ComplianceFramework {
  framework: "SOC2" | "ISO27001" | "GDPR" | "CCPA" | "HIPAA";
  controls: number;
  passing: number;
  attention: number;
  failing: number;
  collectedAt?: string;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description?: string;
  target: PolicyTarget;
  actionPattern: string;
  resourcePattern: string;
  effect: "allow" | "deny" | "step_up";
  conditions: {
    roles?: string[];
    actorTypes?: ("user" | "service_account")[];
    requireMfa?: boolean;
    maxRiskScore?: number;
    allowedCountries?: string[];
    ipAllowlist?: string[];
  };
  priority: number;
  status: "draft" | "enforced" | "disabled";
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedSecret {
  id: string;
  name: string;
  purpose: string;
  scope: "workspace" | "integration" | "automation" | "ai_provider";
  status: "active" | "rotation_due" | "expired" | "revoked";
  currentVersion: number;
  rotateEveryDays: number;
  lastRotatedAt: string;
  rotationDueAt: string;
  expiresAt?: string;
  createdAt: string;
}

export interface DataAsset {
  id: string;
  name: string;
  system: string;
  description?: string;
  ownerId: string;
  classification: "public" | "internal" | "confidential" | "restricted";
  categories: string[];
  retentionDays: number;
  legalHold: boolean;
  residencyRegion?: string;
  upstreamAssets: string[];
  lifecycleStatus: "active" | "archived" | "deletion_queued" | "deleted";
  createdAt?: string;
  updatedAt?: string;
}

export interface ThreatSignal {
  id: string;
  ruleId: string;
  category: string;
  severity: Severity;
  status: "open" | "investigating" | "contained" | "dismissed";
  title: string;
  summary: string;
  score: number;
  fingerprint: string;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt?: string;
}

export interface SecurityIncident {
  id: string;
  title: string;
  summary: string;
  severity: Severity;
  status: "open" | "investigating" | "contained" | "resolved" | "postmortem";
  signalIds: string[];
  assignedTo?: string;
  timeline: { at: string; actorId: string; action: string; note?: string }[];
  containmentActions: { action: string; status: "pending" | "completed" | "failed"; executedAt?: string }[];
  detectedAt: string;
  containedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
