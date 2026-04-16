# Holded API Drift Report

Compared: OpenAPI specs in `holded_api_specs/` vs MCP server implementation
Date: 2026-04-04
Verified against: live Holded API via curl using `HOLDED_TEST_API_KEY_ENERGIO`

## Summary

| Module | Code Drifts | Spec Drifts | Total |
|--------|-------------|-------------|-------|
| Invoice API | 1 | 5 | 6 |
| CRM API | 0 | 3 | 3 |
| Projects API | 0 | 3 | 3 |
| Accounting API | 1 | 2 | 3 |
| API Client | 1 | 0 | 1 |
| **Total** | **3** | **13** | **16** |

By severity: **0 Critical**, **4 Medium**, **12 Low**

**Drift location key:**
- **Code drift** -- our implementation doesn't match the spec and the API confirms the spec is correct
- **Spec drift** -- the spec is wrong/incomplete and the API confirms our code is correct (or reveals undocumented behavior)

---

## Invoice API

### DRIFT-INV-7: Expenses accounts create -- spec says desc required, API doesn't require it

- **Spec says:** POST `/expensesaccounts` requires `name`, `desc`, `accountNum`
- **Our code does:** Only requires `name` and `accountNum` (no `desc`)
- **API verification:** Created successfully without `desc`. When `desc` is provided, the API accepts it silently but does not persist it -- GET response only returns `id`, `name`, `color`, `accountNum`.
- **Conclusion:** Drift is in **the spec** (`desc` is not only optional but a no-op -- the API ignores it entirely)
- **Severity:** Low

### DRIFT-INV-9: Sales channels create -- spec says desc required, API doesn't require it

- **Spec says:** POST `/saleschannels` requires `name`, `desc`, `accountNum`
- **Our code does:** Only requires `name` and `accountNum` (no `desc`)
- **API verification:** Created successfully without `desc`. When `desc` is provided, the API accepts it silently but does not persist it -- GET response only returns `id`, `name`, `color`, `accountNum`.
- **Conclusion:** Drift is in **the spec** (`desc` is not only optional but a no-op -- the API ignores it entirely)
- **Severity:** Low

### DRIFT-INV-12: Contact create/update has extra fields not in spec

- **Spec says:** POST `/contacts` create body does not include `tradeName` or expanded `socialNetworks` (only `website`)
- **Our code does:** Includes `tradeName`, and `SocialNetworksSchema` has `facebook`, `twitter`, `linkedin`, `instagram`
- **API verification:** Created contact with `tradeName` and full `socialNetworks` (`website`, `facebook`, `twitter`, `linkedin`, `instagram`). All fields persisted on create. On update, `tradeName` persists but `socialNetworks` is silently ignored -- the API returns success but does not modify the stored values.
- **Conclusion:** Drift is in **the spec** (API accepts these fields on create). However, `socialNetworks` is read-only on update despite returning success.
- **Severity:** Low

### DRIFT-INV-13: Contact attachment upload endpoint does not exist

- **Spec says:** Only `GET /contacts/{contactId}/attachments/list` and `GET /contacts/{contactId}/attachments/get` are documented for contact attachments. No upload route is documented.
- **Our code did:** Exposed `holded_invoicing_upload_contact_attachment` posting to `POST /contacts/{contactId}/attachments` (an undocumented URL).
- **API verification (2026-04-16):** Verified via real-API smoke test (`HOLDED_TEST_API_KEY_ENERGIO`). The endpoint returns Holded's HTML 404 page with HTTP 200 status. Probed 8 URL variants (`/attachments`, `/attach`, `/attachments/save|upload|create|add|post|new`, PUT method, alternate field name `attachment`, `/files`, trailing slash) -- all return the same HTML 404. The endpoint is not exposed in the public v1 API.
- **Conclusion:** Drift is in **our code**. Removed the tool, its schema, its tests, and the README entry (`list_contact_attachments` and `get_contact_attachment` remain -- both are documented in the OpenAPI spec). Document attachments (`documents/{docType}/{documentId}/attach`) and product images (`products/{productId}/image`) remain -- both are documented and verified working.
- **Severity:** Medium (a tool that never worked is more harmful than a missing tool -- it misleads LLM consumers).

### DRIFT-INV-14: `POST /documents/{docType}` decomposes customFields entries

