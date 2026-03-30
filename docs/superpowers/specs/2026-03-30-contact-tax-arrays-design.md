# Contact Tax Arrays: Replace Integer Tax Fields with Tax Key Arrays

Replace `salesTax` (integer) and `purchasesTax` (integer) with `salesTaxes` (string array) and `purchasesTaxes` (string array) in `ContactDefaultsSchema`, enabling direct specification of tax keys for intra-community, reverse charge, and combined IVA+retention scenarios.

## Problem

The current `purchasesTax` and `salesTax` fields accept an integer percentage (e.g., `21`), which the Holded API always maps to the basic tax key (`p_iva_21`, `s_iva_21`) regardless of the contact's `taxOperation`. This makes it impossible to set:

- Intra-community taxes: `p_iva_adqintras_21`
- Reverse charge (ISP): `p_iva_invsuj`
- Combined IVA + retention: `["p_iva_21", "p_ret_15"]`

## API Behavior (Verified 2026-03-30)

Testing against the live Holded API confirmed:

1. **`purchasesTaxes` (string array)** is accepted on create/update and correctly stores tax keys
2. **`salesTaxes` (string array)** works the same way
3. **Combined keys** like `["p_iva_21", "p_ret_15"]` are accepted and stored correctly
4. **Precedence**: when both `purchasesTax` (int) and `purchasesTaxes` (array) are sent, the array wins
5. **Response field names**: the API always returns `purchasesTax` and `salesTax` (singular, no trailing 's') as arrays of key strings
6. **`taxOperation`** is write-only — not returned by the GET endpoint

## Design

### Schema Change

**File**: `src/schemas/invoicing/contacts.ts` — `ContactDefaultsSchema`

Remove:
```typescript
salesTax: z.number().int().optional().describe("Default sales tax percentage"),
purchasesTax: z.number().int().optional().describe("Default purchases tax percentage"),
```

Add:
```typescript
salesTaxes: z.array(z.string()).optional()
  .describe("Default sales tax keys (e.g., [\"s_iva_21\"]). Use get_taxes tool to list available keys."),
purchasesTaxes: z.array(z.string()).optional()
  .describe("Default purchase tax keys (e.g., [\"p_iva_21\"], [\"p_iva_adqintras_21\"], [\"p_iva_21\", \"p_ret_15\"]). Use get_taxes tool to list available keys."),
```

### Type Update

**File**: `src/types.ts` — `ContactDefaults` interface

The interface is minimal (4 fields) and doesn't include tax fields. No changes needed — it's used only for response formatting, and the formatters don't reference tax fields.

### Handler Changes

None. The factory passes the body as-is to the Holded API. The field rename from `purchasesTax` → `purchasesTaxes` in the schema is sufficient.

### Test Updates

Update any schema validation tests in `tests/` that reference `salesTax` or `purchasesTax` integer fields to use the new array fields.

## Breaking Change

This is a breaking change: existing callers using `defaults.salesTax: 21` or `defaults.purchasesTax: 21` will get a Zod validation error. This is acceptable because:

- The integer fields silently produced incorrect tax keys for non-standard scenarios
- The array fields are strictly more capable
- The migration path is clear: `purchasesTax: 21` → `purchasesTaxes: ["p_iva_21"]`
