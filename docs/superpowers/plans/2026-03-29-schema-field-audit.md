# Schema Field Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all missing Holded API fields to Zod input schemas and fix correctness bugs so users can access the full API through MCP tools.

**Architecture:** Schema-only changes in `src/schemas/`, with corresponding handler updates in `src/tools/` only where handlers use explicit field mapping (leads). Document/contact/product handlers use pass-through patterns and need no code changes beyond the schema.

**Tech Stack:** TypeScript, Zod 4, MCP SDK

**Spec:** `docs/superpowers/specs/2026-03-29-schema-field-audit-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/schemas/common.ts` | Modify | Add `ShippingAddressSchema`, `NumberingSeriesSchema`, `ContactPersonSchema` |
| `src/schemas/invoicing/documents.ts` | Modify | Add missing fields to `DocumentItemSchema`, `CreateDocumentInputSchema`, `UpdateDocumentInputSchema` |
| `src/schemas/invoicing/contacts.ts` | Modify | Add missing fields to `ContactDefaultsSchema`, `CreateContactInputSchema`, `UpdateContactInputSchema` |
| `src/schemas/invoicing/products.ts` | Modify | Add `purchasePrice`, `tags`, `calculatecost`, `subtotal` |
| `src/schemas/crm/leads.ts` | Modify | Add `value`, `dueDate`, `contactName`, `customFields`, `status` |
| `src/tools/crm/leads.ts` | Modify | Map new lead fields in create/update handlers |
| `tests/schema-validation.test.ts` | Modify | Update tests for renamed fields, add tests for new fields |

---

### Task 1: Add shared schemas to common.ts

**Files:**
- Modify: `src/schemas/common.ts`

- [ ] **Step 1: Add ShippingAddressSchema, NumberingSeriesSchema, and ContactPersonSchema**

Open `src/schemas/common.ts` and add these schemas after the existing `AddressSchema` (after line 98):

```typescript
/**
 * Shipping address schema (extends address with name and notes)
 */
export const ShippingAddressSchema = z.strictObject({
  name: z.string().optional().describe("Address label/name"),
  address: z.string().optional().describe("Street address"),
  city: z.string().optional().describe("City name"),
  postalCode: z.string().optional().describe("Postal/ZIP code"),
  province: z.string().optional().describe("Province/State"),
  country: z.string().optional().describe("Country name"),
  notes: z.string().optional().describe("Public notes"),
  privateNote: z.string().optional().describe("Private notes"),
});

/**
 * Numbering series schema (per-document-type numbering series IDs)
 */
export const NumberingSeriesSchema = z.strictObject({
  invoice: z.string().optional().describe("Numbering series ID for invoices"),
  receipt: z.string().optional().describe("Numbering series ID for receipts"),
  salesOrder: z.string().optional().describe("Numbering series ID for sales orders"),
  purchasesOrder: z.string().optional().describe("Numbering series ID for purchase orders"),
  proform: z.string().optional().describe("Numbering series ID for proforms"),
  waybill: z.string().optional().describe("Numbering series ID for waybills"),
}).optional();

/**
 * Contact person schema
 */
export const ContactPersonSchema = z.strictObject({
  name: z.string().min(1).describe("Contact person name (required)"),
  phone: z.string().optional().describe("Phone number"),
  email: z.string().email().optional().describe("Email address"),
});
```

- [ ] **Step 2: Run build to verify no errors**

Run: `cd /Users/baibaratsky/Workspace/energio/holded-mcp-server && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/schemas/common.ts
git commit -m "feat: add ShippingAddressSchema, NumberingSeriesSchema, ContactPersonSchema to common schemas"
```

---

### Task 2: Fix DocumentItemSchema and CreateDocumentInputSchema

**Files:**
- Modify: `src/schemas/invoicing/documents.ts`

- [ ] **Step 1: Update imports to include new common schemas**

In `src/schemas/invoicing/documents.ts`, update the import from `"../common.js"` (lines 6-12) to:

```typescript
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
  DocumentTypeSchema,
  TimestampSchema,
} from "../common.js";
```

- [ ] **Step 2: Replace DocumentItemSchema with all API fields**

