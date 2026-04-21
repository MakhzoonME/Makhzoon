export interface Organization {
  id: string;
  name: string;
  subdomain: string;
  contactEmail: string;
  packageDetails?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}
