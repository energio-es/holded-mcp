# Test Strategy Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate to Vitest, extract a CRUD tool factory and shared utilities to eliminate ~70% of handler boilerplate, and build a meaningful test suite using TDD.

**Architecture:** Extract repeated handler logic (error handling, response formatting, API calls) into a factory function (`registerCrudTools`) and shared utilities. Test the factory thoroughly — one test suite covers all 70+ standard tools. Non-standard tools use shared utilities directly. Optional real-API smoke tests for manual validation.

**Tech Stack:** Vitest, TypeScript, Zod, @modelcontextprotocol/sdk

---

## File Structure

### New files to create:
- `vitest.config.ts` — Vitest configuration (replaces `jest.config.js`)
- `src/tools/factory.ts` — CRUD tool factory (`registerCrudTools`) and `CrudToolConfig` type
- `src/tools/utilities.ts` — Shared utilities (`buildToolResponse`, `withErrorHandling`, `snakeToCamel`)
- `tests/utilities.test.ts` — Tests for shared utilities
- `tests/factory.test.ts` — Tests for CRUD tool factory
- `tests/smoke.test.ts` — Optional real-API smoke tests

### Files to modify:
- `package.json` — Replace Jest deps with Vitest, update scripts
- `tests/api-client.test.ts` — Migrate Jest → Vitest
- `tests/schema-validation.test.ts` — Migrate Jest → Vitest
- `tests/account-balances.test.ts` — Migrate Jest → Vitest
- `src/tools/team/employees.ts` — Refactor to use factory
- `src/tools/invoicing/warehouses.ts` — Refactor to use factory
- `src/tools/invoicing/services.ts` — Refactor to use factory
- `src/tools/invoicing/sales-channels.ts` — Refactor to use factory
- `src/tools/invoicing/expenses-accounts.ts` — Refactor to use factory
- `src/tools/crm/funnels.ts` — Refactor to use factory
- `src/tools/crm/events.ts` — Refactor to use factory
- `src/tools/invoicing/contacts.ts` — Refactor (factory for CRUD, manual for attachments)
- `src/tools/invoicing/products.ts` — Refactor (factory for CRUD, manual for stock/images)
- `src/tools/invoicing/payments.ts` — Refactor to use factory + utilities
- `src/tools/invoicing/remittances.ts` — Refactor to use factory
- `src/tools/crm/leads.ts` — Refactor (factory for CRUD, manual for sub-resources)
- `src/tools/crm/bookings.ts` — Refactor (factory for CRUD, manual for slots/locations)
- `src/tools/projects/projects.ts` — Refactor (factory for CRUD, manual for summary)
- `src/tools/projects/tasks.ts` — Refactor to use factory + utilities
- `src/tools/accounting/accounts.ts` — Refactor to use factory
- `src/tools/invoicing/documents.ts` — Refactor to use utilities (mostly custom)
- `src/tools/invoicing/treasury.ts` — Refactor to use utilities
- `src/tools/invoicing/taxes.ts` — Refactor to use utilities
- `src/tools/invoicing/numbering-series.ts` — Refactor to use utilities
- `src/tools/projects/time-tracking.ts` — Refactor to use utilities
- `src/tools/team/time-tracking.ts` — Refactor to use utilities
- `src/tools/accounting/daily-ledger.ts` — Refactor to use utilities
- `src/tools/accounting/account-balances.ts` — Refactor to use utilities
- `.github/workflows/ci.yml` — Update test command

### Files to delete:
- `jest.config.js`

---

## Task 1: Install Vitest and Remove Jest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Delete: `jest.config.js`

- [ ] **Step 1: Install Vitest and remove Jest dependencies**

```bash
npm install --save-dev vitest && npm uninstall jest ts-jest @jest/globals @types/jest
```

- [ ] **Step 2: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testMatch: ["**/tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      include: [
        "src/schemas/**/*.ts",
        "src/services/**/*.ts",
        "src/tools/**/*.ts",
      ],
      reporter: ["text", "lcov", "html"],
    },
  },
});
```

No coverage threshold — removed by design.

- [ ] **Step 3: Update package.json scripts**

Replace the `test`, `test:watch`, and `test:coverage` scripts:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage",
"test:smoke": "HOLDED_TEST_API_KEY=1 vitest run tests/smoke.test.ts"
```

- [ ] **Step 4: Delete jest.config.js**

```bash
rm jest.config.js
```

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.ts jest.config.js package-lock.json
git commit -m "chore: replace Jest with Vitest"
```

---

## Task 2: Migrate api-client.test.ts to Vitest

**Files:**
- Modify: `tests/api-client.test.ts`

The api-client tests are the most complex — they use `jest.mock()`, `jest.fn()`, fake timers, and typed mocks. All need Vitest equivalents.

- [ ] **Step 1: Replace imports**

Replace:
```typescript
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
```

With:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
```

- [ ] **Step 2: Replace jest.mock with vi.mock**

Replace:
```typescript
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
```

With:
```typescript
vi.mock('axios');
const mockedAxios = axios as any;
```

Note: Vitest's `vi.mock` hoists automatically like Jest's `jest.mock`.

- [ ] **Step 3: Replace all jest.fn() with vi.fn()**

Search and replace across the file:
- `jest.fn()` → `vi.fn()`
- `jest.clearAllMocks()` → `vi.clearAllMocks()`
- `jest.restoreAllMocks()` → `vi.restoreAllMocks()`
- `jest.useFakeTimers()` → `vi.useFakeTimers()`
- `jest.useRealTimers()` → `vi.useRealTimers()`
- `jest.advanceTimersByTime(` → `vi.advanceTimersByTime(`
- `jest.advanceTimersByTimeAsync(` → `vi.advanceTimersByTimeAsync(`

- [ ] **Step 4: Run tests to verify migration**

```bash
npx vitest run tests/api-client.test.ts
```

Expected: All 89 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/api-client.test.ts
git commit -m "test: migrate api-client tests to Vitest"
```

---

## Task 3: Migrate Remaining Test Files to Vitest

**Files:**
- Modify: `tests/schema-validation.test.ts`
- Modify: `tests/account-balances.test.ts`

These files only use `describe`, `it`, `expect` from `@jest/globals` — simple import swap.

- [ ] **Step 1: Update schema-validation.test.ts imports**

Replace:
```typescript
import { describe, it, expect } from '@jest/globals';
```

With:
```typescript
import { describe, it, expect } from 'vitest';
```

- [ ] **Step 2: Update account-balances.test.ts imports**

Replace:
```typescript
import { describe, it, expect } from '@jest/globals';
```

With:
```typescript
import { describe, it, expect } from 'vitest';
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All 200 tests pass across 3 suites.

- [ ] **Step 4: Commit**

```bash
git add tests/schema-validation.test.ts tests/account-balances.test.ts
git commit -m "test: migrate remaining test files to Vitest"
```

---

## Task 4: TDD buildToolResponse Utility

**Files:**
- Create: `tests/utilities.test.ts`
- Create: `src/tools/utilities.ts`

- [ ] **Step 1: Write failing tests for buildToolResponse**

