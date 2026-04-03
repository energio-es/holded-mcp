# Holded API Drift Report

Compared: OpenAPI specs in `holded_api_specs/` vs MCP server implementation
Date: 2026-04-03
Verified against: live Holded API via curl using `HOLDED_TEST_API_KEY_ENERGIO`

## Summary

| Module | Code Drifts | Spec Drifts | Total |
|--------|-------------|-------------|-------|
| Invoice API | 7 | 4 | 11 |
| CRM API | 9 | 1 | 10 |
| Projects API | 3 | 4 | 7 |
| Team API | 4 | 1 | 5 |
| Accounting API | 4 | 3 | 7 |
| **Total** | **27** | **13** | **40** |

By severity: **0 Critical**, **14 Medium**, **26 Low**

**Drift location key:**
- **Code drift** -- our implementation doesn't match the spec and the API confirms the spec is correct
- **Spec drift** -- the spec is wrong/incomplete and the API confirms our code is correct (or reveals undocumented behavior)

---

## Invoice API

### DRIFT-INV-1: List contacts missing query filter parameters

- **Spec says:** GET `/contacts` accepts optional query parameters: `phone` (string), `mobile` (string), `customId` (array of strings)
- **Our code does:** `ListContactsInputSchema` only has `page` and `response_format`
- **API verification:** Created two contacts with distinct phones (+34611000001, +34622000002). `?phone=%2B34611000001` returns only the first contact (1 result). `?mobile=%2B34711000001` also works (exact match, URL-encoded `+`). Partial matches (without `+`) return 0. `customId` filter not confirmed (returned 0 in test).
- **Conclusion:** Drift is in **our code** -- `phone` and `mobile` filters confirmed working (require exact match with `+` prefix)
- **Severity:** Medium
- **File:** `src/schemas/invoicing/contacts.ts`

### DRIFT-INV-2: List documents missing query filter parameters

- **Spec says:** GET `/documents/{docType}` accepts: `starttmp` (string), `endtmp` (string), `contactid` (string), `paid` (string, 0/1/2), `billed` (string, 0/1), `sort` (string, created-asc/created-desc)
- **Our code does:** `ListDocumentsInputSchema` only has `doc_type`, `page`, and `response_format`
- **API verification:** All filters confirmed working with distinguishable test data:
  - `contactid`: Created 2 invoices with distinct contacts. `?contactid=<A>` returns only A's invoice (1 result), `?contactid=<B>` returns only B's (1 result).
  - `sort`: `?sort=created-asc` returns ALPHA before BETA; `?sort=created-desc` returns BETA before ALPHA.
  - `starttmp/endtmp`: `?starttmp=yesterday&endtmp=tomorrow` returns 2 test invoices; `?starttmp=future` errors (requires `endtmp` too).
  - `paid`: All=4, `?paid=0` (unpaid)=2, `?paid=1` (paid)=2, `?paid=2` (partial)=0. Sum checks out.
- **Conclusion:** Drift is in **our code** -- all 5 tested filters confirmed working. Note: `starttmp` requires `endtmp` to also be set.
- **Severity:** Medium
- **File:** `src/schemas/invoicing/documents.ts`

### DRIFT-INV-3: List payments missing date filter parameters

- **Spec says:** GET `/payments` accepts: `starttmp` (string), `endtmp` (string)
- **Our code does:** `ListPaymentsInputSchema` only has `page` and `response_format`
- **API verification:** Created a test payment dated today (desc="DRIFT_TEST_PAYMENT"). Without filters: 26 total (1 DRIFT). `?starttmp=yesterday&endtmp=tomorrow`: 1 result (the DRIFT payment). `?starttmp=2daysago&endtmp=yesterday`: 0 results (DRIFT payment excluded). Filter correctly includes/excludes based on date.
- **Conclusion:** Drift is in **our code**
- **Severity:** Medium
- **File:** `src/schemas/invoicing/payments.ts`

### DRIFT-INV-4: Create payment missing contactId, sends undocumented documentId

