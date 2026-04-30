export interface OrgSSOConfig {
  organizationId: string;
  enabled: boolean;
  enforced: boolean;
  type: 'oidc';
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
  allowedDomains: string[];
  domainVerified: boolean;
  domainVerificationToken: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

export interface OIDCDiscovery {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  issuer: string;
}

export interface SSOCheckResult {
  ssoEnabled: boolean;
  ssoEnforced: boolean;
  orgId?: string;
  orgSlug?: string;
}

export interface PendingSSOSession {
  nonce: string;
  customToken: string;
  orgSlug: string;
  expiresAt: Date;
  createdAt: Date;
}
