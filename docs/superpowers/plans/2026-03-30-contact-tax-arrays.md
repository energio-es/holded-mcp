# Contact Tax Arrays Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace integer tax fields (`salesTax`, `purchasesTax`) with string-array tax fields (`salesTaxes`, `purchasesTaxes`) in `ContactDefaultsSchema` so users can specify exact tax keys.

**Architecture:** Two-field swap in the Zod schema, one test update. No handler or type changes — the factory passes the body as-is to the Holded API, which accepts `purchasesTaxes`/`salesTaxes` as string arrays natively.

**Tech Stack:** TypeScript, Zod, Vitest

---

### Task 1: Update schema and test

**Files:**
- Modify: `src/schemas/invoicing/contacts.ts:61-62`
- Modify: `tests/schema-validation.test.ts:413`

- [ ] **Step 1: Update ContactDefaultsSchema — replace integer fields with array fields**

In `src/schemas/invoicing/contacts.ts`, replace lines 61-62:

```typescript
    salesTax: z.number().int().optional().describe("Default sales tax percentage"),
    purchasesTax: z.number().int().optional().describe("Default purchases tax percentage"),
```

with:

```typescript
    salesTaxes: z.array(z.string()).optional().describe("Default sales tax keys (e.g., [\"s_iva_21\"]). Use get_taxes tool to list available keys."),
    purchasesTaxes: z.array(z.string()).optional().describe("Default purchase tax keys (e.g., [\"p_iva_21\"], [\"p_iva_adqintras_21\"], [\"p_iva_21\", \"p_ret_15\"]). Use get_taxes tool to list available keys."),
```

- [ ] **Step 2: Update the test that references salesTax**

In `tests/schema-validation.test.ts`, replace line 413:

```typescript
          salesTax: 21,
```

with:

```typescript
          salesTaxes: ["s_iva_21"],
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: Clean compile, no errors.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: All tests pass. The `should accept new contact fields` test passes with `salesTaxes: ["s_iva_21"]`.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/invoicing/contacts.ts tests/schema-validation.test.ts
git commit -m "feat: replace integer tax fields with tax key arrays in ContactDefaultsSchema

Replace salesTax (integer) and purchasesTax (integer) with salesTaxes
and purchasesTaxes (string arrays) so users can specify exact tax keys
like p_iva_adqintras_21 or combined [p_iva_21, p_ret_15].

BREAKING CHANGE: defaults.salesTax and defaults.purchasesTax integer
fields removed. Use defaults.salesTaxes and defaults.purchasesTaxes
string arrays instead."
```