Create `tests/utilities.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildToolResponse } from "../src/tools/utilities.js";
import { ResponseFormat } from "../src/constants.js";

describe("buildToolResponse", () => {
  const mockData = { id: "123", name: "Test" };
  const mockFormatter = (data: { id: string; name: string }) => `# ${data.name}\n**ID**: ${data.id}`;

  it("returns markdown when format is MARKDOWN", () => {
    const result = buildToolResponse(mockData, ResponseFormat.MARKDOWN, mockFormatter);

    expect(result).toEqual({
      content: [{ type: "text", text: "# Test\n**ID**: 123" }],
      structuredContent: { id: "123", name: "Test" },
    });
  });

  it("returns JSON when format is JSON", () => {
    const result = buildToolResponse(mockData, ResponseFormat.JSON, mockFormatter);

    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
      structuredContent: { id: "123", name: "Test" },
    });
  });

  it("handles array data", () => {
    const items = [{ id: "1" }, { id: "2" }];
    const listFormatter = (data: { id: string }[]) => `Found ${data.length} items`;

    const result = buildToolResponse(items, ResponseFormat.MARKDOWN, listFormatter);

    expect(result.content[0].text).toBe("Found 2 items");
    expect(result.structuredContent).toEqual([{ id: "1" }, { id: "2" }]);
  });

  it("handles null/undefined fields in structured content", () => {
    const data = { id: "1", value: null };
    const formatter = () => "text";

    const result = buildToolResponse(data, ResponseFormat.MARKDOWN, formatter);

    expect(result.structuredContent).toEqual({ id: "1", value: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/utilities.test.ts
```

Expected: FAIL — `buildToolResponse` not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/tools/utilities.ts`:

```typescript
import { ResponseFormat } from "../constants.js";
import { handleApiError, toStructuredContent } from "../services/api.js";

/**
 * Build a standard MCP tool response with text content and structured content.
 */
export function buildToolResponse<T>(
  data: T,
  format: ResponseFormat,
  formatter: (data: T) => string,
): { content: { type: "text"; text: string }[]; structuredContent: Record<string, unknown> | unknown[] } {
  const text =
    format === ResponseFormat.MARKDOWN
      ? formatter(data)
      : JSON.stringify(data, null, 2);

  return {
    content: [{ type: "text" as const, text }],
    structuredContent: toStructuredContent(data) as Record<string, unknown> | unknown[],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/utilities.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/utilities.test.ts src/tools/utilities.ts
git commit -m "feat: add buildToolResponse utility (TDD)"
```

---

## Task 5: TDD withErrorHandling Utility

**Files:**
- Modify: `tests/utilities.test.ts`
- Modify: `src/tools/utilities.ts`

- [ ] **Step 1: Write failing tests for withErrorHandling**

Append to `tests/utilities.test.ts`:

```typescript
import { withErrorHandling } from "../src/tools/utilities.js";

describe("withErrorHandling", () => {
  it("returns handler result on success", async () => {
    const handler = async () => ({
      content: [{ type: "text" as const, text: "ok" }],
    });

    const wrapped = withErrorHandling(handler);
    const result = await wrapped({ foo: "bar" });

    expect(result).toEqual({ content: [{ type: "text", text: "ok" }] });
  });

  it("catches errors and returns isError response", async () => {
    const error = new Error("something broke");
    const handler = async () => {
      throw error;
    };

    const wrapped = withErrorHandling(handler);
    const result = await wrapped({});

    expect(result.isError).toBe(true);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Error");
  });

  it("passes params through to the handler", async () => {
    let receivedParams: unknown;
    const handler = async (params: unknown) => {
      receivedParams = params;
      return { content: [{ type: "text" as const, text: "ok" }] };
    };

    const wrapped = withErrorHandling(handler);
    await wrapped({ id: "123", name: "test" });

    expect(receivedParams).toEqual({ id: "123", name: "test" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/utilities.test.ts
```

Expected: New tests FAIL — `withErrorHandling` not found.

- [ ] **Step 3: Implement withErrorHandling**

Add to `src/tools/utilities.ts`:

```typescript
type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown> | unknown[];
  isError?: boolean;
};

type ToolHandler = (params: Record<string, unknown>) => Promise<ToolResult>;

/**
 * Wrap a tool handler with standard error handling.
 * On error, returns { content: [error text], isError: true }.
 */
export function withErrorHandling(handler: ToolHandler): ToolHandler {
  return async (params: Record<string, unknown>) => {
    try {
      return await handler(params);
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: handleApiError(error) }],
        isError: true,
      };
    }
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/utilities.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/utilities.test.ts src/tools/utilities.ts
git commit -m "feat: add withErrorHandling utility (TDD)"
```

---

## Task 6: TDD snakeToCamel Utility

**Files:**
- Modify: `tests/utilities.test.ts`
- Modify: `src/tools/utilities.ts`

- [ ] **Step 1: Write failing tests for snakeToCamel**

Append to `tests/utilities.test.ts`:

```typescript
import { snakeToCamel } from "../src/tools/utilities.js";

describe("snakeToCamel", () => {
  it("converts snake_case keys to camelCase", () => {
    const input = { funnel_id: "abc", contact_id: "def" };
    const result = snakeToCamel(input);

    expect(result).toEqual({ funnelId: "abc", contactId: "def" });
  });

  it("preserves already camelCase keys", () => {
    const input = { name: "test", lastName: "smith" };
    const result = snakeToCamel(input);

    expect(result).toEqual({ name: "test", lastName: "smith" });
  });

  it("handles mixed keys", () => {
    const input = { name: "test", stage_id: "123", sendInvite: true };
    const result = snakeToCamel(input);

    expect(result).toEqual({ name: "test", stageId: "123", sendInvite: true });
  });

  it("handles empty object", () => {
    expect(snakeToCamel({})).toEqual({});
  });

  it("does not convert nested objects", () => {
    const input = { top_level: "yes", nested: { inner_key: "no" } };
    const result = snakeToCamel(input);

    expect(result).toEqual({ topLevel: "yes", nested: { inner_key: "no" } });
  });

  it("handles keys with multiple underscores", () => {
    const input = { long_snake_case_key: "value" };
    const result = snakeToCamel(input);

    expect(result).toEqual({ longSnakeCaseKey: "value" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/utilities.test.ts
```

Expected: New tests FAIL — `snakeToCamel` not found.

- [ ] **Step 3: Implement snakeToCamel**

Add to `src/tools/utilities.ts`:

```typescript
/**
 * Convert top-level snake_case keys to camelCase.
 * Does not recurse into nested objects.
 */
export function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/utilities.test.ts
```

Expected: All 13 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/utilities.test.ts src/tools/utilities.ts
git commit -m "feat: add snakeToCamel utility (TDD)"
```

---

## Task 7: TDD CRUD Factory — List and Get Operations

**Files:**
- Create: `tests/factory.test.ts`
- Create: `src/tools/factory.ts`

This is the core task. The factory config captures what varies between tool files, and the factory handles all the handler logic.

- [ ] **Step 1: Write failing tests for factory list and get operations**

Create `tests/factory.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResponseFormat } from "../src/constants.js";

// Mock the API module before importing factory
vi.mock("../src/services/api.js", () => ({
  makeApiRequest: vi.fn(),
  handleApiError: vi.fn((e: Error) => `Error: ${e.message}`),
  toStructuredContent: vi.fn((data: unknown) => data),
}));

import { makeApiRequest } from "../src/services/api.js";
import { registerCrudTools } from "../src/tools/factory.js";
import type { CrudToolConfig } from "../src/tools/factory.js";

const mockedMakeApiRequest = vi.mocked(makeApiRequest);

// Minimal mock of McpServer that captures registrations
function createMockServer() {
  const tools = new Map<string, { config: Record<string, unknown>; handler: Function }>();
  return {
    registerTool: vi.fn((name: string, config: Record<string, unknown>, handler: Function) => {
      tools.set(name, { config, handler });
      return { enable: vi.fn(), disable: vi.fn(), update: vi.fn(), remove: vi.fn() };
    }),
    tools,
  };
}

// Test config for a simple "widget" resource
const widgetListFormatter = (items: { id: string; name: string }[]) =>
  items.length ? `Found ${items.length} widgets` : "No widgets found.";
const widgetSingleFormatter = (item: { id: string; name: string }) =>
  `# ${item.name}\n**ID**: ${item.id}`;

function createWidgetConfig(overrides?: Partial<CrudToolConfig<{ id: string; name: string }>>): CrudToolConfig<{ id: string; name: string }> {
  return {
    module: "invoicing",
    toolPrefix: "holded_invoicing",
    resource: "widget",
    resourcePlural: "widgets",
    endpoint: "widgets",
    idParam: "widget_id",
    schemas: {
      list: {} as any,
      get: {} as any,
      create: {} as any,
      update: {} as any,
      delete: {} as any,
    },
    titles: {
      list: "List Widgets",
      get: "Get Widget",
      create: "Create Widget",
      update: "Update Widget",
      delete: "Delete Widget",
    },
    descriptions: {
      list: "List all widgets",
      get: "Get a widget by ID",
      create: "Create a new widget",
      update: "Update a widget",
      delete: "Delete a widget",
    },
    formatters: {
      list: widgetListFormatter,
      single: widgetSingleFormatter,
    },
    ...overrides,
  };
}

describe("registerCrudTools", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    vi.clearAllMocks();
  });

  describe("tool registration", () => {
    it("registers list, get, create, update, delete tools", () => {
      registerCrudTools(server as any, createWidgetConfig());

      expect(server.registerTool).toHaveBeenCalledTimes(5);
      expect(server.tools.has("holded_invoicing_list_widgets")).toBe(true);
      expect(server.tools.has("holded_invoicing_get_widget")).toBe(true);
      expect(server.tools.has("holded_invoicing_create_widget")).toBe(true);
      expect(server.tools.has("holded_invoicing_update_widget")).toBe(true);
      expect(server.tools.has("holded_invoicing_delete_widget")).toBe(true);
    });

    it("only registers tools whose schemas are provided", () => {
      registerCrudTools(server as any, createWidgetConfig({
        schemas: { list: {} as any, get: {} as any },
      }));

      expect(server.registerTool).toHaveBeenCalledTimes(2);
      expect(server.tools.has("holded_invoicing_list_widgets")).toBe(true);
      expect(server.tools.has("holded_invoicing_get_widget")).toBe(true);
      expect(server.tools.has("holded_invoicing_create_widget")).toBe(false);
    });

    it("sets correct annotations for list (readOnly)", () => {
      registerCrudTools(server as any, createWidgetConfig());

      const listConfig = server.tools.get("holded_invoicing_list_widgets")!.config;
      expect(listConfig.annotations).toEqual({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      });
    });

    it("sets correct annotations for delete (destructive)", () => {
      registerCrudTools(server as any, createWidgetConfig());

      const deleteConfig = server.tools.get("holded_invoicing_delete_widget")!.config;
      expect(deleteConfig.annotations).toEqual({
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      });
    });
  });

  describe("list handler", () => {
    it("calls makeApiRequest with GET and returns formatted response", async () => {
      const items = [{ id: "1", name: "Widget A" }, { id: "2", name: "Widget B" }];
      mockedMakeApiRequest.mockResolvedValueOnce(items);

      registerCrudTools(server as any, createWidgetConfig());
      const handler = server.tools.get("holded_invoicing_list_widgets")!.handler;
      const result = await handler({ page: 1, response_format: ResponseFormat.MARKDOWN });

      expect(mockedMakeApiRequest).toHaveBeenCalledWith("invoicing", "widgets", "GET", undefined, {});
      expect(result.content[0].text).toBe("Found 2 widgets");
      expect(result.structuredContent).toEqual({ widgets: items, count: 2, page: 1 });
    });

    it("adds page to query params when page > 1", async () => {
      mockedMakeApiRequest.mockResolvedValueOnce([]);

      registerCrudTools(server as any, createWidgetConfig());
      const handler = server.tools.get("holded_invoicing_list_widgets")!.handler;
      await handler({ page: 3, response_format: ResponseFormat.JSON });

      expect(mockedMakeApiRequest).toHaveBeenCalledWith("invoicing", "widgets", "GET", undefined, { page: 3 });
    });

    it("uses listEndpoint when provided", async () => {
      mockedMakeApiRequest.mockResolvedValueOnce([]);

      registerCrudTools(server as any, createWidgetConfig({ listEndpoint: "allwidgets" }));
      const handler = server.tools.get("holded_invoicing_list_widgets")!.handler;
      await handler({ page: 1, response_format: ResponseFormat.JSON });

      expect(mockedMakeApiRequest).toHaveBeenCalledWith("invoicing", "allwidgets", "GET", undefined, {});
    });

    it("uses custom listQueryParams when provided", async () => {
      mockedMakeApiRequest.mockResolvedValueOnce([]);

      registerCrudTools(server as any, createWidgetConfig({
        listQueryParams: (params) => {
          const qp: Record<string, unknown> = {};
          if (params.color) qp.color = params.color;
          return qp;
        },
      }));
      const handler = server.tools.get("holded_invoicing_list_widgets")!.handler;
      await handler({ page: 1, color: "red", response_format: ResponseFormat.JSON });

      expect(mockedMakeApiRequest).toHaveBeenCalledWith("invoicing", "allwidgets" || "widgets", "GET", undefined, expect.objectContaining({ color: "red" }));
    });

    it("returns JSON when format is JSON", async () => {
      const items = [{ id: "1", name: "Widget A" }];
      mockedMakeApiRequest.mockResolvedValueOnce(items);

      registerCrudTools(server as any, createWidgetConfig());
      const handler = server.tools.get("holded_invoicing_list_widgets")!.handler;
      const result = await handler({ page: 1, response_format: ResponseFormat.JSON });

      expect(result.content[0].text).toBe(JSON.stringify(items, null, 2));
    });

    it("handles API errors", async () => {
      mockedMakeApiRequest.mockRejectedValueOnce(new Error("API down"));

      registerCrudTools(server as any, createWidgetConfig());
      const handler = server.tools.get("holded_invoicing_list_widgets")!.handler;
      const result = await handler({ page: 1, response_format: ResponseFormat.JSON });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error");
    });
  });

  describe("get handler", () => {
    it("calls makeApiRequest with GET and resource ID in endpoint", async () => {
      const item = { id: "42", name: "Widget X" };
      mockedMakeApiRequest.mockResolvedValueOnce(item);

      registerCrudTools(server as any, createWidgetConfig());
      const handler = server.tools.get("holded_invoicing_get_widget")!.handler;
      const result = await handler({ widget_id: "42", response_format: ResponseFormat.MARKDOWN });

      expect(mockedMakeApiRequest).toHaveBeenCalledWith("invoicing", "widgets/42", "GET");
      expect(result.content[0].text).toBe("# Widget X\n**ID**: 42");
    });

    it("returns JSON when format is JSON", async () => {
      const item = { id: "42", name: "Widget X" };
      mockedMakeApiRequest.mockResolvedValueOnce(item);

      registerCrudTools(server as any, createWidgetConfig());
      const handler = server.tools.get("holded_invoicing_get_widget")!.handler;
      const result = await handler({ widget_id: "42", response_format: ResponseFormat.JSON });

      expect(result.content[0].text).toBe(JSON.stringify(item, null, 2));
    });

    it("handles API errors", async () => {
      mockedMakeApiRequest.mockRejectedValueOnce(new Error("Not found"));

      registerCrudTools(server as any, createWidgetConfig());
      const handler = server.tools.get("holded_invoicing_get_widget")!.handler;
      const result = await handler({ widget_id: "999", response_format: ResponseFormat.JSON });

      expect(result.isError).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/factory.test.ts
```

Expected: FAIL — `registerCrudTools` not found.

- [ ] **Step 3: Implement registerCrudTools with list and get**

Create `src/tools/factory.ts`:

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../services/api.js";
import { ResponseFormat } from "../constants.js";
import type { ApiModule } from "../services/api.js";

export interface CrudToolConfig<T> {
  module: ApiModule;
  toolPrefix: string;
  resource: string;
  resourcePlural: string;
  endpoint: string;
  listEndpoint?: string;
  idParam: string;
  schemas: {
    list?: unknown;
    get?: unknown;
    create?: unknown;
    update?: unknown;
    delete?: unknown;
  };
  titles: {
    list?: string;
    get?: string;
    create?: string;
    update?: string;
    delete?: string;
  };
  descriptions: {
    list?: string;
    get?: string;
    create?: string;
    update?: string;
    delete?: string;
  };
  formatters: {
    list: (items: T[]) => string;
    single: (item: T) => string;
  };
  listQueryParams?: (params: Record<string, unknown>) => Record<string, unknown>;
}

export function registerCrudTools<T>(server: McpServer, config: CrudToolConfig<T>): void {
  const {
    module,
    toolPrefix,
    resource,
    resourcePlural,
    endpoint,
    listEndpoint,
    idParam,
    schemas,
    titles,
    descriptions,
    formatters,
    listQueryParams,
  } = config;

  const effectiveListEndpoint = listEndpoint ?? endpoint;

  // List
  if (schemas.list) {
    server.registerTool(
      `${toolPrefix}_list_${resourcePlural}`,
      {
        title: titles.list,
        description: descriptions.list,
        inputSchema: schemas.list as any,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      async (params: Record<string, unknown>) => {
        try {
          const queryParams: Record<string, unknown> = {};
          if ((params.page as number) > 1) {
            queryParams.page = params.page;
          }
          if (listQueryParams) {
            Object.assign(queryParams, listQueryParams(params));
          }

          const items = await makeApiRequest<T[]>(
            module,
            effectiveListEndpoint,
            "GET",
            undefined,
            queryParams,
          );

          const textContent =
            params.response_format === ResponseFormat.MARKDOWN
              ? formatters.list(items)
              : JSON.stringify(items, null, 2);

          return {
            content: [{ type: "text", text: textContent }],
            structuredContent: { [resourcePlural]: items, count: items.length, page: params.page },
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: handleApiError(error) }],
            isError: true,
          };
        }
      },
    );
  }

  // Get
  if (schemas.get) {
    server.registerTool(
      `${toolPrefix}_get_${resource}`,
      {
        title: titles.get,
        description: descriptions.get,
        inputSchema: schemas.get as any,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      async (params: Record<string, unknown>) => {
        try {
          const id = params[idParam] as string;
          const item = await makeApiRequest<T>(module, `${endpoint}/${id}`, "GET");

          const textContent =
            params.response_format === ResponseFormat.MARKDOWN
              ? formatters.single(item)
              : JSON.stringify(item, null, 2);

          return {
            content: [{ type: "text", text: textContent }],
            structuredContent: toStructuredContent(item),
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: handleApiError(error) }],
            isError: true,
          };
        }
      },
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/factory.test.ts
```

Expected: All tests PASS (fix the `listQueryParams` test to use `"widgets"` not `"allwidgets"` — the test should match the implementation).

Note: Review the `listQueryParams` test carefully. The mock config doesn't set `listEndpoint`, so the endpoint used is `"widgets"`. Update the assertion accordingly:

```typescript
expect(mockedMakeApiRequest).toHaveBeenCalledWith("invoicing", "widgets", "GET", undefined, expect.objectContaining({ color: "red" }));
```

- [ ] **Step 5: Commit**

```bash
git add tests/factory.test.ts src/tools/factory.ts
git commit -m "feat: add CRUD factory with list and get operations (TDD)"
```

---

## Task 8: TDD CRUD Factory — Create, Update, Delete Operations

**Files:**
- Modify: `tests/factory.test.ts`
- Modify: `src/tools/factory.ts`

- [ ] **Step 1: Write failing tests for create, update, delete**

Append to the `registerCrudTools` describe block in `tests/factory.test.ts`:

```typescript
  describe("create handler", () => {
    it("calls makeApiRequest with POST and request body", async () => {
      const created = { id: "new-1", name: "New Widget" };
      mockedMakeApiRequest.mockResolvedValueOnce(created);

      registerCrudTools(server as any, createWidgetConfig());
      const handler = server.tools.get("holded_invoicing_create_widget")!.handler;
      const result = await handler({ name: "New Widget", color: "blue", response_format: ResponseFormat.JSON });

      expect(mockedMakeApiRequest).toHaveBeenCalledWith(
        "invoicing", "widgets", "POST",
        { name: "New Widget", color: "blue" },
      );
      expect(result.content[0].text).toContain("Widget created successfully");
      expect(result.content[0].text).toContain(JSON.stringify(created, null, 2));
    });

    it("strips response_format from request body", async () => {
      mockedMakeApiRequest.mockResolvedValueOnce({ id: "1" });

      registerCrudTools(server as any, createWidgetConfig());
      const handler = server.tools.get("holded_invoicing_create_widget")!.handler;
      await handler({ name: "Test", response_format: ResponseFormat.MARKDOWN });

      const sentBody = mockedMakeApiRequest.mock.calls[0][3] as Record<string, unknown>;
      expect(sentBody).not.toHaveProperty("response_format");
    });

    it("sets create annotations (not readOnly, not destructive)", () => {
      registerCrudTools(server as any, createWidgetConfig());

      const createConfig = server.tools.get("holded_invoicing_create_widget")!.config;
      expect(createConfig.annotations).toEqual({
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      });
    });

    it("handles API errors", async () => {
      mockedMakeApiRequest.mockRejectedValueOnce(new Error("Validation failed"));

      registerCrudTools(server as any, createWidgetConfig());
      const handler = server.tools.get("holded_invoicing_create_widget")!.handler;
      const result = await handler({ name: "Bad", response_format: ResponseFormat.JSON });

      expect(result.isError).toBe(true);
    });
  });

  describe("update handler", () => {
    it("calls makeApiRequest with PUT, extracting ID from params", async () => {
      const updated = { id: "42", name: "Updated Widget" };
      mockedMakeApiRequest.mockResolvedValueOnce(updated);

      registerCrudTools(server as any, createWidgetConfig());
      const handler = server.tools.get("holded_invoicing_update_widget")!.handler;
      const result = await handler({ widget_id: "42", name: "Updated Widget", response_format: ResponseFormat.JSON });

      expect(mockedMakeApiRequest).toHaveBeenCalledWith(
        "invoicing", "widgets/42", "PUT",
        { name: "Updated Widget" },
      );
      expect(result.content[0].text).toContain("Widget updated successfully");
    });

    it("strips idParam and response_format from request body", async () => {
      mockedMakeApiRequest.mockResolvedValueOnce({ id: "42" });

      registerCrudTools(server as any, createWidgetConfig());
      const handler = server.tools.get("holded_invoicing_update_widget")!.handler;
      await handler({ widget_id: "42", name: "Test", response_format: ResponseFormat.MARKDOWN });

      const sentBody = mockedMakeApiRequest.mock.calls[0][3] as Record<string, unknown>;
      expect(sentBody).not.toHaveProperty("widget_id");
      expect(sentBody).not.toHaveProperty("response_format");
      expect(sentBody).toEqual({ name: "Test" });
    });

    it("sets update annotations (idempotent)", () => {
      registerCrudTools(server as any, createWidgetConfig());

      const updateConfig = server.tools.get("holded_invoicing_update_widget")!.config;
      expect(updateConfig.annotations).toEqual({
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      });
    });
  });

  describe("delete handler", () => {
    it("calls makeApiRequest with DELETE and returns confirmation", async () => {
      mockedMakeApiRequest.mockResolvedValueOnce(undefined);

      registerCrudTools(server as any, createWidgetConfig());
      const handler = server.tools.get("holded_invoicing_delete_widget")!.handler;
      const result = await handler({ widget_id: "42" });

      expect(mockedMakeApiRequest).toHaveBeenCalledWith("invoicing", "widgets/42", "DELETE");
      expect(result.content[0].text).toBe("Widget 42 deleted successfully.");
      expect(result.structuredContent).toEqual({ deleted: true, id: "42" });
    });

    it("sets delete annotations (destructive)", () => {
      registerCrudTools(server as any, createWidgetConfig());

      const deleteConfig = server.tools.get("holded_invoicing_delete_widget")!.config;
      expect(deleteConfig.annotations).toEqual({
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      });
    });

    it("handles API errors", async () => {
      mockedMakeApiRequest.mockRejectedValueOnce(new Error("Not found"));

      registerCrudTools(server as any, createWidgetConfig());
      const handler = server.tools.get("holded_invoicing_delete_widget")!.handler;
      const result = await handler({ widget_id: "999" });

      expect(result.isError).toBe(true);
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/factory.test.ts
```

Expected: New tests FAIL — create/update/delete not implemented.

- [ ] **Step 3: Implement create, update, delete in factory**

Add to `registerCrudTools` in `src/tools/factory.ts`, after the get block:

```typescript
  // Create
  if (schemas.create) {
    server.registerTool(
      `${toolPrefix}_create_${resource}`,
      {
        title: titles.create,
        description: descriptions.create,
        inputSchema: schemas.create as any,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      async (params: Record<string, unknown>) => {
        try {
          const { response_format, ...body } = params;
          const item = await makeApiRequest<T>(module, endpoint, "POST", body);

          return {
            content: [{
              type: "text",
              text: `${resource.charAt(0).toUpperCase() + resource.slice(1)} created successfully.\n\n${JSON.stringify(item, null, 2)}`,
            }],
            structuredContent: toStructuredContent(item),
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: handleApiError(error) }],
            isError: true,
          };
        }
      },
    );
  }

  // Update
  if (schemas.update) {
    server.registerTool(
      `${toolPrefix}_update_${resource}`,
      {
        title: titles.update,
        description: descriptions.update,
        inputSchema: schemas.update as any,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      async (params: Record<string, unknown>) => {
        try {
          const id = params[idParam] as string;
          const { [idParam]: _, response_format, ...updateData } = params;
          const item = await makeApiRequest<T>(module, `${endpoint}/${id}`, "PUT", updateData);

          return {
            content: [{
              type: "text",
              text: `${resource.charAt(0).toUpperCase() + resource.slice(1)} updated successfully.\n\n${JSON.stringify(item, null, 2)}`,
            }],
            structuredContent: toStructuredContent(item),
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: handleApiError(error) }],
            isError: true,
          };
        }
      },
    );
  }

  // Delete
  if (schemas.delete) {
    server.registerTool(
      `${toolPrefix}_delete_${resource}`,
      {
        title: titles.delete,
        description: descriptions.delete,
        inputSchema: schemas.delete as any,
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      async (params: Record<string, unknown>) => {
        try {
          const id = params[idParam] as string;
          await makeApiRequest<void>(module, `${endpoint}/${id}`, "DELETE");

          return {
            content: [{
              type: "text",
              text: `${resource.charAt(0).toUpperCase() + resource.slice(1)} ${id} deleted successfully.`,
            }],
            structuredContent: { deleted: true, id },
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: handleApiError(error) }],
            isError: true,
          };
        }
      },
    );
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/factory.test.ts
```

Expected: All factory tests PASS.

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass across all suites.

- [ ] **Step 6: Commit**

```bash
git add tests/factory.test.ts src/tools/factory.ts
git commit -m "feat: complete CRUD factory with create, update, delete (TDD)"
```

---

## Task 9: Refactor Clean-Fit Tool Files (Reference: employees.ts)

**Files:**
- Modify: `src/tools/team/employees.ts`

Start with employees.ts as the reference refactoring — it's a clean 5-tool CRUD file.

- [ ] **Step 1: Run existing tests to confirm baseline**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Refactor employees.ts to use factory**

Replace the entire file content with:

```typescript
/**
 * Employee tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Employee } from "../../types.js";
import {
  ListEmployeesInputSchema,
  GetEmployeeInputSchema,
  CreateEmployeeInputSchema,
  UpdateEmployeeInputSchema,
  DeleteEmployeeInputSchema,
} from "../../schemas/team/employees.js";
import { registerCrudTools } from "../factory.js";

function formatEmployeesMarkdown(employees: Employee[]): string {
  if (!employees.length) {
    return "No employees found.";
  }

  const lines = ["# Employees", "", `Found ${employees.length} employees:`, ""];

  for (const employee of employees) {
    lines.push(`## ${employee.name}`);
    lines.push(`- **ID**: ${employee.id}`);
    if (employee.email) lines.push(`- **Email**: ${employee.email}`);
    if (employee.phone) lines.push(`- **Phone**: ${employee.phone}`);
    if (employee.position) lines.push(`- **Position**: ${employee.position}`);
    if (employee.department) lines.push(`- **Department**: ${employee.department}`);
    if (employee.status) lines.push(`- **Status**: ${employee.status}`);
    if (employee.hireDate) lines.push(`- **Hire Date**: ${new Date(employee.hireDate * 1000).toLocaleDateString()}`);
    lines.push("");
  }

  return lines.join("\n");
}

function formatEmployeeMarkdown(employee: Employee): string {
  const lines = [`# ${employee.name}`, "", `**ID**: ${employee.id}`, ""];

  if (employee.email) lines.push(`- **Email**: ${employee.email}`);
  if (employee.phone) lines.push(`- **Phone**: ${employee.phone}`);
  if (employee.position) lines.push(`- **Position**: ${employee.position}`);
  if (employee.department) lines.push(`- **Department**: ${employee.department}`);
  if (employee.status) lines.push(`- **Status**: ${employee.status}`);
  if (employee.hireDate) lines.push(`- **Hire Date**: ${new Date(employee.hireDate * 1000).toLocaleDateString()}`);

  return lines.join("\n");
}

export function registerEmployeeTools(server: McpServer): void {
  registerCrudTools<Employee>(server, {
    module: "team",
    toolPrefix: "holded_team",
    resource: "employee",
    resourcePlural: "employees",
    endpoint: "employees",
    idParam: "employee_id",
    schemas: {
      list: ListEmployeesInputSchema,
      get: GetEmployeeInputSchema,
      create: CreateEmployeeInputSchema,
      update: UpdateEmployeeInputSchema,
      delete: DeleteEmployeeInputSchema,
    },
    titles: {
      list: "List Holded Employees",
      get: "Get Holded Employee",
      create: "Create Holded Employee",
      update: "Update Holded Employee",
      delete: "Delete Holded Employee",
    },
    descriptions: {
      list: `List all employees from Holded.\n\nArgs:\n  - page (number): Page number for pagination (default: 1, max 500 items per page)\n  - response_format ('json' | 'markdown'): Output format (default: 'json')\n\nReturns:\n  Array of employees with id, name, email, position, department, and status.`,
      get: `Get a specific employee by ID from Holded.\n\nArgs:\n  - employee_id (string): The employee ID to retrieve (required)\n  - response_format ('json' | 'markdown'): Output format (default: 'json')\n\nReturns:\n  Employee details including name, email, position, department, and status.`,
      create: `Create a new employee in Holded.\n\nAccording to Holded Team API v1.0.1, employee creation supports:\n  - name (string): Employee name (required)\n  - lastName (string): Employee last name (required)\n  - email (string): Email address (required)\n  - sendInvite (boolean): Whether to send invitation email to the employee (optional)\n\nAdditional fields like phone, position, department should be set via Update Employee after creation.\n\nReturns:\n  The created employee with its assigned ID.`,
      update: `Update an existing employee in Holded.\n\nArgs:\n  - employee_id (string): The employee ID to update (required)\n  - name (string): Employee name\n  - lastName (string): Employee last name\n  - And other optional fields\n\nReturns:\n  Confirmation with status, info, and employee ID.`,
      delete: `Delete an employee from Holded.\n\nArgs:\n  - employee_id (string): The employee ID to delete (required)\n\nReturns:\n  Confirmation of deletion.`,
    },
    formatters: {
      list: formatEmployeesMarkdown,
      single: formatEmployeeMarkdown,
    },
  });
}
```

- [ ] **Step 3: Build to verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass. The behavior is unchanged — same tool names, same endpoints, same response shapes.

- [ ] **Step 5: Commit**

```bash
git add src/tools/team/employees.ts
git commit -m "refactor: convert employees.ts to use CRUD factory"
```

---

## Task 10: Refactor Remaining Clean-Fit Files

**Files:**
- Modify: `src/tools/invoicing/warehouses.ts`
- Modify: `src/tools/invoicing/services.ts`
- Modify: `src/tools/invoicing/sales-channels.ts`
- Modify: `src/tools/invoicing/expenses-accounts.ts`
- Modify: `src/tools/crm/funnels.ts`
- Modify: `src/tools/crm/events.ts`

All six files follow the same pattern as employees.ts. For each file:
1. Replace the `registerTool` calls with a single `registerCrudTools` call
2. Keep the markdown formatters
3. Keep the export function name unchanged (it's referenced by the module index)

**Important details per file:**

| File | toolPrefix | resource | resourcePlural | endpoint | idParam |
|------|-----------|----------|----------------|----------|---------|
| warehouses.ts | holded_invoicing | warehouse | warehouses | warehouses | warehouse_id |
| services.ts | holded_invoicing | service | services | services | service_id |
| sales-channels.ts | holded_invoicing | sales_channel | sales_channels | saleschannels | sales_channel_id |
| expenses-accounts.ts | holded_invoicing | expenses_account | expenses_accounts | expensesaccounts | expenses_account_id |
| funnels.ts | holded_crm | funnel | funnels | funnels | funnel_id |
| events.ts | holded_crm | event | events | events | event_id |

- [ ] **Step 1: Refactor warehouses.ts**

Same pattern as employees.ts. Import `registerCrudTools`, replace 5 `server.registerTool` calls with one `registerCrudTools` call. Keep `formatWarehousesMarkdown` and `formatWarehouseMarkdown`.

- [ ] **Step 2: Refactor services.ts**

Same pattern. Keep `formatServicesMarkdown` and `formatServiceMarkdown`.

- [ ] **Step 3: Refactor sales-channels.ts**

Same pattern. Keep `formatSalesChannelsMarkdown` and `formatSalesChannelMarkdown`.

- [ ] **Step 4: Refactor expenses-accounts.ts**

Same pattern. Keep `formatExpensesAccountsMarkdown` and `formatExpensesAccountMarkdown`.

- [ ] **Step 5: Refactor funnels.ts**

This file uses inline markdown formatting instead of separate functions. Extract inline formatting into `formatFunnelsMarkdown` and `formatFunnelMarkdown` functions, then use factory.

- [ ] **Step 6: Refactor events.ts**

Same as funnels — extract inline formatters, then use factory.

- [ ] **Step 7: Build and test**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: No compile errors, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/tools/invoicing/warehouses.ts src/tools/invoicing/services.ts src/tools/invoicing/sales-channels.ts src/tools/invoicing/expenses-accounts.ts src/tools/crm/funnels.ts src/tools/crm/events.ts
git commit -m "refactor: convert 6 clean-fit tool files to use CRUD factory"
```

---

## Task 11: Refactor Mixed Tool Files — Invoicing

**Files:**
- Modify: `src/tools/invoicing/contacts.ts`
- Modify: `src/tools/invoicing/products.ts`
- Modify: `src/tools/invoicing/payments.ts`
- Modify: `src/tools/invoicing/remittances.ts`
- Modify: `src/tools/invoicing/accounts.ts` (in accounting, but listed here for the pattern)

These files have standard CRUD tools plus extra custom tools. Use the factory for the standard portion, keep custom tools with `withErrorHandling` from utilities.

- [ ] **Step 1: Refactor contacts.ts**

Use factory for contacts CRUD (list, get, create, update, delete) and a second factory call for contact groups CRUD (list_contact_groups, get_contact_group, create_contact_group, update_contact_group, delete_contact_group). Keep attachment tools (list_contact_attachments, get_contact_attachment, upload_contact_attachment) as manual handlers using `withErrorHandling`.

Contact groups config:
```typescript
registerCrudTools<ContactGroup>(server, {
  module: "invoicing",
  toolPrefix: "holded_invoicing",
  resource: "contact_group",
  resourcePlural: "contact_groups",
  endpoint: "contactgroups",
  idParam: "group_id",
  schemas: { list: ListContactGroupsInputSchema, ... },
  ...
});
```

- [ ] **Step 2: Refactor products.ts**

Use factory for products CRUD (5 tools). Keep stock tools (list_products_stock, update_product_stock) and image tools (get_product_image, list_product_images, get_product_secondary_image, upload_product_image) as manual handlers.

- [ ] **Step 3: Refactor payments.ts**

Use factory for payments CRUD (list, get, delete). Create and update need snake_to_camel conversion (`doc_id` → `docId`, `account_id` → `accountId`), so keep them as manual handlers using `withErrorHandling` and `snakeToCamel`.

- [ ] **Step 4: Refactor remittances.ts**

Use factory for remittances (list, get only — no create/update/delete).

- [ ] **Step 5: Refactor accounting/accounts.ts**

Use factory with `listEndpoint: "chartofaccounts"` and `endpoint: "account"` for the standard CRUD. The custom `listQueryParams` handles `include_empty` (boolean → 0/1) and date params:

```typescript
registerCrudTools<AccountingAccount>(server, {
  module: "accounting",
  toolPrefix: "holded_accounting",
  resource: "account",
  resourcePlural: "accounts",
  endpoint: "account",
  listEndpoint: "chartofaccounts",
  idParam: "account_id",
  listQueryParams: (params) => {
    const qp: Record<string, unknown> = {};
    if (params.include_empty !== undefined) qp.includeEmpty = params.include_empty ? 1 : 0;
    if (params.starttmp !== undefined) qp.starttmp = params.starttmp;
    if (params.endtmp !== undefined) qp.endtmp = params.endtmp;
    return qp;
  },
  ...
});
```

- [ ] **Step 6: Build and test**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: No compile errors, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/tools/invoicing/contacts.ts src/tools/invoicing/products.ts src/tools/invoicing/payments.ts src/tools/invoicing/remittances.ts src/tools/accounting/accounts.ts
git commit -m "refactor: convert mixed invoicing/accounting tool files to use CRUD factory"
```

---

## Task 12: Refactor Mixed Tool Files — CRM, Projects, Team

**Files:**
- Modify: `src/tools/crm/leads.ts`
- Modify: `src/tools/crm/bookings.ts`
- Modify: `src/tools/projects/projects.ts`
- Modify: `src/tools/projects/tasks.ts`

- [ ] **Step 1: Refactor leads.ts**

Use factory for lead CRUD (list, get, create, update, delete). `listQueryParams` handles `funnel_id`:

```typescript
listQueryParams: (params) => {
  const qp: Record<string, unknown> = {};
  if (params.funnel_id) qp.funnelId = params.funnel_id;
  return qp;
},
```

Keep all sub-resource tools (notes, tasks, stages, dates) as manual handlers using `withErrorHandling`. These use nested endpoints like `leads/{lead_id}/notes`.

- [ ] **Step 2: Refactor bookings.ts**

Use factory for booking CRUD (list, get, create, update, delete). Keep `list_booking_locations` and `get_available_slots` as manual handlers.

- [ ] **Step 3: Refactor projects.ts**

Use factory for project CRUD (list, get, create, update, delete). Keep `get_project_summary` as a manual handler.

- [ ] **Step 4: Refactor tasks.ts**

Use factory for task CRUD (list, get, update, delete). Keep create as manual handler since it needs `snakeToCamel` conversion (`project_id` → `projectId`, `list_id` → `listId`). Use `listQueryParams` for the list handler's `project_id` conversion.

- [ ] **Step 5: Build and test**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: No compile errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/tools/crm/leads.ts src/tools/crm/bookings.ts src/tools/projects/projects.ts src/tools/projects/tasks.ts
git commit -m "refactor: convert CRM and projects tool files to use CRUD factory"
```

---

## Task 13: Refactor Utility-Only Tool Files

**Files:**
- Modify: `src/tools/invoicing/documents.ts`
- Modify: `src/tools/invoicing/treasury.ts`
- Modify: `src/tools/invoicing/taxes.ts`
- Modify: `src/tools/invoicing/numbering-series.ts`
- Modify: `src/tools/projects/time-tracking.ts`
- Modify: `src/tools/team/time-tracking.ts`
- Modify: `src/tools/accounting/daily-ledger.ts`
- Modify: `src/tools/accounting/account-balances.ts`

These files have non-standard patterns that don't fit the factory (doc_type path params, sub-resource patterns, composite tools). They won't use `registerCrudTools`, but they should use `withErrorHandling` from utilities to eliminate the repeated try/catch blocks.

- [ ] **Step 1: Refactor documents.ts**

All 14 tools use `doc_type` in the endpoint path, so the factory doesn't fit. Replace the try/catch pattern in each handler with `withErrorHandling`. Example transformation:

Before:
```typescript
async (params: ListDocumentsInput) => {
  try {
    // ... handler logic
  } catch (error) {
    return { content: [{ type: "text", text: handleApiError(error) }], isError: true };
  }
}
```

After — extract the handler and wrap:
```typescript
import { withErrorHandling } from "../utilities.js";

// In registerDocumentTools:
server.registerTool(
  "holded_invoicing_list_documents",
  { ... config ... },
  withErrorHandling(async (params) => {
    // ... handler logic, no try/catch needed
    return { content: [...], structuredContent: {...} };
  }),
);
```

Apply this pattern to all 14 tools in documents.ts. This eliminates 14 try/catch blocks.

- [ ] **Step 2: Refactor treasury.ts, taxes.ts, numbering-series.ts**

Same pattern — wrap each handler with `withErrorHandling`. These are small files (1-4 tools each).

- [ ] **Step 3: Refactor projects/time-tracking.ts and team/time-tracking.ts**

Same pattern — wrap each handler with `withErrorHandling`. These files have sub-resource patterns (dual path params) that don't fit the factory.

- [ ] **Step 4: Refactor accounting/daily-ledger.ts and account-balances.ts**

Same pattern — wrap handlers with `withErrorHandling`. The account-balances composite tool has complex logic that stays as-is.

- [ ] **Step 5: Build and test**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: No compile errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/tools/invoicing/documents.ts src/tools/invoicing/treasury.ts src/tools/invoicing/taxes.ts src/tools/invoicing/numbering-series.ts src/tools/projects/time-tracking.ts src/tools/team/time-tracking.ts src/tools/accounting/daily-ledger.ts src/tools/accounting/account-balances.ts
git commit -m "refactor: apply withErrorHandling to remaining tool files"
```

---

## Task 14: Domain-Specific Tests — Markdown Formatters

**Files:**
- Modify: `tests/factory.test.ts` (or create separate test files)

Snapshot tests for markdown formatters verify that formatting output doesn't regress during future changes.

- [ ] **Step 1: Write snapshot tests for representative formatters**

Add a new test file `tests/formatters.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

// Import formatters from refactored tool files
// These are still private functions — you may need to export them
// or test them indirectly through the factory

// For employees (already a clean example):
import { formatEmployeesMarkdown, formatEmployeeMarkdown } from "../src/tools/team/employees.js";

describe("employee formatters", () => {
  it("formats employee list as markdown", () => {
    const employees = [
      { id: "1", name: "Alice", email: "alice@test.com", phone: null, position: "Dev", department: "Eng", status: "active", hireDate: 1700000000 },
      { id: "2", name: "Bob", email: null, phone: "555-1234", position: null, department: null, status: null, hireDate: null },
    ] as any[];

    const result = formatEmployeesMarkdown(employees);

    expect(result).toContain("# Employees");
    expect(result).toContain("Found 2 employees");
    expect(result).toContain("## Alice");
    expect(result).toContain("**Email**: alice@test.com");
    expect(result).toContain("## Bob");
    expect(result).toContain("**Phone**: 555-1234");
  });

  it("handles empty employee list", () => {
    expect(formatEmployeesMarkdown([])).toBe("No employees found.");
  });

  it("formats single employee", () => {
    const employee = { id: "1", name: "Alice", email: "alice@test.com", position: "Dev" } as any;

    const result = formatEmployeeMarkdown(employee);

    expect(result).toContain("# Alice");
    expect(result).toContain("**ID**: 1");
    expect(result).toContain("**Email**: alice@test.com");
    expect(result).toContain("**Position**: Dev");
  });
});
```

Note: The formatters in employees.ts are currently not exported. You need to add `export` to `formatEmployeesMarkdown` and `formatEmployeeMarkdown` (and similarly for other tool files you want to test). This is acceptable since the factory config already references them.

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/formatters.test.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Add formatter tests for contacts and accounts**

Following the same pattern, add tests for `formatContactsMarkdown`, `formatContactMarkdown`, `formatAccountingAccountsMarkdown`, `formatAccountingAccountMarkdown`. These represent the two other common patterns (invoicing entities, accounting entities).

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/formatters.test.ts src/tools/team/employees.ts src/tools/invoicing/contacts.ts src/tools/accounting/accounts.ts
git commit -m "test: add markdown formatter snapshot tests"
```

---

## Task 15: Smoke Test Infrastructure

**Files:**
- Create: `tests/smoke.test.ts`

- [ ] **Step 1: Create smoke test file**

```typescript
import { describe, it, expect } from "vitest";
import { makeApiRequest, initializeApi } from "../src/services/api.js";

const API_KEY = process.env.HOLDED_TEST_API_KEY;

// Skip entire suite if no API key
const describeSmoke = API_KEY ? describe : describe.skip;

describeSmoke("Smoke Tests (Real API)", () => {
  // Initialize once for all tests
  initializeApi(API_KEY!);

  describe("invoicing", () => {
    it("lists contacts", async () => {
      const contacts = await makeApiRequest<unknown[]>("invoicing", "contacts", "GET");
      expect(Array.isArray(contacts)).toBe(true);
    });

    it("lists products", async () => {
      const products = await makeApiRequest<unknown[]>("invoicing", "products", "GET");
      expect(Array.isArray(products)).toBe(true);
    });

    it("lists warehouses", async () => {
      const warehouses = await makeApiRequest<unknown[]>("invoicing", "warehouses", "GET");
      expect(Array.isArray(warehouses)).toBe(true);
    });
  });

  describe("crm", () => {
    it("lists funnels", async () => {
      const funnels = await makeApiRequest<unknown[]>("crm", "funnels", "GET");
      expect(Array.isArray(funnels)).toBe(true);
    });

    it("lists leads", async () => {
      const leads = await makeApiRequest<unknown[]>("crm", "leads", "GET");
      expect(Array.isArray(leads)).toBe(true);
    });
  });

  describe("team", () => {
    it("lists employees", async () => {
      const employees = await makeApiRequest<unknown[]>("team", "employees", "GET");
      expect(Array.isArray(employees)).toBe(true);
    });
  });

  describe("projects", () => {
    it("lists projects", async () => {
      const projects = await makeApiRequest<unknown[]>("projects", "projects", "GET");
      expect(Array.isArray(projects)).toBe(true);
    });
  });

  describe("accounting", () => {
    it("lists chart of accounts", async () => {
      const accounts = await makeApiRequest<unknown[]>("accounting", "chartofaccounts", "GET");
      expect(Array.isArray(accounts)).toBe(true);
    });
  });
}, { timeout: 30000 });
```

- [ ] **Step 2: Verify smoke tests are skipped without API key**

```bash
npx vitest run tests/smoke.test.ts
```

Expected: All tests skipped (no `HOLDED_TEST_API_KEY` set).

- [ ] **Step 3: Commit**

```bash
git add tests/smoke.test.ts
git commit -m "test: add optional real-API smoke tests"
```

---

## Task 16: Update CI and Final Cleanup

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Update CI workflow**

The CI workflow currently runs `npm test`, which now points to `vitest run`. No change needed for the test command. But verify that the workflow doesn't reference Jest anywhere.

If `npm test` already runs `vitest run` (from the package.json update in Task 1), no CI change is needed.

- [ ] **Step 2: Run full test suite one final time**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 3: Build project**

```bash
npm run build
```

Expected: Clean build, no TypeScript errors.

- [ ] **Step 4: Verify smoke test command works**

```bash
npx vitest run tests/smoke.test.ts
```

Expected: Tests skipped (no API key).

- [ ] **Step 5: Commit any remaining changes**

```bash
git status
# If there are any changes:
git add -A && git commit -m "chore: final cleanup after test strategy redesign"
```

---

## Notes for Implementer

### Behavioral Differences to Watch

The factory standardizes some behaviors that currently vary slightly between files:

1. **Update structuredContent**: Currently some update handlers return `toStructuredContent(result)` while others return custom objects like `{ updated: true, employeeId: id, ...result }`. The factory uses `toStructuredContent(item)`. This is a minor behavioral change — verify it's acceptable.

2. **List structuredContent key**: The factory uses `{ [resourcePlural]: items, count, page }`. Currently, most files use the same pattern but the key name varies (e.g., `employees`, `contacts`). The factory config's `resourcePlural` determines this key.

3. **Create response text**: The factory uses `"${Resource} created successfully.\n\n${JSON.stringify(...)}"`. Current files use similar but slightly varied text (e.g., "Employee created successfully" vs "Contact created successfully"). The factory capitalizes the first letter of `resource`.

### Files That Need Formatter Exports

To test formatters directly, add `export` to the formatter functions in the refactored tool files. This is already needed since the factory config references them.

### The snakeToCamel Utility

Used directly by non-factory tools that need param conversion (payments create/update, tasks create, documents pay). These tools call `snakeToCamel` on specific fields before passing to `makeApiRequest`.