Replace the existing `DocumentItemSchema` (lines 17-28) with:

```typescript
/**
 * Document item schema
 */
export const DocumentItemSchema = z.strictObject({
  name: z.string().min(1).describe("Item name (required)"),
  desc: z.string().optional().describe("Item description"),
  units: z.number().positive().optional().describe("Quantity"),
  subtotal: z.number().optional().describe("Subtotal before tax"),
  tax: z.string().optional().describe("Tax rate ID or percentage (single tax)"),
  taxes: z.array(z.string()).optional().describe("Multiple tax keys (e.g., ['s_iva_21'])"),
  discount: z.number().min(0).max(100).optional().describe("Discount percentage"),
  productId: z.string().optional().describe("Product ID if linked to a product"),
  sku: z.string().optional().describe("SKU code"),
  weight: z.number().min(0).optional().describe("Item weight"),
  accountingAccountId: z.string().optional().describe("Accounting account ID"),
  serviceId: z.string().optional().describe("Service identifier"),
  supplied: z.enum(["Yes", "No"]).optional().describe("Whether item has been supplied"),
  tags: z.array(z.string()).optional().describe("Item tags"),
  kind: z.string().optional().describe("Item kind (e.g., 'lots')"),
  lotSku: z.string().optional().describe("Lot SKU (required when kind is 'lots')"),
})
```

- [ ] **Step 3: Replace CreateDocumentInputSchema with all API fields and required date**

Replace the existing `CreateDocumentInputSchema` (lines 55-70) with:

```typescript
/**
 * Create document input schema
 */
export const CreateDocumentInputSchema = z.strictObject({
  doc_type: DocumentTypeSchema,
  // Contact identification (provide one)
  contactId: z.string().optional().describe("Contact ID to associate with the document"),
  contactName: z.string().optional().describe("Contact name (used if creating a new contact)"),
  contactCode: z.string().optional().describe("Contact NIF/CIF/VAT identifier"),
  contactEmail: z.string().optional().describe("Contact email"),
  contactAddress: z.string().optional().describe("Contact street address"),
  contactCity: z.string().optional().describe("Contact city"),
  contactCp: z.string().optional().describe("Contact postal code"),
  contactProvince: z.string().optional().describe("Contact province"),
  contactCountryCode: z.string().optional().describe("Contact country code"),
  // Document details
  date: z.number().int().positive().describe("Document date as Unix timestamp (required)"),
  dueDate: TimestampSchema.describe("Due date as Unix timestamp"),
  desc: z.string().optional().describe("Document description"),
  notes: z.string().optional().describe("Document notes"),
  language: z.string().optional().describe("Document language code"),
  currency: z.string().optional().describe("ISO currency code (e.g., 'eur')"),
  currencyChange: z.number().positive().optional().describe("Currency exchange rate"),
  // Document configuration
  invoiceNum: z.string().optional().describe("Custom document number (auto-generated if not provided)"),
  numSerieId: z.string().optional().describe("Numbering series ID"),
  salesChannelId: z.string().optional().describe("Sales channel ID"),
  paymentMethodId: z.string().optional().describe("Payment method ID"),
  designId: z.string().optional().describe("Document design template ID"),
  warehouseId: z.string().optional().describe("Warehouse ID (for salesorder/purchaseorder/waybill)"),
  approveDoc: z.boolean().optional().describe("Auto-approve document (default false)"),
  applyContactDefaults: z.boolean().optional().describe("Apply contact defaults (default true)"),
  directDebitProvider: z.string().optional().describe("Direct debit provider (e.g., 'gocardless')"),
  // Shipping
  shippingAddress: z.string().optional().describe("Shipping street address"),
  shippingPostalCode: z.string().optional().describe("Shipping postal code"),
  shippingCity: z.string().optional().describe("Shipping city"),
  shippingProvince: z.string().optional().describe("Shipping province"),
  shippingCountry: z.string().optional().describe("Shipping country"),
  // Items and metadata
  items: z
    .array(DocumentItemSchema)
    .min(1, { message: "At least one item is required" })
    .describe("Document line items (required)"),
  customFields: z.array(z.strictObject({
    field: z.string().describe("Custom field name"),
    value: z.string().describe("Custom field value"),
  })).optional().describe("Custom field key-value pairs"),
  tags: z.array(z.string()).optional().describe("Document tags"),
})
```

