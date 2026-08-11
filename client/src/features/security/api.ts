import type {
  ComplianceFramework,
  DataAsset,
  ManagedSecret,
  SecurityDashboard,
  SecurityIncident,
  SecurityPolicy,
  ThreatSignal,
} from "./types";
import api from "../../lib/axios";
import type { ApiResponse } from "../../types";

async function data<T>(request: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  return (await request).data.data;
}

export const securityApi = {
  dashboard: () => data<SecurityDashboard>(api.get("/api/v1/security/dashboard")),

  policies: () => data<SecurityPolicy[]>(api.get("/api/v1/security/policies")),
  createPolicy: (input: {
    name: string;
    description?: string;
    target: SecurityPolicy["target"];
    actionPattern: string;
    resourcePattern: string;
    effect: SecurityPolicy["effect"];
    conditions: SecurityPolicy["conditions"];
    priority: number;
    status: SecurityPolicy["status"];
  }) => data<SecurityPolicy>(api.post("/api/v1/security/policies", input)),
  updatePolicy: (policy: SecurityPolicy, changes: Partial<SecurityPolicy>, changeReason: string) =>
    data<SecurityPolicy>(api.patch(`/api/v1/security/policies/${encodeURIComponent(policy.id)}`, {
      expectedVersion: policy.version,
      changeReason,
      changes,
    })),

  secrets: () => data<ManagedSecret[]>(api.get("/api/v1/security/secrets")),
  createSecret: (input: {
    name: string;
    purpose: string;
    scope: ManagedSecret["scope"];
    value?: string;
    rotateEveryDays: number;
  }) => data<{ secret: ManagedSecret; generatedValue?: string }>(api.post("/api/v1/security/secrets", input)),
  rotateSecret: (id: string) => data<{ secret: ManagedSecret; generatedValue?: string }>(
    api.post(`/api/v1/security/secrets/${encodeURIComponent(id)}/rotate`, {}),
  ),
  revokeSecret: (id: string) => api.delete(`/api/v1/security/secrets/${encodeURIComponent(id)}`),

  assets: () => data<DataAsset[]>(api.get("/api/v1/security/governance/assets")),
  createAsset: (input: {
    name: string;
    system: string;
    classification: DataAsset["classification"];
    categories: string[];
    retentionDays: number;
    legalHold: boolean;
    residencyRegion?: string;
  }) => data<DataAsset>(api.post("/api/v1/security/governance/assets", input)),
  queueAssetDeletion: (id: string) => data<DataAsset>(
    api.post(`/api/v1/security/governance/assets/${encodeURIComponent(id)}/deletion`, {}),
  ),

  compliance: () => data<ComplianceFramework[]>(api.get("/api/v1/security/compliance")),
  collectCompliance: () => data<unknown[]>(api.post("/api/v1/security/compliance/collect", {})),

  threats: () => data<ThreatSignal[]>(api.get("/api/v1/security/threats")),
  evaluateThreats: () => data<{ detections: number }>(api.post("/api/v1/security/threats/evaluate", {})),
  updateThreat: (id: string, status: "investigating" | "contained" | "dismissed") =>
    data<ThreatSignal>(api.patch(`/api/v1/security/threats/${encodeURIComponent(id)}`, { status })),

  incidents: () => data<SecurityIncident[]>(api.get("/api/v1/security/incidents")),
  createIncident: (input: {
    title: string;
    summary: string;
    severity: SecurityIncident["severity"];
    signalIds: string[];
  }) => data<SecurityIncident>(api.post("/api/v1/security/incidents", input)),
  transitionIncident: (id: string, status: "investigating" | "contained" | "resolved" | "postmortem") =>
    data<SecurityIncident>(api.patch(`/api/v1/security/incidents/${encodeURIComponent(id)}`, { status })),
  containIncident: (id: string, action: "mark_contained" | "revoke_actor_sessions" | "revoke_workspace_credentials") =>
    data<SecurityIncident>(api.post(`/api/v1/security/incidents/${encodeURIComponent(id)}/contain`, { action })),
};
