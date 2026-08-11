import { config } from '../../config/env.js';
import { API_LIFECYCLE, EVENT_CATALOG, PUBLIC_API_SCOPES } from './catalog.js';

const secured = [{ bearerAuth: [] }, { apiKeyAuth: [] }];

export function openApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'NEXPULSE AI Public API',
      version: '1.0.0',
      summary: 'Versioned APIs for analytics, AI, collaboration, automation, and platform extensibility.',
      description: `Current version: ${API_LIFECYCLE.current}. Breaking-version sunset notice: ${API_LIFECYCLE.sunsetNoticeDays} days.`,
      contact: { name: 'NEXPULSE Developer Platform' },
    },
    servers: [{ url: `${config.app.url}/api/v1`, description: 'Current API' }],
    tags: [
      { name: 'Organizations' }, { name: 'Users' }, { name: 'Workspaces' },
      { name: 'Analytics' }, { name: 'Reports' }, { name: 'Dashboards' },
      { name: 'AI' }, { name: 'Connections' }, { name: 'Developer Apps' },
      { name: 'Webhooks' }, { name: 'Marketplace' },
      { name: 'Security' }, { name: 'Governance' }, { name: 'Compliance' },
      { name: 'Billing' },
    ],
    paths: {
      '/organizations/current': {
        get: { tags: ['Organizations'], summary: 'Get the active organization', security: secured, responses: standardResponses('Organization') },
      },
      '/users': {
        get: { tags: ['Users'], summary: 'List users in the active workspace', security: secured, responses: standardResponses('UserList') },
      },
      '/workspaces': {
        get: { tags: ['Workspaces'], summary: 'List accessible workspaces', security: secured, responses: standardResponses('WorkspaceList') },
      },
      '/analytics': {
        get: { tags: ['Analytics'], summary: 'Read normalized analytics', security: secured, parameters: dateRangeParameters, responses: standardResponses('Analytics') },
      },
      '/reports': {
        get: { tags: ['Reports'], summary: 'List reports', security: secured, responses: standardResponses('ReportList') },
        post: { tags: ['Reports'], summary: 'Generate a report', security: secured, responses: standardResponses('Report', 201) },
      },
      '/dashboard': {
        get: { tags: ['Dashboards'], summary: 'Read the active dashboard', security: secured, responses: standardResponses('Dashboard') },
      },
      '/ai/chat': {
        post: { tags: ['AI'], summary: 'Create an AI response', security: secured, responses: standardResponses('AIResponse', 201) },
      },
      '/platforms/connections': {
        get: { tags: ['Connections'], summary: 'List platform connections', security: secured, responses: standardResponses('ConnectionList') },
      },
      '/billing/plans': {
        get: { tags: ['Billing'], summary: 'List subscription plans and Razorpay readiness', responses: standardResponses('BillingPlanList') },
      },
      '/billing/subscription': {
        get: { tags: ['Billing'], summary: 'Get the active workspace subscription', security: secured, responses: standardResponses('BillingSubscription') },
      },
      '/billing/subscriptions': {
        post: { tags: ['Billing'], summary: 'Create a Razorpay subscription checkout', security: secured, responses: standardResponses('BillingCheckout', 201) },
      },
      '/billing/subscriptions/confirm': {
        post: { tags: ['Billing'], summary: 'Verify a Razorpay checkout signature', security: secured, responses: standardResponses('BillingSubscription') },
      },
      '/billing/subscription/cancel': {
        post: { tags: ['Billing'], summary: 'Cancel at the end of the current billing cycle', security: secured, responses: standardResponses('BillingSubscription') },
      },
      '/billing/webhook': {
        post: { tags: ['Billing'], summary: 'Receive signed idempotent Razorpay subscription events', responses: standardResponses('WebhookAcknowledgement') },
      },
      '/oauth/token': {
        post: {
          tags: ['Developer Apps'], summary: 'Exchange or refresh an OAuth 2.1 token',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OAuthTokenRequest' } } } },
          responses: { '200': { description: 'OAuth token response', content: { 'application/json': { schema: { $ref: '#/components/schemas/OAuthToken' } } } }, '401': errorResponse },
        },
      },
      '/developer/applications': {
        get: { tags: ['Developer Apps'], summary: 'List developer applications', security: secured, responses: standardResponses('ApplicationList') },
        post: { tags: ['Developer Apps'], summary: 'Register a developer application', security: secured, responses: standardResponses('ApplicationSecret', 201) },
      },
      '/developer/webhooks': {
        get: { tags: ['Webhooks'], summary: 'List webhook endpoints', security: secured, responses: standardResponses('WebhookList') },
        post: { tags: ['Webhooks'], summary: 'Register a signed webhook endpoint', security: secured, responses: standardResponses('WebhookSecret', 201) },
      },
      '/developer/webhook-deliveries': {
        get: { tags: ['Webhooks'], summary: 'List delivery history and dead letters', security: secured, responses: standardResponses('WebhookDeliveryList') },
      },
      '/developer/marketplace': {
        get: { tags: ['Marketplace'], summary: 'Browse approved plugins', security: secured, responses: standardResponses('PluginList') },
      },
      '/security/dashboard': {
        get: { tags: ['Security'], summary: 'Read the workspace security posture', security: secured, responses: standardResponses('SecurityDashboard') },
      },
      '/security/policies': {
        get: { tags: ['Security'], summary: 'List zero-trust policies', security: secured, responses: standardResponses('SecurityPolicyList') },
        post: { tags: ['Security'], summary: 'Create a versioned zero-trust policy', security: secured, responses: standardResponses('SecurityPolicy', 201) },
      },
      '/security/secrets': {
        get: { tags: ['Security'], summary: 'List managed-secret metadata', security: secured, responses: standardResponses('ManagedSecretList') },
        post: { tags: ['Security'], summary: 'Create an encrypted managed secret', security: secured, responses: standardResponses('ManagedSecretOneTimeValue', 201) },
      },
      '/security/governance/assets': {
        get: { tags: ['Governance'], summary: 'List governed data assets', security: secured, responses: standardResponses('DataAssetList') },
        post: { tags: ['Governance'], summary: 'Catalogue a governed data asset', security: secured, responses: standardResponses('DataAsset', 201) },
      },
      '/security/threats': {
        get: { tags: ['Security'], summary: 'List correlated threat signals', security: secured, responses: standardResponses('ThreatSignalList') },
      },
      '/security/incidents': {
        get: { tags: ['Security'], summary: 'List security incidents', security: secured, responses: standardResponses('SecurityIncidentList') },
        post: { tags: ['Security'], summary: 'Open an incident response workflow', security: secured, responses: standardResponses('SecurityIncident', 201) },
      },
      '/security/compliance': {
        get: { tags: ['Compliance'], summary: 'Read compliance evidence coverage', security: secured, responses: standardResponses('ComplianceFrameworkList') },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT, PAT, service token, or OAuth access token' },
        apiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
      schemas: {
        SuccessEnvelope: {
          type: 'object', required: ['success', 'data'],
          properties: { success: { const: true }, data: {}, message: { type: 'string' }, meta: { type: 'object' } },
        },
        ErrorEnvelope: {
          type: 'object', required: ['success', 'error'],
          properties: {
            success: { const: false },
            error: { type: 'object', required: ['code', 'message'], properties: { code: { type: 'string' }, message: { type: 'string' }, details: { type: 'object' } } },
          },
        },
        OAuthTokenRequest: {
          oneOf: [
            { type: 'object', required: ['grant_type', 'client_id', 'client_secret', 'code', 'redirect_uri', 'code_verifier'], properties: { grant_type: { const: 'authorization_code' } } },
            { type: 'object', required: ['grant_type', 'client_id', 'client_secret', 'refresh_token'], properties: { grant_type: { const: 'refresh_token' } } },
            { type: 'object', required: ['grant_type', 'client_id', 'client_secret', 'scope'], properties: { grant_type: { const: 'client_credentials' } } },
          ],
        },
        OAuthToken: {
          type: 'object', required: ['access_token', 'token_type', 'expires_in', 'scope'],
          properties: { access_token: { type: 'string' }, token_type: { const: 'Bearer' }, expires_in: { type: 'integer' }, refresh_token: { type: 'string' }, scope: { type: 'string' } },
        },
        EventCatalog: { type: 'array', items: { type: 'object' }, examples: [EVENT_CATALOG] },
        ScopeCatalog: { type: 'object', examples: [PUBLIC_API_SCOPES] },
      },
    },
    'x-nexpulse-lifecycle': API_LIFECYCLE,
  };
}

const dateRangeParameters = [
  { in: 'query', name: 'from', schema: { type: 'string', format: 'date-time' } },
  { in: 'query', name: 'to', schema: { type: 'string', format: 'date-time' } },
];

const errorResponse = {
  description: 'Request failed',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
};

function standardResponses(schemaName: string, successStatus = 200) {
  return {
    [successStatus]: {
      description: 'Successful response',
      content: { 'application/json': { schema: { allOf: [
        { $ref: '#/components/schemas/SuccessEnvelope' },
        { type: 'object', properties: { data: { title: schemaName } } },
      ] } } },
    },
    '400': errorResponse,
    '401': errorResponse,
    '403': errorResponse,
    '429': errorResponse,
  };
}
