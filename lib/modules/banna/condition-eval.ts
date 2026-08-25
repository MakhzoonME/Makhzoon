import type { CustomFieldCondition } from '@/types/banna.types';

/** Shared by the client (live show/hide + clearing while editing) and the
 *  server (authoritative clearing on save) so the two never disagree. */
export function matchesCondition(condition: CustomFieldCondition, parentValue: unknown): boolean {
  switch (condition.operator) {
    case 'is_true': return parentValue === true;
    case 'is_false': return parentValue !== true;
    case 'equals': return parentValue === condition.value;
    case 'not_equals': return parentValue !== condition.value;
    case 'in': {
      const opts = Array.isArray(condition.value) ? condition.value : [];
      if (Array.isArray(parentValue)) return parentValue.some((v) => opts.includes(v as string));
      return typeof parentValue === 'string' && opts.includes(parentValue);
    }
    default: return true;
  }
}

export interface ConditionEvalEntry {
  condition?: CustomFieldCondition | null;
  value: unknown;
}

/** Walks the condition chain (field -> parent -> parent's parent -> ...).
 *  A field is visible only if every ancestor's condition also matches — a
 *  hidden parent hides its descendants too. An unresolved parent reference
 *  (deleted/renamed field) is treated as not-visible rather than throwing;
 *  deleting a field with dependents is blocked server-side, so this should
 *  only bite orphaned data from before that guard existed. */
export function isFieldVisible(fieldKey: string, byKey: Map<string, ConditionEvalEntry>): boolean {
  const self = byKey.get(fieldKey);
  if (!self?.condition) return true;
  const parent = byKey.get(self.condition.parentFieldKey);
  if (!parent) return false;
  if (!matchesCondition(self.condition, parent.value)) return false;
  return isFieldVisible(self.condition.parentFieldKey, byKey);
}
