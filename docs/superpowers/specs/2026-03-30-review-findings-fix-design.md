# Review Findings Fix

## Goals

- Eliminate dead code (`buildToolResponse` unused)
- Unify error handling (factory uses inline try/catch instead of `withErrorHandling`)
- Tighten types (`ToolResult` index signature)
- Standardize exports (formatters inconsistently exported)
- Add missing tests (formatter tests for documents/leads/bookings, domain-specific handler tests)

## Fixes

### 1. Factory uses `withErrorHandling`

Wrap each of the 5 factory handlers with `withErrorHandling` instead of inline try/catch. Remove `handleApiError` import from factory.ts.

The factory currently receives `input: unknown` from the MCP SDK callback. The `withErrorHandling` wrapper expects `(params: Record<string, unknown>) => Promise<ToolResult>`. The factory should pass `withErrorHandling(async (params) => { ... })` as the callback, with the `input as Record<string, unknown>` cast happening inside `withErrorHandling` or at the call boundary.

Since the MCP SDK callback signature is `(input: unknown) => ...`, and `withErrorHandling` expects `Record<string, unknown>`, adjust `withErrorHandling` to accept `unknown` input and cast internally:

```typescript
export function withErrorHandling(
  handler: (params: Record<string, unknown>) => Promise<ToolResult>,
): (input: unknown) => Promise<ToolResult> {
  return async (input: unknown): Promise<ToolResult> => {
    try {
      return await handler(input as Record<string, unknown>);
    } catch (error) {
      return {
        content: [{ type: "text", text: handleApiError(error) }],
        isError: true,
      };
    }
  };
}
```

This is a compatible change — existing callers that pass `Record<string, unknown>` still work since `Record<string, unknown>` is assignable to `unknown`.

### 2. Factory list/get use `buildToolResponse`

Add an optional `structuredContent` override parameter to `buildToolResponse`:

```typescript
export function buildToolResponse<T>(
  data: T,
  format: ResponseFormat,
  formatter: (data: T) => string,
  structuredContent?: Record<string, unknown>,
): { content: { type: "text"; text: string }[]; structuredContent: Record<string, unknown> }
```

When `structuredContent` is provided, use it instead of `toStructuredContent(data)`. This lets the list handler pass its custom `{ [resourcePlural]: items, count, page }` shape.

The factory's get handler uses `toStructuredContent(item)` which matches `buildToolResponse`'s default. So get can use it directly.

The factory's list handler passes a custom shape, so it uses the override:
```typescript
return buildToolResponse(items, params.response_format, formatters.list, {
  [resourcePlural]: items, count: items.length, page: params.page,
});
```

Create and update handlers don't use `buildToolResponse` because their text is a success message + JSON dump, not a formatter. Delete handlers return a fixed string. These stay as-is.

### 3. `ToolResult` drops index signature

Remove `[key: string]: unknown;` from the `ToolResult` interface. This was added for MCP SDK compatibility but is unnecessary — the SDK accepts any object with `content` and optional `isError`.

### 4. Export all formatters consistently

Add `export` to all formatter functions across all tool files. Currently only employees.ts, contacts.ts, and accounts.ts export theirs. This enables testing and consistency.

### 5. Formatter tests for documents, leads, bookings

Add to `tests/formatters.test.ts`:

**Documents formatters:**
- `formatDocumentsMarkdown` — takes `(documents, docType)`, renders a table-like list with line items
- `formatDocumentMarkdown` — renders single document with line items, dates, totals

**Leads formatters:**
- `formatLeadsMarkdown` — renders lead list with funnel, stage, contact info
- `formatLeadMarkdown` — renders single lead with all fields

**Bookings formatters:**
- `formatBookingsMarkdown` — renders booking list; must handle service as array OR object
- `formatBookingMarkdown` — renders single booking; handles customFieldsValues vs customFields

### 6. Domain-specific handler tests for non-standard tools

Create `tests/domain-handlers.test.ts` testing non-standard tool handlers by mocking `makeApiRequest` and invoking the handlers directly.

**Leads sub-resource handlers:**
- create/update/delete note (verify correct endpoint: `leads/{id}/notes`, correct body shape)
- create/update/delete task (verify endpoint: `leads/{id}/tasks`, body shape)
- update stage (verify endpoint: `leads/{id}/stages`)
- list notes/tasks (verify endpoint and response shape)

**Bookings custom handlers:**
- list_booking_locations (verify endpoint: `bookings/locations`)
- get_available_slots (verify endpoint: `bookings/locations/{id}/slots`, query params: serviceId, day)

**Documents custom handlers:**
- pay_document (verify endpoint: `documents/{type}/{id}/pay`, snake_to_camel on account_id)
- send_document (verify endpoint)
- get_document_pdf (verify endpoint)
- ship_all_items (verify hardcoded `salesorder` doc_type)

These tests mock `makeApiRequest` and call the registered handler functions, verifying the correct API calls are made with correct endpoints, methods, and body shapes.

## Out of Scope

- Changing tool behavior or API contracts
- Refactoring schemas
- Adding new tools
