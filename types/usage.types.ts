import type { Organization } from './organization.types';
import type { Subscription } from './subscription.types';
import type { Package } from './package.types';

export interface OrgUsage {
  organizationId: string;
  assets: number;
  users: number;
  warranties: number;
  requests: number;
  spaces: number;
  inventoryItems: number;
}

export interface OrgWithUsage {
  organization: Organization;
  subscription: Subscription | null;
  package: Package | null;
  usage: OrgUsage;
}
