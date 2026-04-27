export interface OrgUser {
  id: string;
  organizationId: string;
  email?: string;
  phone?: string;
  displayName: string;
  role: 'admin' | 'staff';
  status: 'active' | 'deactivated';
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}
