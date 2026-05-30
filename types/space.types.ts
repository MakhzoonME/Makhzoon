/**
 * Space — a fully-isolated sub-tenant inside an Organization
 * (e.g. a branch, warehouse, or store).
 *
 * Data ownership: assets, inventory, requests, POS sessions/customers,
 * audit logs and their child tables are scoped by space_id. Org-wide
 * things (users, billing, settings, managed lists, tax, Fawtara) are not.
 */
export type SpaceStatus = 'active' | 'archived';

export interface Space {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  status: SpaceStatus;
  /** Auto-created and undeletable; one per org. */
  isDefault: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

/**
 * Membership row. Owners with `users.all_spaces=true` need no rows
 * (they implicitly access every space in their org). Admin/staff
 * gain access only through these rows.
 */
export interface SpaceMember {
  id: string;
  organizationId: string;
  spaceId: string;
  userId: string;
  createdAt: Date;
  createdBy: string;
}
