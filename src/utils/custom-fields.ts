/**
 * Custom-fields map serialization and repair.
 *
 * Holded's `POST /documents/{docType}` and `POST|PUT /contacts[{id}]` endpoints
 * decompose each `customFields` entry via their own `Object.entries` — every
 * own-prop becomes a separate `{field: <key>, value: <val>}` row. The single
 * reliable workaround is to send one own-prop per entry: `[{"src":"val"}]` →
 * Holded unpacks to `[{field:"src", value:"val"}]`.
 *
 * Other endpoints behave normally and accept the documented `[{field, value}]`
 * shape, or (for funnel PUT) store the array byte-for-byte.
 *
 * See `docs/superpowers/specs/2026-04-16-customfields-map-interface-design.md`
 * and DRIFT entries DRIFT-INV-14 / DRIFT-INV-15.
 *
 * Per-resource variant lookup:
 *
 *   | Resource | POST           | PUT            |
 *   |----------|----------------|----------------|
 *   | Document | map-per-entry  | documented     |
 *   | Contact  | map-per-entry  | map-per-entry  |
 *   | Lead     | documented     | documented     |
 *   | Funnel   | (n/a)          | map-per-entry  |
 */

export type CustomFieldsMap = Record<string, string>;

export type WireVariant = "map-per-entry" | "documented";

/**
 * Convert a caller-facing customFields map to the wire shape expected by a
 * specific Holded endpoint variant. Returns `undefined` when the input is
 * undefined or empty so callers can spread the result straight into a body
 * without introducing a `customFields: []` noise field.
 */
export function serialize(
  map: CustomFieldsMap | undefined,
  variant: WireVariant,
): unknown[] | undefined {
  if (!map) return undefined;
  const keys = Object.keys(map);
  if (keys.length === 0) return undefined;

  if (variant === "documented") {
    return keys.map((k) => ({ field: k, value: map[k] }));
  }
  // map-per-entry
  return keys.map((k) => ({ [k]: map[k] }));
}

/**
 * Parse any observed wire shape back into a caller-facing map. Idempotent
 * on arrays of known shapes; returns `{}` for any non-array input (including
 * an already-parsed map — callers must not re-parse).
 *
 * Priority order:
 *   1. null/undefined/non-array  → {}
 *   2. empty array               → {}
 *   3. whole-array mangled pairs → collapse each pair into {K: V}
 *   4. entry-by-entry:
 *        {field, value} exact    → {K: V}
 *        single own-prop {K: V}  → {K: V}
 *        otherwise               → skip
 *
 * Rule 3 runs before rule 4: a legitimate pair
 *   [{field:"field", value:X}, {field:"value", value:Y}]
 * is indistinguishable from the mangled output of `[{field:X, value:Y}]`;
 * the mangled interpretation wins. Custom fields literally named "field"
 * or "value" are accepted as an unavoidable heuristic cost.
 */
export function parse(raw: unknown): CustomFieldsMap {
  if (!Array.isArray(raw)) return {};
  if (raw.length === 0) return {};

  // Rule 3: whole-array mangled pairs
  if (raw.length % 2 === 0 && raw.every(isRowObject) && allMangledPairs(raw)) {
    const out: CustomFieldsMap = {};
    for (let i = 0; i < raw.length; i += 2) {
      const key = String((raw[i] as RowObject).value);
      const val = String((raw[i + 1] as RowObject).value);
      out[key] = val;
    }
    return out;
  }

  // Rule 4: entry-by-entry
  const out: CustomFieldsMap = {};
  for (const entry of raw) {
    if (!isRowObject(entry)) continue;
    const keys = Object.keys(entry);
    if (keys.length === 2 && "field" in entry && "value" in entry) {
      out[String(entry.field)] = String(entry.value);
    } else if (keys.length === 1) {
      const [k] = keys;
      const v = (entry as Record<string, unknown>)[k];
      if (typeof v === "string") {
        out[k] = v;
      }
    }
    // else: skip silently
  }
  return out;
}

/**
 * Mutate-in-place: if `item` is an object with a `customFields` property,
 * overwrite it with `parse(item.customFields)`. No-op otherwise. Returns
 * `item` for chaining.
 *
 * Call sites:
 *   - Direct handlers (documents): after `makeApiRequest`, call on each
 *     returned document.
 *   - Factory `responseTransform`: return `repairCustomFieldsInPlace(item)`.
 */
export function repairCustomFieldsInPlace<T>(item: T): T {
  if (item && typeof item === "object" && "customFields" in (item as object)) {
    const target = item as unknown as { customFields: unknown };
    target.customFields = parse(target.customFields);
  }
  return item;
}

type RowObject = Record<string, unknown>;

function isRowObject(v: unknown): v is RowObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function allMangledPairs(rows: RowObject[]): boolean {
  for (let i = 0; i < rows.length; i += 2) {
    const a = rows[i];
    const b = rows[i + 1];
    if (
      Object.keys(a).length !== 2 ||
      a.field !== "field" ||
      typeof a.value !== "string"
    ) return false;
    if (
      Object.keys(b).length !== 2 ||
      b.field !== "value" ||
      typeof b.value !== "string"
    ) return false;
  }
  return true;
}
