export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';

export interface Subscription {
  id: string;
  organizationId: string;
  packageId: string | null;
  features: Record<string, boolean>;
  notes: string | null;
  packageDetails: Record<string, unknown>;
  startDate: Date;
  endDate: Date;
  status: SubscriptionStatus;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}