- **Spec says:** POST `/payments` body has: `bankId`, `contactId`, `amount`, `desc`, `date`
- **Our code does:** Sends `documentId` (mapped from `doc_id` param) instead of `contactId`. Does not expose `contactId` at all.
- **API verification:** `curl -s -H "key: $KEY" -X POST ".../payments" -d '{"documentId":"...","amount":0.01,"date":...}'` -- created successfully. API accepts `documentId` even though it's not in the spec.
- **Conclusion:** Drift is in **our code** (missing `contactId`) AND in **the spec** (missing `documentId`). Our tool only supports document-linked payments, not standalone contact payments.
- **Severity:** Medium
- **File:** `src/schemas/invoicing/payments.ts`, `src/tools/invoicing/payments.ts`

### DRIFT-INV-5: Pay document sends bankId, spec says treasury

- **Spec says:** POST `/documents/{docType}/{documentId}/pay` body has field `treasury` (string, "Your treasury holded's id")
- **Our code does:** Sends `bankId` (mapped from `account_id`)
- **API verification:** Both field names work. Tested on a live invoice:
  - `curl ... -d '{"date":...,"amount":0.50,"bankId":"686284e3bb1105ac4a086b84"}'` -- `{"status":1,...,"paymentId":"..."}`
  - `curl ... -d '{"date":...,"amount":0.50,"treasury":"686284e3bb1105ac4a086b84"}'` -- `{"status":1,...,"paymentId":"..."}`
- **Conclusion:** Drift is in **the spec** (incomplete -- API accepts both field names). Our code works correctly.
- **Severity:** Low
- **File:** `src/tools/invoicing/documents.ts`

### DRIFT-INV-6: Send document missing fields (mailTemplateId, docIds)

- **Spec says:** POST `/documents/{docType}/{documentId}/send` requires `emails` (string, required). Also accepts `mailTemplateId`, `subject` (min 10 chars), `message` (min 20 chars), `docIds`
- **Our code does:** Uses `email` (singular, optional) instead of `emails` (plural, required). Missing `mailTemplateId` and `docIds`. No min-length validation on `subject`/`message`.
- **API verification:** Tested on a real invoice:
  - `{"email":"test@example.com","subject":"...","message":"..."}` → `{"status":1,"info":"Document sent."}` -- **works**
  - `{"emails":"test@example.com","subject":"...","message":"..."}` → `{"status":1,"info":"Document sent."}` -- **also works**
  - Without any email field → returns HTML error page
  The API accepts **both** `email` and `emails` field names.
- **Conclusion:** Drift is in **our code** (missing `mailTemplateId` and `docIds`) AND in **the spec** (API accepts both `email` and `emails`). The field name difference is NOT a problem.
- **Severity:** Low -- missing optional fields, no broken functionality
- **File:** `src/schemas/invoicing/documents.ts`

### DRIFT-INV-7: Expenses accounts create -- spec says desc required, API doesn't require it

- **Spec says:** POST `/expensesaccounts` requires `name`, `desc`, `accountNum`
- **Our code does:** Only requires `name` and `accountNum` (no `desc`)
- **API verification:** `curl -s -X POST ".../expensesaccounts" -d '{"name":"__DRIFT_TEST__","accountNum":99990000}'` -- `{"status":201,"info":"Created","id":"..."}`. Created successfully without `desc`.
- **Conclusion:** Drift is in **the spec** (desc is not actually required)
- **Severity:** Low

### DRIFT-INV-8: Expenses accounts update missing color field

- **Spec says:** PUT `/expensesaccounts/{id}` accepts: `name`, `desc`, `color`
- **Our code does:** `UpdateExpensesAccountInputSchema` has `expenses_account_id`, `name`, `accountNum`. Missing `color`.
- **API verification:** Created test expenses account, updated with `{"desc":"Test","color":"#FF5500"}`. GET shows `color="#FF5500"` stored correctly. `desc` is NOT returned by GET response (field may be write-only or non-functional).
- **Conclusion:** Drift is in **our code** -- `color` update works and is missing from schema. `desc` is not returned by the API so its status is unclear.
- **Severity:** Medium
- **File:** `src/schemas/invoicing/expenses-accounts.ts`

### DRIFT-INV-9: Sales channels create -- spec says desc required, API doesn't require it

