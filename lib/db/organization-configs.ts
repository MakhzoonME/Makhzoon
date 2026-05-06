import { adminDb } from '@/lib/firebase/admin';
import {
  ConfigCategory,
  ConfigLocation,
  ConfigStatus,
  DEFAULT_ASSET_STATUSES,
  DEFAULT_CATEGORIES,
  DEFAULT_LOCATIONS,
  OrganizationConfig,
} from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';

const COLLECTION = 'organizationConfigs';

function toConfig(orgId: string, data: FirebaseFirestore.DocumentData): OrganizationConfig {
  return {
    organizationId: orgId,
    assetStatuses: Array.isArray(data.assetStatuses) ? (data.assetStatuses as ConfigStatus[]) : [],
    locations: Array.isArray(data.locations) ? (data.locations as ConfigLocation[]) : [],
    categories: Array.isArray(data.categories) ? (data.categories as ConfigCategory[]) : [],
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    createdBy: data.createdBy ?? 'system',
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    updatedBy: data.updatedBy ?? 'system',
  };
}

function makeId(prefix: string): string {
  return `${prefix}-${randomBytes(4).toString('hex')}`;
}

export function slugifyId(label: string, prefix: string): string {
  const base = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return base ? `${prefix}-${base}` : makeId(prefix);
}