- [ ] **Step 4: Replace UpdateDocumentInputSchema with all API fields**

Replace the existing `UpdateDocumentInputSchema` (lines 77-88) with:

```typescript
/**
 * Update document input schema
 */
export const UpdateDocumentInputSchema = z.strictObject({
  doc_type: DocumentTypeSchema,
  document_id: IdSchema.describe("The document ID to update"),
  contactId: z.string().optional().describe("Contact ID to associate with the document"),
  date: TimestampSchema.describe("Document date as Unix timestamp"),
  dueDate: TimestampSchema.describe("Due date as Unix timestamp"),
  desc: z.string().optional().describe("Document description"),
  notes: z.string().optional().describe("Document notes"),
  language: z.string().optional().describe("Document language code"),
  currencyChange: z.number().positive().optional().describe("Currency exchange rate"),
  items: z.array(DocumentItemSchema).optional().describe("Document line items"),
  salesChannelId: z.string().optional().describe("Sales channel ID"),
  paymentMethod: z.string().optional().describe("Payment method ID"),
  warehouseId: z.string().optional().describe("Warehouse ID (for salesorder/purchaseorder/waybill)"),
  expAccountId: z.string().optional().describe("Expenses account ID"),
  customFields: z.array(z.strictObject({
    field: z.string().describe("Custom field name"),
    value: z.string().describe("Custom field value"),
  })).optional().describe("Custom field key-value pairs"),
})
```

- [ ] **Step 5: Run build to verify no errors**

