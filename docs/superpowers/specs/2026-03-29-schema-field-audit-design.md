# Schema Field Audit & Fix

Comprehensive audit of all Zod input schemas against the live Holded API documentation (https://developers.holded.com/reference), fixing missing fields, type mismatches, and required/optional correctness.

## Goal

Ensure every create/update schema exposes all documented API fields so users can access the full Holded API through MCP tools. Fix correctness bugs that would cause runtime errors.

## Verified API Documentation Source

All fields below are sourced from the live Holded API docs fetched 2026-03-29. The `holded_docs/` cache in the repo was not used.

---

## 1. Correctness Bugs

### 1.1 `date` is optional in CreateDocumentInputSchema but API requires it

**File**: `src/schemas/invoicing/documents.ts:59`

`date` inherits `.optional()` from `TimestampSchema` (defined in `common.ts:63`). The API requires `date` for document creation.

**Fix**: Chain `.unwrap()` or redefine as `z.number().int().positive().describe(...)` (non-optional) for `date` in `CreateDocumentInputSchema`. Same pattern applies to `CreateEntryInputSchema` (already correct there -- it defines its own non-optional date).

### 1.2 `receiptnote` document type

**File**: `src/constants.ts:59`

`receiptnote` is in `DOCUMENT_TYPES` but not in the API docs. The documented types are: `invoice`, `salesreceipt`, `creditnote`, `salesorder`, `proform`, `waybill`, `estimate`, `purchase`, `purchaserefund`, `purchaseorder`.

**Fix**: Verify with a live API call (e.g., `GET /documents/receiptnote`). If it 404s, remove it from `DOCUMENT_TYPES`. If it works, keep it and add a comment noting it's undocumented.

### 1.3 Lead `funnelId` required vs optional

**File**: `src/schemas/crm/leads.ts:39`

API docs say `funnelId` is the only required field for lead creation. Schema has it optional and `name` as required.

**Fix**: Verify with live API. If `funnelId` is truly required, make it required in schema. Keep `name` as required too if the API also enforces it (the docs may be incomplete).

### 1.4 Lead schema has undocumented fields

**File**: `src/schemas/crm/leads.ts:43-51`

Fields `probability`, `expected_close_date`, `assigned_to`, `notes` are in the schema but not in the API docs for create/update lead.

**Fix**: Keep them (they may be undocumented but accepted). Verify with live API. If they cause errors, remove them.

---

## 2. Missing Fields by Schema

### 2.1 DocumentItemSchema

**File**: `src/schemas/invoicing/documents.ts:17-28`

Current fields: `name`, `desc`, `units`, `subtotal`, `tax`, `discount`, `productId`, `sku`, `weight`, `accountingAccount`

| Field to Add | Type | Description |
|---|---|---|
| `serviceId` | `string` optional | Service identifier |
| `accountingAccountId` | `string` optional | Accounting account ID (API uses this, not `accountingAccount`) |
| `taxes` | `array(string)` optional | Multiple tax keys (e.g., `["s_iva_21"]`) |
| `supplied` | `enum("Yes","No")` optional | Whether item has been supplied |
| `tags` | `array(string)` optional | Item tags |
| `kind` | `string` optional | Item kind (for update endpoint) |
| `lotSku` | `string` optional | Required when kind is "lots" (for update) |

**Also fix**: Rename `accountingAccount` to `accountingAccountId` to match the API field name. No backwards compatibility needed.

### 2.2 CreateDocumentInputSchema

**File**: `src/schemas/invoicing/documents.ts:55-70`

Current fields: `doc_type`, `contactId`, `contactName`, `date`, `dueDate`, `currencyChange`, `items`, `notes`, `salesChannel`, `docNumber`, `numSerieId`

| Field to Add | Type | Description |
|---|---|---|
| `desc` | `string` optional | Document description |
| `language` | `string` optional | Document language code |
| `currency` | `string` optional | ISO currency code (e.g., "eur") |
| `contactCode` | `string` optional | Contact NIF/CIF/VAT identifier |
| `contactEmail` | `string` optional | Contact email |
| `contactAddress` | `string` optional | Contact street address |
| `contactCity` | `string` optional | Contact city |
| `contactCp` | `string` optional | Contact postal code |
| `contactProvince` | `string` optional | Contact province |
| `contactCountryCode` | `string` optional | Contact country code |
| `approveDoc` | `boolean` optional | Auto-approve document (default false) |
| `applyContactDefaults` | `boolean` optional | Apply contact defaults (default true) |
| `designId` | `string` optional | Document design template ID |
| `warehouseId` | `string` optional | Warehouse ID (for salesorder/purchaseorder/waybill) |
| `paymentMethodId` | `string` optional | Payment method ID |
| `salesChannelId` | `string` optional | Sales channel ID |
| `shippingAddress` | `string` optional | Shipping street address |
| `shippingPostalCode` | `string` optional | Shipping postal code |
| `shippingCity` | `string` optional | Shipping city |
| `shippingProvince` | `string` optional | Shipping province |
| `shippingCountry` | `string` optional | Shipping country |
| `customFields` | `array({field,value})` optional | Custom field key-value pairs |
| `tags` | `array(string)` optional | Document tags |
| `directDebitProvider` | `string` optional | e.g., "gocardless" |

**Also fix**:
- Rename `salesChannel` to `salesChannelId` to match API
- Rename `docNumber` to `invoiceNum` to match API
- Make `date` required (see bug 1.1)

### 2.3 UpdateDocumentInputSchema

**File**: `src/schemas/invoicing/documents.ts:77-88`

The update endpoint accepts a different set of fields than create (no contact* or shipping* fields). Add these fields:

| Field to Add | Type | Description |
|---|---|---|
| `desc` | `string` optional | Document description |
| `language` | `string` optional | Language code |
| `paymentMethod` | `string` optional | Payment method ID |
| `warehouseId` | `string` optional | Warehouse ID |
| `salesChannelId` | `string` optional | Sales channel ID |
| `expAccountId` | `string` optional | Expenses account ID |
| `customFields` | `array({field,value})` optional | Custom fields |

**Also fix**: Rename `salesChannel` to `salesChannelId` to match API.

### 2.4 CreateContactInputSchema

**File**: `src/schemas/invoicing/contacts.ts:60-80`

Current fields: `name`, `code`, `email`, `phone`, `mobile`, `type`, `isperson`, `iban`, `swift`, `billAddress`, `shippingAddresses`, `socialNetworks`, `defaults`, `tags`, `note`, `groupId`

| Field to Add | Type | Description |
|---|---|---|
| `CustomId` | `string` optional | Custom reference identifier |
| `tradeName` | `string` optional | Trade/business name |
| `sepaRef` | `string` optional | SEPA reference |
| `sepaDate` | `number` optional | SEPA date |
| `clientRecord` | `integer` optional | Client accounting record |
| `supplierRecord` | `integer` optional | Supplier accounting record |
| `taxOperation` | `enum` optional | Spain tax operation: general, intra, impexp, nosujeto, receq, exento |
| `numberingSeries` | `object` optional | Numbering series IDs by doc type (invoice, receipt, salesOrder, purchasesOrder, proform, waybill) |
| `contactPersons` | `array` optional | Array of {name (required), phone, email} |

### 2.5 UpdateContactInputSchema

**File**: `src/schemas/invoicing/contacts.ts:87-107`

Add same missing fields as create (2.4), plus already has `tradeName`.

Also add: `sepaRef`, `sepaDate`, `clientRecord`, `supplierRecord`, `taxOperation`, `numberingSeries`, `contactPersons`, `CustomId`, `tags`, `note`.

### 2.6 ContactDefaultsSchema

**File**: `src/schemas/invoicing/contacts.ts:49-55`

Current fields: `salesChannel`, `paymentMethod`, `paymentDay`, `dueDays`

| Field to Add | Type | Description |
|---|---|---|
| `expensesAccountRecord` | `integer` optional | Default expenses account record |
| `expensesAccountName` | `string` optional | Default expenses account name |
| `salesAccountRecord` | `integer` optional | Default sales account record |
| `salesAccountName` | `string` optional | Default sales account name |
| `salesTax` | `integer` optional | Default sales tax percentage |
| `purchasesTax` | `integer` optional | Default purchases tax percentage |
| `accumulateInForm347` | `enum("Yes","No")` optional | Accumulate in Form 347 |
| `discount` | `integer` optional | Default discount percentage |
| `currency` | `string` optional | ISO currency code lowercase |
| `language` | `enum` optional | es, en, fr, de, it, ca, eu |
| `showTradeNameOnDocs` | `boolean` optional | Show trade name on documents |
| `showCountryOnDocs` | `boolean` optional | Show country on documents |

### 2.7 ShippingAddressSchema

The `AddressSchema` from `common.ts` is used for shipping addresses, but the API's shipping address objects have additional fields.

| Field to Add (to shipping address items) | Type | Description |
|---|---|---|
| `name` | `string` optional | Address label/name |
| `notes` | `string` optional | Public notes |
| `privateNote` | `string` optional | Private notes |

**Fix**: Create a `ShippingAddressSchema` extending `AddressSchema` with these extra fields, or add them to a separate schema used only for `shippingAddresses` array items.

### 2.8 CreateLeadInputSchema

**File**: `src/schemas/crm/leads.ts:37-52`

| Field to Add | Type | Description |
|---|---|---|
| `value` | `integer` optional | Monetary value of the lead |
| `dueDate` | `integer` optional | Due date as Unix timestamp |
| `contactName` | `string` optional | Contact name |

### 2.9 UpdateLeadInputSchema

**File**: `src/schemas/crm/leads.ts:59-72`

| Field to Add | Type | Description |
|---|---|---|
| `value` | `integer` optional | Monetary value |
| `dueDate` | `integer` optional | Due date as Unix timestamp |
| `customFields` | `array({field,value})` optional | Custom field key-value pairs |
| `status` | `integer` optional | Lead status indicator |

### 2.10 CreateProductInputSchema

**File**: `src/schemas/invoicing/products.ts`

| Field to Add | Type | Description |
|---|---|---|
| `purchasePrice` | `number` optional | Purchase/supplier price |
| `tags` | `array(string)` optional | Product tags |
| `calculatecost` | `number` optional | Calculated cost value |

### 2.11 UpdateProductInputSchema

**File**: `src/schemas/invoicing/products.ts`

| Field to Add | Type | Description |
|---|---|---|
| `subtotal` | `number` optional | Product subtotal amount |
| `purchasePrice` | `number` optional | Purchase/supplier price |
| `tags` | `array(string)` optional | Product tags |

---

## 3. Schemas with No Gaps

These were verified and match the API docs:

- **CreateProjectInputSchema** - only `name` required, matches API
- **CreateTaskInputSchema** - `name`, `project_id`, `list_id` required, matches API
- **CreateEmployeeInputSchema** - `name`, `lastName`, `email` required, matches API
- **UpdateEmployeeInputSchema** - comprehensive, matches API
- **CreateEntryInputSchema** - `date`, `lines`, `notes`, matches API with good validation
- **CreateAccountInputSchema** - `prefix`, `name`, `color`, matches API
- **Booking schemas** - all fields correct
- **Funnel schemas** - match API
- **Event schemas** - match API

---

## 4. Tool Handler Updates

After schema changes, the tool handler code in `src/tools/` needs corresponding updates:

- **Document create/update handlers**: Map any new snake_case schema fields to camelCase API fields in the request body construction
- **Contact create/update handlers**: Pass through new nested objects (`numberingSeries`, `contactPersons`, etc.)
- **Lead create/update handlers**: Map `value`, `dueDate`, `contactName` to API request

The handlers already use a pattern of explicitly mapping fields (e.g., `if (params.field) requestData.field = params.field`). New fields need to be added to these mappings.

---

## 5. Verification Plan

After implementation:

1. `npm run build` - must compile without errors
2. `npm test` - existing tests must pass
3. Live API verification (done by user from `main` project):
   - Test `receiptnote` document type
   - Test lead creation with/without `funnelId`
   - Test undocumented lead fields (`probability`, `assigned_to`, `notes`)
   - Test document creation with new fields (shipping address, custom fields)
   - Test contact creation with full defaults object