- **Spec says:** `customFields` accepts `[{field: string, value: string}]` on create (see `holded_api_specs/invoice-api.json:266-280, 4810-4823`).
- **API does:** Decomposes each entry via `Object.entries` — every own-prop becomes a separate row. Sending `[{field: "src", value: "val"}]` stores `[{field:"field", value:"src"}, {field:"value", value:"val"}]` (doubled, original key/value pairing lost).
- **API verification (2026-04-16):** Live probe on `purchase`, `invoice`, `salesreceipt`, `estimate` against `HOLDED_TEST_API_KEY_ENERGIO`. All four doc types mangle identically. Ten different payload shapes tested; only `[{k: v}]` (single-key map per entry) round-trips, because Holded's decomposer unpacks it to `[{field: k, value: v}]`.
- **Conclusion:** Drift is in **the API**. Fixed client-side in `src/utils/custom-fields.ts` — create handler serializes the caller's `{k: v}` map as `[{k: v}]` on the wire. Update path (`PUT /documents/{docType}/{id}`) accepts the documented shape and is unaffected; update uses the documented serialization.
- **Severity:** Medium (silent data corruption for idempotency-by-customFields workflows).

### DRIFT-INV-15: `POST /contacts` and `PUT /contacts/{id}` decompose customFields

- **Spec says:** Contact create/update `customFields` accepts `[{field, value}]` (see `holded_api_specs/invoice-api.json:266-280, 940-953`).
- **API does:** Both POST and PUT decompose each entry, same pattern as documents. Note: `PUT /documents/{docType}/{id}` is **not** affected — only contacts have the bug on the update path too.
- **API verification (2026-04-16):** Same live probe, extended to contact endpoints. Documented shape mangles on both methods; `[{k: v}]` map-per-entry round-trips on both.
- **Conclusion:** Drift is in **the API**. Fixed client-side — contact handlers would serialize `{k: v}` maps as `[{k: v}]` on both POST and PUT. **Note:** our current Zod schemas (`CreateContactInputSchema`, `UpdateContactInputSchema`) do not expose `customFields`, so the bug is not reachable via the MCP server's contact tools today. The read-side repair is wired so Holded-native customFields (set via UI or direct API) round-trip correctly on `get_contact` / `list_contacts`.
- **Severity:** Medium (latent — becomes reachable the moment contact schemas add `customFields`).

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
- **Consequence:** Without a `funnelId`, events don't appear in the CRM calendar -- only on the contact's activity page.
- **Conclusion:** Drift is in **the spec** (`funnelId` is not functional for events)
- **Severity:** Low

### DRIFT-CRM-5: Update funnel -- labels appear read-only

- **Spec says:** PUT `/funnels/{funnelId}` body accepts: `name`, `stages`, `labels`, `preferences`, `customFields`
- **Our code does:** `UpdateFunnelInputSchema` has `funnel_id`, `name`, `stages`, `preferences`, `customFields`. Missing `labels`.
- **API verification:** Created funnel, then updated all fields. `labels` was silently ignored (not stored despite returning success).
- **Conclusion:** Drift is in **the spec** for `labels` (read-only or managed via a different mechanism).
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
- **Note:** `costHour` appears silently ignored on both create and update (always returns 0), likely overridden by the project's per-user hourly rate setting.
- **Conclusion:** Drift is in **the spec** (API accepts partial updates). Our code is correct.
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

---

## API Client

### DRIFT-CLIENT-1: API client did not validate response Content-Type on multipart uploads

- **Spec says:** Holded's API documents JSON responses for all multipart upload endpoints.
- **Our code did:** `makeMultipartApiRequest` returned `response.data` without checking whether Holded had returned the documented JSON or an HTML error page. `makeApiRequest` already had this guard (introduced earlier); the multipart variant did not.
- **API verification (2026-04-16):** Triggered the bug while smoke-testing `POST /contacts/{contactId}/attachments` (a non-existent endpoint, see DRIFT-INV-13). The endpoint returned HTML 404 with HTTP 200; without the guard, the function returned the HTML string typed as the expected `{status, info}` shape. Smoke test only failed because `expect(result.status).toBe(1)` happened to fail on the missing field; a less specific assertion would have passed silently.
- **Conclusion:** Drift is in **our code**. Added matching HTML-detection guard to `makeMultipartApiRequest` (mirrors the existing logic in `makeApiRequest:298-307`). Both functions now throw with a clear message if Holded returns an HTML body where JSON was expected.
- **Severity:** Medium (a missing guard for an entire response class; would have masked any future endpoint-removal regression).