/** Returns the config for an org, seeding it with defaults on first read. */
export async function getOrCreateOrganizationConfig(
  orgId: string,
  actorUid = 'system',
): Promise<OrganizationConfig> {
  const ref = adminDb.collection(COLLECTION).doc(orgId);
  const snap = await ref.get();
  if (snap.exists) return toConfig(orgId, snap.data()!);

  const seed = {
    organizationId: orgId,
    assetStatuses: DEFAULT_ASSET_STATUSES,
    locations: DEFAULT_LOCATIONS,
    categories: DEFAULT_CATEGORIES,
    createdBy: actorUid,
    updatedBy: actorUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(seed);
  const fresh = await ref.get();
  return toConfig(orgId, fresh.data()!);
}

async function writeSection(
  orgId: string,
  section: 'assetStatuses' | 'locations' | 'categories',
  next: ConfigStatus[] | ConfigLocation[] | ConfigCategory[],
  actorUid: string,
): Promise<void> {
  await adminDb.collection(COLLECTION).doc(orgId).update({
    [section]: next,
    updatedBy: actorUid,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/* ── Statuses ───────────────────────────────────────────────────── */

export async function addStatus(
  orgId: string,
  input: { label: string; color: string },
  actorUid: string,
): Promise<{ status: ConfigStatus; statuses: ConfigStatus[] }> {
  const cfg = await getOrCreateOrganizationConfig(orgId, actorUid);
  const labelKey = input.label.trim().toLowerCase();
  if (cfg.assetStatuses.some((s) => s.label.trim().toLowerCase() === labelKey)) {
    throw Object.assign(new Error('A status with this label already exists'), { code: 'duplicate' });
  }
  const status: ConfigStatus = {
    id: slugifyId(input.label, 'status'),
    label: input.label.trim(),
    color: input.color,
  };
  const next = [...cfg.assetStatuses, status];
  await writeSection(orgId, 'assetStatuses', next, actorUid);
  return { status, statuses: next };
}

export async function updateStatus(
  orgId: string,
  statusId: string,
  patch: { label?: string; color?: string },
  actorUid: string,
): Promise<{ status: ConfigStatus | null; statuses: ConfigStatus[] }> {
  const cfg = await getOrCreateOrganizationConfig(orgId, actorUid);
  const idx = cfg.assetStatuses.findIndex((s) => s.id === statusId);
  if (idx === -1) return { status: null, statuses: cfg.assetStatuses };

  if (patch.label) {
    const labelKey = patch.label.trim().toLowerCase();
    const dupe = cfg.assetStatuses.some(
      (s, i) => i !== idx && s.label.trim().toLowerCase() === labelKey,
    );
    if (dupe) throw Object.assign(new Error('A status with this label already exists'), { code: 'duplicate' });
  }

  const next = cfg.assetStatuses.slice();
  next[idx] = {
    ...next[idx],
    ...(patch.label ? { label: patch.label.trim() } : {}),
    ...(patch.color ? { color: patch.color } : {}),
  };
  await writeSection(orgId, 'assetStatuses', next, actorUid);
  return { status: next[idx], statuses: next };
}

export async function deleteStatus(
  orgId: string,
  statusId: string,
  actorUid: string,
): Promise<{ removed: ConfigStatus | null; statuses: ConfigStatus[] }> {
  const cfg = await getOrCreateOrganizationConfig(orgId, actorUid);
  const removed = cfg.assetStatuses.find((s) => s.id === statusId) ?? null;
  if (!removed) return { removed: null, statuses: cfg.assetStatuses };
  if (cfg.assetStatuses.length <= 1) {
    throw Object.assign(new Error('At least one status is required'), { code: 'min_required' });
  }
  const next = cfg.assetStatuses.filter((s) => s.id !== statusId);
  await writeSection(orgId, 'assetStatuses', next, actorUid);
  return { removed, statuses: next };
}

/* ── Locations ─────────────────────────────────────────────────── */

export async function addLocation(
  orgId: string,
  input: { name: string },
  actorUid: string,
): Promise<{ location: ConfigLocation; locations: ConfigLocation[] }> {
  const cfg = await getOrCreateOrganizationConfig(orgId, actorUid);
  const nameKey = input.name.trim().toLowerCase();
  if (cfg.locations.some((l) => l.name.trim().toLowerCase() === nameKey)) {
    throw Object.assign(new Error('A location with this name already exists'), { code: 'duplicate' });
  }
  const location: ConfigLocation = {
    id: slugifyId(input.name, 'loc'),
    name: input.name.trim(),
  };
  const next = [...cfg.locations, location];
  await writeSection(orgId, 'locations', next, actorUid);
  return { location, locations: next };
}

export async function updateLocation(
  orgId: string,
  locationId: string,
  patch: { name?: string },
  actorUid: string,
): Promise<{ location: ConfigLocation | null; locations: ConfigLocation[] }> {
  const cfg = await getOrCreateOrganizationConfig(orgId, actorUid);
  const idx = cfg.locations.findIndex((l) => l.id === locationId);
  if (idx === -1) return { location: null, locations: cfg.locations };
  if (patch.name) {
    const nameKey = patch.name.trim().toLowerCase();
    const dupe = cfg.locations.some(
      (l, i) => i !== idx && l.name.trim().toLowerCase() === nameKey,
    );
    if (dupe) throw Object.assign(new Error('A location with this name already exists'), { code: 'duplicate' });
  }
  const next = cfg.locations.slice();
  next[idx] = { ...next[idx], ...(patch.name ? { name: patch.name.trim() } : {}) };
  await writeSection(orgId, 'locations', next, actorUid);
  return { location: next[idx], locations: next };
}

export async function deleteLocation(
  orgId: string,
  locationId: string,
  actorUid: string,
): Promise<{ removed: ConfigLocation | null; locations: ConfigLocation[] }> {
  const cfg = await getOrCreateOrganizationConfig(orgId, actorUid);
  const removed = cfg.locations.find((l) => l.id === locationId) ?? null;
  if (!removed) return { removed: null, locations: cfg.locations };
  const next = cfg.locations.filter((l) => l.id !== locationId);
  await writeSection(orgId, 'locations', next, actorUid);
  return { removed, locations: next };
}

/* ── Categories ────────────────────────────────────────────────── */

export async function addCategory(
  orgId: string,
  input: { name: string },
  actorUid: string,
): Promise<{ category: ConfigCategory; categories: ConfigCategory[] }> {
  const cfg = await getOrCreateOrganizationConfig(orgId, actorUid);
  const nameKey = input.name.trim().toLowerCase();
  if (cfg.categories.some((c) => c.name.trim().toLowerCase() === nameKey)) {
    throw Object.assign(new Error('A category with this name already exists'), { code: 'duplicate' });
  }
  const category: ConfigCategory = {
    id: slugifyId(input.name, 'cat'),
    name: input.name.trim(),
  };
  const next = [...cfg.categories, category];
  await writeSection(orgId, 'categories', next, actorUid);
  return { category, categories: next };
}

export async function updateCategory(
  orgId: string,
  categoryId: string,
  patch: { name?: string },
  actorUid: string,
): Promise<{ category: ConfigCategory | null; categories: ConfigCategory[] }> {
  const cfg = await getOrCreateOrganizationConfig(orgId, actorUid);
  const idx = cfg.categories.findIndex((c) => c.id === categoryId);
  if (idx === -1) return { category: null, categories: cfg.categories };
  if (patch.name) {
    const nameKey = patch.name.trim().toLowerCase();
    const dupe = cfg.categories.some(
      (c, i) => i !== idx && c.name.trim().toLowerCase() === nameKey,
    );
    if (dupe) throw Object.assign(new Error('A category with this name already exists'), { code: 'duplicate' });
  }
  const next = cfg.categories.slice();
  next[idx] = { ...next[idx], ...(patch.name ? { name: patch.name.trim() } : {}) };
  await writeSection(orgId, 'categories', next, actorUid);
  return { category: next[idx], categories: next };
}

export async function deleteCategory(
  orgId: string,
  categoryId: string,
  actorUid: string,
): Promise<{ removed: ConfigCategory | null; categories: ConfigCategory[] }> {
  const cfg = await getOrCreateOrganizationConfig(orgId, actorUid);
  const removed = cfg.categories.find((c) => c.id === categoryId) ?? null;
  if (!removed) return { removed: null, categories: cfg.categories };
  if (cfg.categories.length <= 1) {
    throw Object.assign(new Error('At least one category is required'), { code: 'min_required' });
  }
  const next = cfg.categories.filter((c) => c.id !== categoryId);
  await writeSection(orgId, 'categories', next, actorUid);
  return { removed, categories: next };
}