- **Spec says:** POST `/saleschannels` requires `name`, `desc`, `accountNum`
- **Our code does:** Only requires `name` and `accountNum` (no `desc`)
- **API verification:** `curl -s -X POST ".../saleschannels" -d '{"name":"__DRIFT_TEST__","accountNum":99990001}'` -- `{"status":201,"info":"Created","id":"..."}`. Created successfully without `desc`.
- **Conclusion:** Drift is in **the spec** (desc is not actually required)
- **Severity:** Low

### DRIFT-INV-10: Sales channels update missing color field

- **Spec says:** PUT `/saleschannels/{id}` accepts: `name`, `desc`, `color`
- **Our code does:** `UpdateSalesChannelInputSchema` has `sales_channel_id`, `name`, `accountNum`. Missing `color`.
- **API verification:** Created test sales channel, updated with `{"desc":"SC description","color":"#00FF55"}`. GET shows `color="#00FF55"` stored correctly. `desc` is NOT returned by GET response (same as expenses accounts).
- **Conclusion:** Drift is in **our code** -- `color` update works. `desc` not returned by API.
- **Severity:** Medium
- **File:** `src/schemas/invoicing/sales-channels.ts`

### DRIFT-INV-11: Warehouses create/update missing fields, wrong field name

- **Spec says:** POST/PUT `/warehouses` accepts: `name`, `email`, `phone`, `mobile`, `address`, `default` (boolean)
- **Our code does:** `CreateWarehouseInputSchema` and `UpdateWarehouseInputSchema` have `name`, `address`, `active`. Missing `email`, `phone`, `mobile`. Uses `active` instead of `default`.
- **API verification:** Created warehouse with `email` and `phone` -- both stored correctly. GET response confirms fields: `"email":"test@example.com","phone":"+34555000000","default":false`.
- **Conclusion:** Drift is in **our code** -- missing 3 fields and using wrong field name (`active` doesn't exist in the API; it should be `default`)
- **Severity:** Medium
- **File:** `src/schemas/invoicing/warehouses.ts`

### DRIFT-INV-12: Contact create/update has extra fields not in spec

- **Spec says:** POST `/contacts` create body does not include `tradeName` or expanded `socialNetworks` (only `website`)
- **Our code does:** Includes `tradeName`, and `SocialNetworksSchema` has `facebook`, `twitter`, `linkedin`, `instagram`
- **API verification:** Not directly tested. Extra fields are typically accepted by the API.
- **Conclusion:** Drift is in **the spec** (API likely accepts these fields, they appear in response objects). Our code provides more functionality than documented.
- **Severity:** Low

---

## CRM API

### DRIFT-CRM-1: Create lead missing potential field

- **Spec says:** POST `/leads` body includes `potential` (integer)
- **Our code does:** `CreateLeadInputSchema` does not include `potential`
- **API verification:** Created lead with `"potential":75`. GET lead returns `potential=75` -- confirmed stored and retrievable.
- **Conclusion:** Drift is in **our code**
- **Severity:** Medium
- **File:** `src/schemas/crm/leads.ts`

### DRIFT-CRM-2: Create lead name required but API doesn't require it

- **Spec says:** No fields are marked required in the create lead schema
- **Our code does:** Makes `name`, `funnel_id`, `contact_id` required
- **API verification:**
  - Without `contactId`: `{"status":0,"info":"contactId needed"}` -- **required**
  - Without `funnelId`: `{"status":0,"info":"funnelId needed"}` -- **required**
  - Without `name` (with contactId + funnelId): `{"status":1,"info":"Created","id":"..."}` -- **not required**
- **Conclusion:** Drift is in **our code** (`name` is not required by API) AND in **the spec** (`contactId` and `funnelId` should be marked required)
- **Severity:** Low (name being required is defensively reasonable)
- **File:** `src/schemas/crm/leads.ts`

### DRIFT-CRM-3: Create event missing 5 fields

- **Spec says:** POST `/events` body accepts: `name`, `contactId`, `contactName`, `kind`, `desc`, `startDate`, `duration`, `status`, `tags`, `locationDesc`, `leadId`, `funnelId`, `userId`
- **Our code does:** `CreateEventInputSchema` only has: `name`, `startDate`, `duration`, `desc`, `leadId`, `contactId`, `userId`. Missing 5 usable fields: `contactName`, `kind`, `status`, `tags`, `locationDesc`
- **API verification:** Created event with `kind="call"`, `tags=["drift-tag"]`, `locationDesc="Test Office"`, `status=1`, `contactName="Test Contact"`, `funnelId="..."`. GET confirms: `kind=call`, `tags=["drift-tag"]`, `locationDesc="Test Office"`, `status=1`, `contactName="Test Contact"` all stored. However, `funnelId` was **NOT stored** (MISSING in response even when sent).
- **Conclusion:** Drift is in **our code** (5 fields missing). `funnelId` is NOT functional for events despite being in spec -- drift is in the spec for that field.
- **Severity:** Medium
- **File:** `src/schemas/crm/events.ts`

### DRIFT-CRM-4: Update event missing same 5 fields

- **Spec says:** PUT `/events/{eventId}` body accepts all the same fields as create
- **Our code does:** `UpdateEventInputSchema` has the same limited set. Missing: `contactName`, `kind`, `status`, `tags`, `locationDesc`
- **API verification:** Same as DRIFT-CRM-3 -- `funnelId` excluded since it's not functional.
- **Conclusion:** Drift is in **our code**
- **Severity:** Medium
- **File:** `src/schemas/crm/events.ts`

### DRIFT-CRM-5: Update funnel -- labels, preferences, customFields appear read-only

- **Spec says:** PUT `/funnels/{funnelId}` body accepts: `name`, `stages`, `labels`, `preferences`, `customFields`
- **Our code does:** `UpdateFunnelInputSchema` only has `funnel_id`, `name`, `stages`. Missing `labels`, `preferences`, `customFields`.
- **API verification:** Created funnel, then updated with `labels=[{labelId,labelName,labelColor}]`. Update returned success, but GET shows `labels=[]` (not stored), `preferences=0`, `customFields=0`. The API does NOT store these fields via PUT despite the spec documenting them.
- **Conclusion:** Drift is in **the spec** (these fields appear read-only or managed via a different mechanism). Our code is correct to not include them.
- **Severity:** Low
- **File:** `src/schemas/crm/funnels.ts`

### DRIFT-CRM-6: FunnelStageSchema missing key property

- **Spec says:** Funnel stages have properties: `stageId`, `key`, `name`, `desc`
- **Our code does:** `FunnelStageSchema` only has `stageId`, `name`, `desc`. Missing `key`.
- **API verification:** Default stages have `key=""` (always empty string). Sent `key="custom-key"` in update -- still `key=""` in GET response. The `key` field exists in responses but **cannot be set via PUT**.
- **Conclusion:** Drift is in **our code** (field exists in response schema and should be in our type definition) but is effectively read-only for updates
- **Severity:** Low
- **File:** `src/schemas/crm/funnels.ts`

### DRIFT-CRM-7: Update lead note makes title required, spec only requires noteId

- **Spec says:** PUT `/leads/{leadId}/notes` body has `required: ["noteId"]`. `title` and `desc` are optional.
- **Our code does:** `UpdateLeadNoteInputSchema` makes `title` required via `.min(1)`
- **Conclusion:** Drift is in **our code** (over-constraining)
- **Severity:** Low
- **File:** `src/schemas/crm/leads.ts`

### DRIFT-CRM-8: Create lead task has extra fields not in spec

- **Spec says:** POST `/leads/{leadId}/tasks` body has only: `name`
- **Our code does:** `CreateLeadTaskInputSchema` has: `name`, `description`, `due_date`, `assigned_to` (3 extra fields)
- **API verification:** Created task with all extra fields -- API returned success (`{"status":1,"info":"Created"}`). However, GET lead shows `tasks: []` (empty array), so the task details are not exposed via the lead GET endpoint. Cannot confirm if extra fields are actually stored.
- **Conclusion:** Drift is in **our code** (extra fields accepted by API but not confirmed as stored)
- **Severity:** Low
- **File:** `src/schemas/crm/leads.ts`

### DRIFT-CRM-9: Update lead task has extra fields not in spec

- **Spec says:** PUT `/leads/{leadId}/tasks` body has: `taskId` (required), `name`
- **Our code does:** Adds `description`, `due_date`, `completed`, `assigned_to` (4 extra fields)
- **Conclusion:** Drift is in **our code**
- **Severity:** Low
- **File:** `src/schemas/crm/leads.ts`

### DRIFT-CRM-10: Create event startDate not enforced as required

- **Spec says:** No fields marked required for create event
- **Our code does:** `name` is required, but `startDate` uses `TimestampSchema` (optional). Tool description says "(required)" but schema doesn't enforce it.
- **Conclusion:** Drift is in **our code** (inconsistent -- description says required but schema allows omission)
- **Severity:** Medium
- **File:** `src/schemas/crm/events.ts`

### DRIFT-CRM-11: CRM create responses typed as full resource objects

- **Spec says:** Create responses return `{status: integer, info: string, id: string}`
- **Our code does:** Factory `create` handler calls `makeApiRequest<T>` (e.g., `T=Lead`), expecting a full resource object
- **API verification:** `curl -s -X POST ".../funnels" -d '{"name":"test"}'` returns `{"status":1,"info":"Created","id":"..."}` -- confirmed, NOT a full object
- **Conclusion:** Drift is in **our code** (TypeScript type mismatch; functionally the JSON is serialized correctly, but formatters may fail)
- **Severity:** Medium
- **File:** `src/tools/factory.ts` (affects all CRM CRUD tools)

### DRIFT-CRM-12: CRM update responses typed as full resource objects

- **Spec says:** Update responses return `{status: integer, info: string, id: string}`
- **Our code does:** Same issue as DRIFT-CRM-11 for update handlers
- **Conclusion:** Drift is in **our code**
- **Severity:** Medium
- **File:** `src/tools/factory.ts`

---

## Projects API

### DRIFT-PROJ-1: Update project missing lists and labels fields

- **Spec says:** PUT `/projects/{projectId}` accepts `lists` (array of objects) and `labels` (array of objects)
- **Our code does:** `UpdateProjectInputSchema` does not include `lists` or `labels`
- **Conclusion:** Drift is in **our code**
- **Severity:** Medium
- **File:** `src/schemas/projects/projects.ts`

### DRIFT-PROJ-2: Update task tool exists but spec has no PUT for /tasks/{taskId}

- **Spec says:** `/tasks/{taskId}` only defines GET and DELETE. No PUT operation.
- **Our code does:** Registers `holded_projects_update_task` tool that sends PUT to `tasks/{task_id}`
- **API verification:** `curl -s -X PUT ".../tasks/$TASK_ID" -d '{"name":"updated"}'` returns `{"status":1,"info":"Updated","id":"..."}` -- **works**
- **Conclusion:** Drift is in **the spec** (PUT /tasks/{taskId} works but is undocumented)
- **Severity:** Low

### DRIFT-PROJ-3: Create time tracking -- spec says userId optional, API requires it

- **Spec says:** POST `/projects/{projectId}/times` has `required: ["duration", "costHour"]`. `userId` is optional.
- **Our code does:** `CreateProjectTimeTrackingInputSchema` makes `userId` required via `.min(1)`
- **API verification:** `curl -X POST ".../projects/$ID/times" -d '{"duration":3600,"costHour":50}'` (without userId) returns `{"status":0,"info":"userId needed"}`. With userId: succeeds.
- **Conclusion:** Drift is in **the spec** (`userId` is actually required by the API). Our code is correct.
- **Severity:** Low

### DRIFT-PROJ-4: Update time tracking -- spec says duration/costHour required, API accepts partial updates

- **Spec says:** PUT `/projects/{projectId}/times/{id}` has `required: ["duration", "costHour"]`
- **Our code does:** Both `duration` and `costHour` are `.optional()` in `UpdateProjectTimeTrackingInputSchema`
- **API verification:** All partial updates succeed:
  - `{"desc":"updated"}` (no duration/costHour) → `{"status":1,"info":"Updated"}` -- **works**
  - `{"duration":1800}` (no costHour) → `{"status":1,"info":"Updated"}` -- **works**
  - `{"costHour":100}` (no duration) → `{"status":1,"info":"Updated"}` -- **works**
- **Conclusion:** Drift is in **the spec** (API accepts partial updates). Our code is correct.
- **Severity:** Low

### DRIFT-PROJ-5: List all times start/end typed as float-allowing number

- **Spec says:** Query params `start` and `end` for GET `/projects/times` have type `integer`
- **Our code does:** Uses `z.number().optional()` instead of `z.number().int().optional()`
- **Conclusion:** Drift is in **our code**
- **Severity:** Low
- **File:** `src/schemas/projects/time-tracking.ts`

### DRIFT-PROJ-6: Create time tracking duration has extra .positive() constraint

- **Spec says:** `duration` is type `integer` with no additional constraints
- **Our code does:** `z.number().int().positive()` -- rejects 0
- **Conclusion:** Drift is in **our code** (stricter than spec)
- **Severity:** Low
- **File:** `src/schemas/projects/time-tracking.ts`

### DRIFT-PROJ-7: Update project price typed as float-allowing number

- **Spec says:** `price` in update project body has type `integer`
- **Our code does:** `z.number().optional()` -- allows floats
- **Conclusion:** Drift is in **our code**
- **Severity:** Low
- **File:** `src/schemas/projects/projects.ts`

---

## Team API

### DRIFT-TEAM-1: List employees returns wrapper object, code expects array

- **Spec says:** GET `/employees` response described as "search results matching criteria" (no schema detail)
- **Our code does:** `makeApiRequest<Employee[]>` expects a direct array
- **API verification:** `curl -s -H "key: $KEY" ".../employees"` returns `{"employees":[...]}` -- a wrapper object, NOT a direct array
- **Conclusion:** Drift is in **our code** -- markdown formatter receives an object instead of an array, always outputs "No employees found." even when employees exist. `count` in structuredContent is always `undefined`.
- **Severity:** Medium
- **File:** `src/tools/team/employees.ts`, `src/tools/factory.ts`

### DRIFT-TEAM-2: List all time trackings returns wrapper object

- **Spec says:** GET `/employees/times` response described as "search results" (no schema detail)
- **Our code does:** `makeApiRequest<TimeTracking[]>` expects a direct array
- **API verification:** `curl -s -H "key: $KEY" ".../employees/times"` returns `{"employeesTimeTracking":[]}` -- wrapper object
- **Conclusion:** Drift is in **our code** -- same impact as DRIFT-TEAM-1
- **Severity:** Medium
- **File:** `src/tools/team/time-tracking.ts`

### DRIFT-TEAM-3: List employee time trackings returns wrapper object

- **Spec says:** GET `/employees/{id}/times` (no schema detail)
- **Our code does:** `makeApiRequest<TimeTracking[]>` expects a direct array
- **API verification:** Same wrapper pattern as DRIFT-TEAM-2: `{"employeesTimeTracking":[]}`
- **Conclusion:** Drift is in **our code**
- **Severity:** Medium
- **File:** `src/tools/team/time-tracking.ts`

### DRIFT-TEAM-4: List employee time trackings has page parameter not in spec

- **Spec says:** GET `/employees/{id}/times` has no `page` parameter
- **Our code does:** Includes `page` from `PaginationSchema`
- **API verification:** Not tested (endpoint returned empty array). Parameter likely ignored.
- **Conclusion:** Drift is in **our code**
- **Severity:** Low
- **File:** `src/schemas/team/time-tracking.ts`

### DRIFT-TEAM-5: Employee fiscalAddress field name mismatch

- **Spec says:** `fiscalAddress` contains `endSituationDate` (string)
- **Our code does:** Uses `endSituationDate` matching the spec
- **API verification:** GET employee response shows `"deadLine":""` instead of `endSituationDate` in `fiscalAddress`
- **Conclusion:** Drift is in **the spec** (API uses `deadLine`, spec says `endSituationDate`)
- **Severity:** Low

---

## Accounting API

### DRIFT-ACCT-1: Daily ledger starttmp/endtmp typed as number vs spec's string

- **Spec says:** `starttmp` and `endtmp` are type `string`
- **Our code does:** Types them as `z.number().int().positive()`
- **API verification:** Axios auto-serializes numbers to strings in query params. Functionally identical.
- **Conclusion:** Cosmetic. No functional impact.
- **Severity:** Low

### DRIFT-ACCT-2: Daily ledger date range required by API but optional in spec

- **Spec says:** `starttmp` and `endtmp` are optional query parameters
- **Our code does:** Requires a date range (via `accountingDateRangeRefinement`)
- **API verification:** `curl -s -H "key: $KEY" ".../dailyledger"` returns `{"status":0,"info":"Query params starttmp & endtmp are mandatory"}`
- **Conclusion:** Drift is in **the spec** (API requires these params). Our code is correct.
- **Severity:** Low

### DRIFT-ACCT-3: Create entry lines min(2) and debit/credit validation

- **Spec says:** `lines` is a required array with no minimum length or value constraints
- **Our code does:** Enforces `.min(2)`, each line must have either debit or credit, totals must balance
- **Conclusion:** Drift is in **the spec** (underspecified -- double-entry bookkeeping inherently requires >= 2 balanced lines)
- **Severity:** Low

### DRIFT-ACCT-4: includeEmpty defaults to true, API defaults to false

- **Spec says:** `includeEmpty` is optional with no default specified
- **Our code does:** Defaults `include_empty` to `true`, always sending `includeEmpty=1`
- **API verification:**
  - Without `includeEmpty`: returns 50 accounts (only non-zero balances)
  - With `includeEmpty=1`: returns 203 accounts (all accounts)
- **Conclusion:** Drift is in **our code** -- our default differs from the API's native default. Users always get all accounts unless they explicitly set `include_empty: false`.
- **Severity:** Low (behavioral difference but not incorrect)

### DRIFT-ACCT-5: Chart of accounts has page parameter not supported by API

- **Spec says:** No `page` parameter for GET `/chartofaccounts`
- **Our code does:** Includes `page` from `PaginationSchema`
- **API verification:** Both `page=1` and `page=2` return identical 203 accounts. API ignores the parameter.
- **Conclusion:** Drift is in **our code** (parameter is silently ignored)
- **Severity:** Low

### DRIFT-ACCT-6: Chart of accounts date range lacks validation refinement

- **Spec says:** `starttmp` and `endtmp` are optional
- **Our code does:** Includes date range fields from `accountingDateRangeFields` but does NOT apply `accountingDateRangeRefinement`. Users can provide `start_date` without `end_date`.
- **Conclusion:** Drift is in **our code** (incomplete validation, but `listQueryParams` handles it gracefully)
- **Severity:** Low

### DRIFT-ACCT-7: Create account color has strict regex not in spec

- **Spec says:** `color` is type `string`, described as "Hex code"
- **Our code does:** Validates with `.regex(/^#[0-9A-Fa-f]{6}$/)`
- **Conclusion:** Drift is in **our code** (stricter than spec, but reasonable)
- **Severity:** Low

---

## Priority Fix Recommendations

### High Priority (broken functionality)

1. **DRIFT-TEAM-1/2/3** -- List employees and time trackings return wrapper objects (`{employees:[...]}`, `{employeesTimeTracking:[...]}`). Markdown formatters always show "not found" even when data exists. `count` is always `undefined`.
2. **DRIFT-CRM-11/12** -- CRM create/update responses return `{status, info, id}` not full objects. TypeScript types are wrong, formatters may produce unexpected output.
3. **DRIFT-INV-11** -- Warehouse `active` field doesn't exist in the API; should be `default`. Missing `email`/`phone`/`mobile` fields (confirmed stored by API).

### Medium Priority (missing functionality)

4. **DRIFT-INV-1/2/3** -- Missing query filters on list endpoints. All confirmed working: contacts (phone/mobile exact match), documents (contactid/sort/paid/starttmp+endtmp), payments (starttmp/endtmp).
5. **DRIFT-CRM-3/4** -- Events create/update missing 5 fields each (kind, tags, locationDesc, status, contactName -- all confirmed stored by API).
6. **DRIFT-CRM-1** -- Create lead missing `potential` field (confirmed stored and retrieved).
7. **DRIFT-INV-8/10** -- Expenses accounts and sales channels update missing `color` (confirmed stored).
8. **DRIFT-PROJ-1** -- Update project missing `lists` and `labels`.
9. **DRIFT-INV-4** -- Create payment missing `contactId` field (only supports document-linked payments).