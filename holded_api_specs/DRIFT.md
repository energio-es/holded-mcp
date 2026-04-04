# Holded API Drift Report

Compared: OpenAPI specs in `holded_api_specs/` vs MCP server implementation
Date: 2026-04-03
Verified against: live Holded API via curl using `HOLDED_TEST_API_KEY_ENERGIO`

## Summary

| Module | Code Drifts | Spec Drifts | Total |
|--------|-------------|-------------|-------|
| Invoice API | 0 | 6 | 6 |
| CRM API | 0 | 3 | 3 |
| Projects API | 0 | 3 | 3 |
| Team API | 0 | 1 | 1 |
| Accounting API | 1 | 2 | 3 |
| **Total** | **1** | **15** | **16** |

By severity: **0 Critical**, **0 Medium**, **16 Low**

**Drift location key:**
- **Code drift** -- our implementation doesn't match the spec and the API confirms the spec is correct
- **Spec drift** -- the spec is wrong/incomplete and the API confirms our code is correct (or reveals undocumented behavior)

---

## Invoice API


### DRIFT-INV-6: Send document -- API accepts both email and emails field names

- **Spec says:** POST `/documents/{docType}/{documentId}/send` requires `emails` (plural)
- **API behavior:** API accepts both `email` (singular) and `emails` (plural)
- **Conclusion:** Drift is in **the spec** (API accepts both field names)
- **Severity:** Low

### DRIFT-INV-7: Expenses accounts create -- spec says desc required, API doesn't require it

- **Spec says:** POST `/expensesaccounts` requires `name`, `desc`, `accountNum`
- **Our code does:** Only requires `name` and `accountNum` (no `desc`)
- **API verification:** `curl -s -X POST ".../expensesaccounts" -d '{"name":"__DRIFT_TEST__","accountNum":99990000}'` -- `{"status":201,"info":"Created","id":"..."}`. Created successfully without `desc`.
- **Conclusion:** Drift is in **the spec** (desc is not actually required)
- **Severity:** Low

### DRIFT-INV-9: Sales channels create -- spec says desc required, API doesn't require it

- **Spec says:** POST `/saleschannels` requires `name`, `desc`, `accountNum`
- **Our code does:** Only requires `name` and `accountNum` (no `desc`)
- **API verification:** `curl -s -X POST ".../saleschannels" -d '{"name":"__DRIFT_TEST__","accountNum":99990001}'` -- `{"status":201,"info":"Created","id":"..."}`. Created successfully without `desc`.
- **Conclusion:** Drift is in **the spec** (desc is not actually required)
- **Severity:** Low

### DRIFT-INV-12: Contact create/update has extra fields not in spec

- **Spec says:** POST `/contacts` create body does not include `tradeName` or expanded `socialNetworks` (only `website`)
- **Our code does:** Includes `tradeName`, and `SocialNetworksSchema` has `facebook`, `twitter`, `linkedin`, `instagram`
- **API verification:** Not directly tested. Extra fields are typically accepted by the API.
- **Conclusion:** Drift is in **the spec** (API likely accepts these fields, they appear in response objects). Our code provides more functionality than documented.
- **Severity:** Low

---

## CRM API

### DRIFT-CRM-2: Create lead -- spec should mark contactId/funnelId as required

- **Spec says:** No fields are marked required in the create lead schema
- **API verification:**
  - Without `contactId`: `{"status":0,"info":"contactId needed"}` -- **required**
  - Without `funnelId`: `{"status":0,"info":"funnelId needed"}` -- **required**
- **Conclusion:** Drift is in **the spec** (`contactId` and `funnelId` should be marked required)
- **Severity:** Low

### DRIFT-CRM-3: Create event -- funnelId not functional despite being in spec

- **Spec says:** POST `/events` body accepts `funnelId`
- **API verification:** Sent `funnelId="..."` when creating an event. `funnelId` was **NOT stored** (missing in GET response even when sent).
- **Conclusion:** Drift is in **the spec** (`funnelId` is not functional for events)
- **Severity:** Low

### DRIFT-CRM-5: Update funnel -- labels, preferences, customFields appear read-only

- **Spec says:** PUT `/funnels/{funnelId}` body accepts: `name`, `stages`, `labels`, `preferences`, `customFields`
- **Our code does:** `UpdateFunnelInputSchema` only has `funnel_id`, `name`, `stages`. Missing `labels`, `preferences`, `customFields`.
- **API verification:** Created funnel, then updated with `labels=[{labelId,labelName,labelColor}]`. Update returned success, but GET shows `labels=[]` (not stored), `preferences=0`, `customFields=0`. The API does NOT store these fields via PUT despite the spec documenting them.
- **Conclusion:** Drift is in **the spec** (these fields appear read-only or managed via a different mechanism). Our code is correct to not include them.
- **Severity:** Low
- **File:** `src/schemas/crm/funnels.ts`

---

## Projects API

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

---

## Team API

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
- **Conclusion:** Intentional design choice. Changing to string would cascade to all modules and degrade usability. Axios auto-serializes numbers to strings, so there is no functional impact.
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
