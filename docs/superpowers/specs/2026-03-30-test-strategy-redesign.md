# Test Strategy Redesign

## Goals

- Enable safe refactoring of tool handlers by providing comprehensive test coverage
- Prevent regressions in API integration behavior
- Reduce ~70-80% boilerplate duplication across 27 tool files via a CRUD tool factory
- All new code written using TDD

## Current State

- 200 tests across 3 suites (api-client, schema-validation, account-balances), all passing
- 19.39% overall coverage — schemas at 100%, api.ts at ~91%, tool handlers at ~0%
- 27 tool files with 70+ registered tools following near-identical CRUD patterns
- Jest with ts-jest ESM preset
- CI runs tests but does not enforce coverage thresholds

## Design

### 1. Migrate Jest to Vitest

Replace Jest with Vitest for native ESM support and faster transforms.

**Changes:**
- Remove `jest`, `ts-jest`, `@types/jest` dependencies
- Add `vitest` dependency
- Replace `jest.config.js` with `vitest.config.ts`
- Update `package.json` scripts: `test`, `test:watch`, `test:coverage`
- In existing test files: `jest.fn()` → `vi.fn()`, `jest.mock()` → `vi.mock()`, `jest.useFakeTimers()` → `vi.useFakeTimers()`
- Remove coverage threshold configuration entirely

**What stays the same:**
- Test file location: `tests/**/*.test.ts`
- Test structure: describe/it/expect
- Fixture files: used as-is
- CI workflow: runs `npm test`

**Order:** Migrate existing 3 test files first, verify they pass, then write all new tests in Vitest.

### 2. Extract Shared Utilities (TDD)

Three pure-function utilities extracted from repeated patterns across tool handlers.

**`buildToolResponse<T>(data, format, formatter)`**
- If format is MARKDOWN, calls the provided formatter function
- Otherwise, JSON.stringify with 2-space indent
- Returns the standard `{ content: [...], structuredContent: ... }` shape
- Used by the factory internally, also available for custom tool handlers

**`withErrorHandling(handler)`**
- Wraps a tool handler in try/catch
- On error, returns `{ content: [{ type: "text", text: handleApiError(error) }], isError: true }`
- Eliminates the identical try/catch block in every handler

**`snakeToCamel(obj)`**
- Converts snake_case keys to camelCase
- Replaces inline field-by-field mapping in leads, documents, projects, etc.

All three are pure functions — straightforward to TDD with clear input/output contracts.

### 3. Extract CRUD Tool Factory (TDD)

A generic factory function that registers standard CRUD tools given a configuration object.

**Signature:**
```typescript
function registerCrudTools<T>(server: McpServer, config: CrudToolConfig<T>): void
```

**Config shape:**
```typescript
interface CrudToolConfig<T> {
  module: ApiModule;
  resource: string;          // e.g., "contact"
  endpoint: string;          // e.g., "contacts"
  schemas: {
    list?: ZodSchema;
    get?: ZodSchema;
    create?: ZodSchema;
    update?: ZodSchema;
    delete?: ZodSchema;
  };
  formatters: {
    list: (items: T[]) => string;
    single: (item: T) => string;
  };
  listQueryParams?: (params: any) => Record<string, unknown>;  // optional custom query building
}
```

**What the factory handles per operation type:**

- **list**: Builds query params (pagination, filters), calls `makeApiRequest` with GET, formats response via `buildToolResponse`, sets `readOnlyHint: true`
- **get**: Calls `makeApiRequest` with GET on `endpoint/{id}`, formats single item, sets `readOnlyHint: true`
- **create**: Calls `makeApiRequest` with POST, returns success message + structured content, sets `readOnlyHint: false`
- **update**: Extracts `id` from params, calls `makeApiRequest` with PUT on `endpoint/{id}`, sets `idempotentHint: true`
- **delete**: Calls `makeApiRequest` with DELETE on `endpoint/{id}`, returns deletion confirmation, sets `destructiveHint: true`
- All operations wrapped in `withErrorHandling`
- All operations set `openWorldHint: true`
- Only registers operations whose schemas are provided (e.g., omit `delete` schema to skip delete tool)

### 4. Refactor Tool Files to Use Factory

Each of the 27 tool files is rewritten to use `registerCrudTools` for standard operations.

**Before** (~765 lines for contacts.ts):
- 10 tool registrations with identical try/catch, error handling, response formatting
- Inline query param building
- 2 markdown formatters

**After** (~80 lines):
- One `registerCrudTools()` call with config
- Markdown formatters remain (these are the unique part)
- Any non-standard tools (e.g., lead notes/tasks, document PDF/shipping) registered manually using `withErrorHandling` and `buildToolResponse`

**Non-standard tools** that don't fit the CRUD pattern:
- `crm/leads.ts` — nested notes and tasks sub-resources
- `crm/bookings.ts` — slot availability checking
- `invoicing/documents.ts` — PDF generation, shipping, pipeline status, payments
- `accounting/account-balances.ts` — composite tool with ledger aggregation
- `accounting/daily-ledger.ts` — date-filtered ledger queries

These files use the factory for their standard CRUD operations and add custom handlers alongside.

### 5. Testing Architecture (TDD)

Three test layers:

**Layer 1: Factory and utility tests** (`tests/factory.test.ts`, `tests/utilities.test.ts`)
- Test `registerCrudTools`: given a config, correct tools registered with correct names, schemas, annotations
- Test each CRUD operation: list (pagination, filters, empty results), get (by ID), create (input mapping), update (partial data), delete (success message)
- Test error handling: API errors propagated correctly via `withErrorHandling`
- Test `buildToolResponse`: markdown vs JSON output, structured content shape
- Test `snakeToCamel`: key conversion, nested objects, edge cases
- Mock `makeApiRequest` — these tests verify wiring, not the API
- **This single suite covers the behavior of all 70+ standard tools**

**Layer 2: Domain-specific tests**
- `tests/account-balances.test.ts` — already exists, covers leak detection and aggregation
- `tests/documents.test.ts` — complex formatting, PDF, shipping, pipeline unique logic
- `tests/leads.test.ts` — nested notes/tasks sub-resource handlers
- `tests/bookings.test.ts` — slot availability logic
- Markdown formatters get snapshot tests — assert output structure without brittle string matching

**Layer 3: Optional real-API smoke tests** (`tests/smoke.test.ts`)
- Gated behind `HOLDED_TEST_API_KEY` env var — skipped when not set
- Read-only operations only: list and get for each domain
- Validates endpoints, response shapes, and schemas match the real API
- Separate npm script: `npm run test:smoke`
- Not part of CI — run manually

### 6. CI Updates

- CI continues to run `npm test`
- No coverage threshold — test architecture is the quality guarantee
- Smoke tests are not part of CI (require API credentials)

## Out of Scope

- Changing the Holded API contract or endpoint structure
- Adding new MCP tools
- Refactoring schemas (already well-structured and 100% tested)
- Refactoring `src/services/api.ts` (already well-abstracted at ~91% coverage)

## Expected Outcome

- Tool handler code reduced by ~70% (from ~9,500 lines to ~3,000)
- Fewer but more meaningful tests — factory suite covers all standard CRUD, domain tests cover unique logic
- Safe refactoring enabled by comprehensive factory tests
- Real-API smoke tests available for manual validation
- Vitest with native ESM, faster test execution
- No coverage threshold — quality ensured by test design, not metrics