Run: `cd /Users/baibaratsky/Workspace/energio/holded-mcp-server && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Run tests to verify existing tests pass**

Run: `cd /Users/baibaratsky/Workspace/energio/holded-mcp-server && npx jest --config jest.config.js`
Expected: All tests pass. The Document Creation tests should still pass since they use `doc_type`, `date`, `items` which are unchanged. The `DocumentItemSchema` test uses `{name, units}` which still works.

- [ ] **Step 7: Update tests for renamed fields**

In `tests/schema-validation.test.ts`, the Document Creation tests (around line 414) should pass as-is since they don't reference `salesChannel` or `docNumber`. But add a test for the new required `date` field. Add this test inside the `describe('Document Creation', ...)` block:

```typescript
    it('should require date field', () => {
      const invalidData = {
        doc_type: 'invoice',
        items: [{ name: 'Product 1', units: 2, subtotal: 100 }],
      };

      const result = CreateDocumentInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('date');
      }
    });

    it('should accept new document fields', () => {
      const validData = {
        doc_type: 'invoice',
        date: 1730109600,
        items: [{ name: 'Product 1', units: 2, subtotal: 100, taxes: ['s_iva_21'], serviceId: 'svc1' }],
        contactCode: 'B12345678',
        language: 'es',
        currency: 'eur',
        approveDoc: true,
        shippingAddress: '123 Main St',
        shippingCity: 'Madrid',
        customFields: [{ field: 'ref', value: '123' }],
        tags: ['urgent'],
      };

      const result = CreateDocumentInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
```

- [ ] **Step 8: Run tests again**

Run: `cd /Users/baibaratsky/Workspace/energio/holded-mcp-server && npx jest --config jest.config.js`
Expected: All tests pass including new ones.

- [ ] **Step 9: Commit**

```bash
git add src/schemas/invoicing/documents.ts tests/schema-validation.test.ts
git commit -m "feat: add all missing API fields to document schemas, make date required, rename salesChannel/docNumber"
```

---

### Task 3: Fix ContactDefaultsSchema, CreateContactInputSchema, UpdateContactInputSchema

**Files:**
- Modify: `src/schemas/invoicing/contacts.ts`

- [ ] **Step 1: Update imports**

In `src/schemas/invoicing/contacts.ts`, update the import (lines 6-11) to:

```typescript
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
  AddressSchema,
  ShippingAddressSchema,
  TagsSchema,
  NumberingSeriesSchema,
  ContactPersonSchema,
} from "../common.js";
```

- [ ] **Step 2: Replace ContactDefaultsSchema with all API fields**

Replace the existing `ContactDefaultsSchema` (lines 49-55) with:

```typescript
/**
 * Contact defaults schema
 */
export const ContactDefaultsSchema = z.strictObject({
    salesChannel: z.string().optional().describe("Default sales channel"),
    paymentMethod: z.string().optional().describe("Default payment method ID"),
    paymentDay: z.number().int().min(1).max(31).optional().describe("Default payment day of month"),
    dueDays: z.number().int().min(0).optional().describe("Default due days"),
    expensesAccountRecord: z.number().int().optional().describe("Default expenses account record"),
    expensesAccountName: z.string().optional().describe("Default expenses account name"),
    salesAccountRecord: z.number().int().optional().describe("Default sales account record"),
    salesAccountName: z.string().optional().describe("Default sales account name"),
    salesTax: z.number().int().optional().describe("Default sales tax percentage"),
    purchasesTax: z.number().int().optional().describe("Default purchases tax percentage"),
    accumulateInForm347: z.enum(["Yes", "No"]).optional().describe("Accumulate in Form 347"),
    discount: z.number().int().min(0).max(100).optional().describe("Default discount percentage"),
    currency: z.string().optional().describe("ISO currency code lowercase (e.g., 'eur')"),
    language: z.enum(["es", "en", "fr", "de", "it", "ca", "eu"]).optional().describe("Default language"),
    showTradeNameOnDocs: z.boolean().optional().describe("Show trade name on documents"),
    showCountryOnDocs: z.boolean().optional().describe("Show country on documents"),
  })
  .optional();
```

- [ ] **Step 3: Replace CreateContactInputSchema with all API fields**

Replace the existing `CreateContactInputSchema` (lines 60-80) with:

```typescript
/**
 * Create contact input schema
 */
export const CreateContactInputSchema = z.strictObject({
  name: z.string().min(1, { message: "Name is required" }).describe("Contact name (required)"),
  CustomId: z.string().optional().describe("Custom reference identifier"),
  code: z.string().optional().describe("Contact code/reference (NIF/CIF/VAT)"),
  tradeName: z.string().optional().describe("Trade/business name"),
  email: z.string().email().optional().describe("Email address"),
  phone: z.string().optional().describe("Phone number"),
  mobile: z.string().optional().describe("Mobile phone number"),
  type: z
    .enum(["client", "supplier", "lead", "debtor", "creditor"])
    .optional()
    .describe("Contact type"),
  isperson: z.boolean().optional().describe("Is this an individual person (true) or company (false)"),
  iban: z.string().optional().describe("Bank IBAN"),
  swift: z.string().optional().describe("Bank SWIFT/BIC code"),
  sepaRef: z.string().optional().describe("SEPA reference"),
  sepaDate: z.number().optional().describe("SEPA date"),
  clientRecord: z.number().int().optional().describe("Client accounting record number"),
  supplierRecord: z.number().int().optional().describe("Supplier accounting record number"),
  taxOperation: z.enum(["general", "intra", "impexp", "nosujeto", "receq", "exento"]).optional().describe("Tax operation type (Spain)"),
  groupId: z.string().optional().describe("Contact group ID"),
  billAddress: AddressSchema.optional().describe("Billing address"),
  shippingAddresses: z.array(ShippingAddressSchema).optional().describe("Shipping addresses"),
  socialNetworks: SocialNetworksSchema,
  defaults: ContactDefaultsSchema,
  numberingSeries: NumberingSeriesSchema,
  contactPersons: z.array(ContactPersonSchema).optional().describe("Contact persons"),
  tags: TagsSchema,
  note: z.string().optional().describe("Notes about the contact"),
});
```

- [ ] **Step 4: Replace UpdateContactInputSchema with all API fields**

Replace the existing `UpdateContactInputSchema` (lines 87-107) with:

```typescript
/**
 * Update contact input schema
 */
export const UpdateContactInputSchema = z.strictObject({
  contact_id: IdSchema.describe("The contact ID to update"),
  name: z.string().min(1).optional().describe("Contact name"),
  CustomId: z.string().optional().describe("Custom reference identifier"),
  code: z.string().optional().describe("Contact code/reference (NIF/CIF/VAT)"),
  tradeName: z.string().optional().describe("Trade/business name"),
  email: z.string().email().optional().describe("Email address"),
  phone: z.string().optional().describe("Phone number"),
  mobile: z.string().optional().describe("Mobile phone number"),
  type: z
    .enum(["client", "supplier", "lead", "debtor", "creditor"])
    .optional()
    .describe("Contact type"),
  isperson: z.boolean().optional().describe("Is this an individual person (true) or company (false)"),
  iban: z.string().optional().describe("Bank IBAN"),
  swift: z.string().optional().describe("Bank SWIFT/BIC code"),
  sepaRef: z.string().optional().describe("SEPA reference"),
  sepaDate: z.number().optional().describe("SEPA date"),
  clientRecord: z.number().int().optional().describe("Client accounting record number"),
  supplierRecord: z.number().int().optional().describe("Supplier accounting record number"),
  taxOperation: z.enum(["general", "intra", "impexp", "nosujeto", "receq", "exento"]).optional().describe("Tax operation type (Spain)"),
  groupId: z.string().optional().describe("Contact group ID"),
  billAddress: AddressSchema.optional().describe("Billing address"),
  shippingAddresses: z.array(ShippingAddressSchema).optional().describe("Shipping addresses"),
  socialNetworks: SocialNetworksSchema,
  defaults: ContactDefaultsSchema,
  numberingSeries: NumberingSeriesSchema,
  contactPersons: z.array(ContactPersonSchema).optional().describe("Contact persons"),
  tags: TagsSchema,
  note: z.string().optional().describe("Notes about the contact"),
});
```

- [ ] **Step 5: Run build and tests**

Run: `cd /Users/baibaratsky/Workspace/energio/holded-mcp-server && npx tsc --noEmit && npx jest --config jest.config.js`
Expected: Build succeeds, all tests pass.

- [ ] **Step 6: Add test for new contact fields**

In `tests/schema-validation.test.ts`, add this test inside the `describe('Contact Creation', ...)` block:

```typescript
    it('should accept new contact fields', () => {
      const validData = {
        name: 'Test Contact',
        CustomId: 'CUST-001',
        tradeName: 'Test Trading Co',
        sepaRef: 'SEPA-REF-001',
        clientRecord: 4300,
        taxOperation: 'general' as const,
        numberingSeries: { invoice: 'series1', receipt: 'series2' },
        contactPersons: [{ name: 'John Doe', email: 'john@test.com' }],
        defaults: {
          salesTax: 21,
          currency: 'eur',
          language: 'es' as const,
          showTradeNameOnDocs: true,
        },
      };

      const result = CreateContactInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
```

- [ ] **Step 7: Run tests**

Run: `cd /Users/baibaratsky/Workspace/energio/holded-mcp-server && npx jest --config jest.config.js`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/schemas/invoicing/contacts.ts tests/schema-validation.test.ts
git commit -m "feat: add all missing API fields to contact and contact defaults schemas"
```

---

### Task 4: Fix Lead schemas and handler

**Files:**
- Modify: `src/schemas/crm/leads.ts`
- Modify: `src/tools/crm/leads.ts`

- [ ] **Step 1: Update CreateLeadInputSchema imports and add missing fields**

In `src/schemas/crm/leads.ts`, replace the `CreateLeadInputSchema` (lines 37-52) with:

```typescript
/**
 * Create lead input schema
 */
export const CreateLeadInputSchema = z.strictObject({
  name: z.string().min(1, { message: "Name is required" }).describe("Lead name (required)"),
  funnel_id: z.string().optional().describe("Funnel ID to place the lead in"),
  stage_id: z.string().optional().describe("Stage ID within the funnel"),
  contact_id: z.string().optional().describe("Associated contact ID"),
  contact_name: z.string().optional().describe("Contact name"),
  value: z.number().min(0).optional().describe("Monetary value of the lead"),
  potential: z.number().min(0).optional().describe("Potential value of the lead"),
  probability: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Probability of closing (0-100%)"),
  due_date: TimestampSchema.describe("Due date as Unix timestamp"),
  expected_close_date: TimestampSchema.describe("Expected close date as Unix timestamp"),
  assigned_to: z.string().optional().describe("User ID to assign the lead to"),
  notes: z.string().optional().describe("Notes about the lead"),
})
```

- [ ] **Step 2: Replace UpdateLeadInputSchema with all API fields**

Replace the existing `UpdateLeadInputSchema` (lines 59-72) with:

```typescript
/**
 * Update lead input schema
 */
export const UpdateLeadInputSchema = z.strictObject({
  lead_id: IdSchema.describe("The lead ID to update"),
  name: z.string().min(1).optional().describe("Lead name"),
  value: z.number().min(0).optional().describe("Monetary value of the lead"),
  potential: z.number().min(0).optional().describe("Potential value of the lead"),
  probability: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Probability of closing (0-100%)"),
  due_date: TimestampSchema.describe("Due date as Unix timestamp"),
  expected_close_date: TimestampSchema.describe("Expected close date as Unix timestamp"),
  assigned_to: z.string().optional().describe("User ID to assign the lead to"),
  notes: z.string().optional().describe("Notes about the lead"),
  status: z.number().int().optional().describe("Lead status indicator"),
  customFields: z.array(z.strictObject({
    field: z.string().describe("Custom field name"),
    value: z.string().describe("Custom field value"),
  })).optional().describe("Custom field key-value pairs"),
})
```

- [ ] **Step 3: Update create lead handler to map new fields**

In `src/tools/crm/leads.ts`, find the create lead handler (around line 229-239) and replace the request data mapping block:

```typescript
        const requestData: Record<string, unknown> = {
          name: params.name,
        };
        if (params.funnel_id) requestData.funnelId = params.funnel_id;
        if (params.stage_id) requestData.stageId = params.stage_id;
        if (params.contact_id) requestData.contactId = params.contact_id;
        if (params.potential !== undefined) requestData.potential = params.potential;
        if (params.probability !== undefined) requestData.probability = params.probability;
        if (params.expected_close_date) requestData.expectedCloseDate = params.expected_close_date;
        if (params.assigned_to) requestData.assignedTo = params.assigned_to;
        if (params.notes) requestData.notes = params.notes;
```

with:

```typescript
        const requestData: Record<string, unknown> = {
          name: params.name,
        };
        if (params.funnel_id) requestData.funnelId = params.funnel_id;
        if (params.stage_id) requestData.stageId = params.stage_id;
        if (params.contact_id) requestData.contactId = params.contact_id;
        if (params.contact_name) requestData.contactName = params.contact_name;
        if (params.value !== undefined) requestData.value = params.value;
        if (params.potential !== undefined) requestData.potential = params.potential;
        if (params.probability !== undefined) requestData.probability = params.probability;
        if (params.due_date) requestData.dueDate = params.due_date;
        if (params.expected_close_date) requestData.expectedCloseDate = params.expected_close_date;
        if (params.assigned_to) requestData.assignedTo = params.assigned_to;
        if (params.notes) requestData.notes = params.notes;
```

- [ ] **Step 4: Update update lead handler to map new fields**

In `src/tools/crm/leads.ts`, find the update lead handler (around line 290-295) and replace:

```typescript
        const { lead_id, expected_close_date, assigned_to, ...rest } = params;
        const requestData: Record<string, unknown> = { ...rest };
        if (expected_close_date) requestData.expectedCloseDate = expected_close_date;
        if (assigned_to) requestData.assignedTo = assigned_to;
```

with:

```typescript
        const { lead_id, expected_close_date, assigned_to, due_date, ...rest } = params;
        const requestData: Record<string, unknown> = { ...rest };
        if (due_date) requestData.dueDate = due_date;
        if (expected_close_date) requestData.expectedCloseDate = expected_close_date;
        if (assigned_to) requestData.assignedTo = assigned_to;
```

- [ ] **Step 5: Run build and tests**

Run: `cd /Users/baibaratsky/Workspace/energio/holded-mcp-server && npx tsc --noEmit && npx jest --config jest.config.js`
Expected: Build succeeds, all tests pass.

- [ ] **Step 6: Add test for new lead fields**

In `tests/schema-validation.test.ts`, add this test inside the `describe('Lead Creation', ...)` block:

```typescript
    it('should accept new lead fields', () => {
      const validData = {
        name: 'New Lead',
        funnel_id: 'funnel123',
        contact_name: 'John Doe',
        value: 10000,
        potential: 5000,
        due_date: 1730109600,
      };

      const result = CreateLeadInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
```

- [ ] **Step 7: Run tests**

Run: `cd /Users/baibaratsky/Workspace/energio/holded-mcp-server && npx jest --config jest.config.js`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/schemas/crm/leads.ts src/tools/crm/leads.ts tests/schema-validation.test.ts
git commit -m "feat: add value, dueDate, contactName, customFields, status to lead schemas"
```

---

### Task 5: Fix Product schemas

**Files:**
- Modify: `src/schemas/invoicing/products.ts`

- [ ] **Step 1: Add missing fields to CreateProductInputSchema**

In `src/schemas/invoicing/products.ts`, add these fields inside `CreateProductInputSchema` (after `weight` on line 69):

```typescript
  purchasePrice: z.number().min(0).optional().describe("Purchase/supplier price"),
  calculatecost: z.number().optional().describe("Calculated cost value"),
  tags: z.array(z.string()).optional().describe("Product tags"),
```

- [ ] **Step 2: Add missing fields to UpdateProductInputSchema**

In `src/schemas/invoicing/products.ts`, add these fields inside `UpdateProductInputSchema` (after `weight` on line 95):

```typescript
  subtotal: z.number().optional().describe("Product subtotal amount"),
  purchasePrice: z.number().min(0).optional().describe("Purchase/supplier price"),
  tags: z.array(z.string()).optional().describe("Product tags"),
```

- [ ] **Step 3: Run build and tests**

Run: `cd /Users/baibaratsky/Workspace/energio/holded-mcp-server && npx tsc --noEmit && npx jest --config jest.config.js`
Expected: Build succeeds, all tests pass.

- [ ] **Step 4: Add test for new product fields**

In `tests/schema-validation.test.ts`, add this test inside the `describe('Product Creation', ...)` block:

```typescript
    it('should accept new product fields', () => {
      const validData = {
        name: 'Test Product',
        purchasePrice: 50.00,
        tags: ['electronics', 'sale'],
        calculatecost: 45.00,
      };

      const result = CreateProductInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
```

- [ ] **Step 5: Run tests**

Run: `cd /Users/baibaratsky/Workspace/energio/holded-mcp-server && npx jest --config jest.config.js`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/schemas/invoicing/products.ts tests/schema-validation.test.ts
git commit -m "feat: add purchasePrice, tags, calculatecost, subtotal to product schemas"
```

---

### Task 6: Final build and full test run

**Files:** None (verification only)

- [ ] **Step 1: Full build**

Run: `cd /Users/baibaratsky/Workspace/energio/holded-mcp-server && npm run build`
Expected: Compiles successfully to `dist/`

- [ ] **Step 2: Full test suite**

Run: `cd /Users/baibaratsky/Workspace/energio/holded-mcp-server && npm test`
Expected: All 169+ tests pass (plus new tests added in this plan)

- [ ] **Step 3: Note: `receiptnote` deferred to live testing**

The `receiptnote` document type in `src/constants.ts` is not in the API docs. Per the spec, verify with a live API call (`GET /documents/receiptnote`) from the `main` project. If it 404s, remove it from the `DOCUMENT_TYPES` array. If it works, add a comment noting it's undocumented. Similarly, verify lead `funnelId` required vs optional with live API.

- [ ] **Step 4: Verify the server starts**

Run: `cd /Users/baibaratsky/Workspace/energio/holded-mcp-server && echo '{}' | timeout 3 node dist/index.js 2>&1 || true`
Expected: Server starts and prints initialization messages (will exit due to missing API key or stdin close, but should not crash with import/syntax errors)
