/**
 * Tests for CRUD tool factory — registerCrudTools
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/services/api.js", () => ({
  makeApiRequest: vi.fn(),
  handleApiError: vi.fn((e: Error) => `Error: ${e.message}`),
  toStructuredContent: vi.fn((data: unknown) => data),
}));

import { makeApiRequest, handleApiError, toStructuredContent } from "../src/services/api.js";
import { ResponseFormat } from "../src/constants.js";
import { registerCrudTools, type CrudToolConfig } from "../src/tools/factory.js";

const mockMakeApiRequest = vi.mocked(makeApiRequest);
const mockHandleApiError = vi.mocked(handleApiError);
const mockToStructuredContent = vi.mocked(toStructuredContent);

interface TestItem {
  id: string;
  name: string;
}

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

function createTestConfig(overrides?: Partial<CrudToolConfig<TestItem>>): CrudToolConfig<TestItem> {
  return {
    module: "invoicing",
    toolPrefix: "holded_invoicing",
    resource: "widget",
    resourcePlural: "widgets",
    endpoint: "widgets",
    idParam: "widget_id",
    schemas: {
      list: { type: "object" },
      get: { type: "object" },
    },
    titles: {
      list: "List Widgets",
      get: "Get Widget",
    },
    descriptions: {
      list: "List all widgets",
      get: "Get a single widget",
    },
    formatters: {
      list: (items: TestItem[]) => items.map((i) => `- ${i.name}`).join("\n"),
      single: (item: TestItem) => `# ${item.name}\nID: ${item.id}`,
    },
    ...overrides,
  };
}

function createFullCrudConfig(overrides?: Partial<CrudToolConfig<TestItem>>): CrudToolConfig<TestItem> {
  return createTestConfig({
    schemas: {
      list: { type: "object" },
      get: { type: "object" },
      create: { type: "object" },
      update: { type: "object" },
      delete: { type: "object" },
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
      get: "Get a single widget",
      create: "Create a new widget",
      update: "Update an existing widget",
      delete: "Delete a widget",
    },
    ...overrides,
  });
}

// ============================================================
// Task 7: List and Get operations
// ============================================================

describe("registerCrudTools — list", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
  });

  it("registers correct tool names", () => {
    registerCrudTools(server as any, createTestConfig());
    expect(server.tools.has("holded_invoicing_list_widgets")).toBe(true);
    expect(server.tools.has("holded_invoicing_get_widget")).toBe(true);
  });

  it("only registers tools whose schemas are provided", () => {
    const config = createTestConfig({
      schemas: { list: { type: "object" } },
    });
    registerCrudTools(server as any, config);

    expect(server.tools.has("holded_invoicing_list_widgets")).toBe(true);
    expect(server.tools.has("holded_invoicing_get_widget")).toBe(false);
    expect(server.tools.has("holded_invoicing_create_widget")).toBe(false);
    expect(server.tools.has("holded_invoicing_update_widget")).toBe(false);
    expect(server.tools.has("holded_invoicing_delete_widget")).toBe(false);
  });

  it("sets correct annotations for list (readOnly)", () => {
    registerCrudTools(server as any, createTestConfig());
    const tool = server.tools.get("holded_invoicing_list_widgets")!;
    expect(tool.config.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    });
  });

  it("calls makeApiRequest with GET and returns formatted response", async () => {
    const items: TestItem[] = [
      { id: "1", name: "Alpha" },
      { id: "2", name: "Beta" },
    ];
    mockMakeApiRequest.mockResolvedValue(items);

    registerCrudTools(server as any, createTestConfig());
    const handler = server.tools.get("holded_invoicing_list_widgets")!.handler;
    const result = await handler({ page: 1, response_format: ResponseFormat.MARKDOWN });

    expect(mockMakeApiRequest).toHaveBeenCalledWith(
      "invoicing",
      "widgets",
      "GET",
      undefined,
      {},
    );
    expect(result.content[0].text).toBe("- Alpha\n- Beta");
    expect(result.structuredContent).toEqual({
      widgets: items,
      count: 2,
      page: 1,
    });
  });

  it("adds page to query params when page > 1", async () => {
    mockMakeApiRequest.mockResolvedValue([]);
    registerCrudTools(server as any, createTestConfig());
    const handler = server.tools.get("holded_invoicing_list_widgets")!.handler;

    await handler({ page: 3, response_format: ResponseFormat.JSON });

    expect(mockMakeApiRequest).toHaveBeenCalledWith(
      "invoicing",
      "widgets",
      "GET",
      undefined,
      { page: 3 },
    );
  });

  it("uses listEndpoint when provided", async () => {
    mockMakeApiRequest.mockResolvedValue([]);
    const config = createTestConfig({ listEndpoint: "allwidgets" });
    registerCrudTools(server as any, config);
    const handler = server.tools.get("holded_invoicing_list_widgets")!.handler;

    await handler({ page: 1, response_format: ResponseFormat.JSON });

    expect(mockMakeApiRequest).toHaveBeenCalledWith(
      "invoicing",
      "allwidgets",
      "GET",
      undefined,
      {},
    );
  });

  it("uses custom listQueryParams when provided", async () => {
    mockMakeApiRequest.mockResolvedValue([]);
    const config = createTestConfig({
      listQueryParams: (params: Record<string, unknown>) => {
        const qp: Record<string, unknown> = {};
        if (params.status) qp.status = params.status;
        return qp;
      },
    });
    registerCrudTools(server as any, config);
    const handler = server.tools.get("holded_invoicing_list_widgets")!.handler;

    await handler({ page: 1, response_format: ResponseFormat.JSON, status: "active" });

    expect(mockMakeApiRequest).toHaveBeenCalledWith(
      "invoicing",
      "widgets",
      "GET",
      undefined,
      { status: "active" },
    );
  });

  it("returns JSON when format is JSON", async () => {
    const items: TestItem[] = [{ id: "1", name: "Alpha" }];
    mockMakeApiRequest.mockResolvedValue(items);

    registerCrudTools(server as any, createTestConfig());
    const handler = server.tools.get("holded_invoicing_list_widgets")!.handler;
    const result = await handler({ page: 1, response_format: ResponseFormat.JSON });

    expect(result.content[0].text).toBe(JSON.stringify(items, null, 2));
  });

  it("handles API errors", async () => {
    const error = new Error("network failure");
    mockMakeApiRequest.mockRejectedValue(error);

    registerCrudTools(server as any, createTestConfig());
    const handler = server.tools.get("holded_invoicing_list_widgets")!.handler;
    const result = await handler({ page: 1, response_format: ResponseFormat.JSON });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: network failure");
    expect(mockHandleApiError).toHaveBeenCalledWith(error);
  });
});

describe("registerCrudTools — get", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
  });

  it("sets correct annotations for get (readOnly)", () => {
    registerCrudTools(server as any, createTestConfig());
    const tool = server.tools.get("holded_invoicing_get_widget")!;
    expect(tool.config.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    });
  });

  it("calls makeApiRequest with GET and resource ID in endpoint", async () => {
    const item: TestItem = { id: "abc123", name: "Alpha" };
    mockMakeApiRequest.mockResolvedValue(item);

    registerCrudTools(server as any, createTestConfig());
    const handler = server.tools.get("holded_invoicing_get_widget")!.handler;
    const result = await handler({ widget_id: "abc123", response_format: ResponseFormat.MARKDOWN });

    expect(mockMakeApiRequest).toHaveBeenCalledWith(
      "invoicing",
      "widgets/abc123",
      "GET",
    );
    expect(result.content[0].text).toBe("# Alpha\nID: abc123");
    expect(mockToStructuredContent).toHaveBeenCalledWith(item);
  });

  it("returns JSON when format is JSON", async () => {
    const item: TestItem = { id: "abc123", name: "Alpha" };
    mockMakeApiRequest.mockResolvedValue(item);

    registerCrudTools(server as any, createTestConfig());
    const handler = server.tools.get("holded_invoicing_get_widget")!.handler;
    const result = await handler({ widget_id: "abc123", response_format: ResponseFormat.JSON });

    expect(result.content[0].text).toBe(JSON.stringify(item, null, 2));
  });

  it("handles API errors", async () => {
    const error = new Error("not found");
    mockMakeApiRequest.mockRejectedValue(error);

    registerCrudTools(server as any, createTestConfig());
    const handler = server.tools.get("holded_invoicing_get_widget")!.handler;
    const result = await handler({ widget_id: "bad-id", response_format: ResponseFormat.JSON });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: not found");
  });
});

// ============================================================
// Task 8: Create, Update, Delete operations
// ============================================================

describe("registerCrudTools — create", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
  });

  it("calls makeApiRequest with POST and request body", async () => {
    const created: TestItem = { id: "new-1", name: "New Widget" };
    mockMakeApiRequest.mockResolvedValue(created);

    registerCrudTools(server as any, createFullCrudConfig());
    const handler = server.tools.get("holded_invoicing_create_widget")!.handler;
    const result = await handler({ name: "New Widget", response_format: ResponseFormat.JSON });

    expect(mockMakeApiRequest).toHaveBeenCalledWith(
      "invoicing",
      "widgets",
      "POST",
      { name: "New Widget" },
    );
    expect(result.content[0].text).toContain("Widget created successfully.");
    expect(result.content[0].text).toContain(JSON.stringify(created, null, 2));
    expect(mockToStructuredContent).toHaveBeenCalledWith(created);
  });

  it("strips response_format from request body", async () => {
    const created: TestItem = { id: "new-1", name: "New Widget" };
    mockMakeApiRequest.mockResolvedValue(created);

    registerCrudTools(server as any, createFullCrudConfig());
    const handler = server.tools.get("holded_invoicing_create_widget")!.handler;
    await handler({ name: "New Widget", response_format: ResponseFormat.MARKDOWN });

    expect(mockMakeApiRequest).toHaveBeenCalledWith(
      "invoicing",
      "widgets",
      "POST",
      { name: "New Widget" },
    );
  });

  it("sets correct annotations (not readOnly, not destructive)", () => {
    registerCrudTools(server as any, createFullCrudConfig());
    const tool = server.tools.get("holded_invoicing_create_widget")!;
    expect(tool.config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it("handles API errors", async () => {
    const error = new Error("validation failed");
    mockMakeApiRequest.mockRejectedValue(error);

    registerCrudTools(server as any, createFullCrudConfig());
    const handler = server.tools.get("holded_invoicing_create_widget")!.handler;
    const result = await handler({ name: "Bad Widget", response_format: ResponseFormat.JSON });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: validation failed");
    expect(mockHandleApiError).toHaveBeenCalledWith(error);
  });
});

describe("registerCrudTools — update", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
  });

  it("calls makeApiRequest with PUT, extracting ID from params", async () => {
    const updated: TestItem = { id: "abc123", name: "Updated Widget" };
    mockMakeApiRequest.mockResolvedValue(updated);

    registerCrudTools(server as any, createFullCrudConfig());
    const handler = server.tools.get("holded_invoicing_update_widget")!.handler;
    const result = await handler({
      widget_id: "abc123",
      name: "Updated Widget",
      response_format: ResponseFormat.JSON,
    });

    expect(mockMakeApiRequest).toHaveBeenCalledWith(
      "invoicing",
      "widgets/abc123",
      "PUT",
      { name: "Updated Widget" },
    );
    expect(result.content[0].text).toContain("Widget updated successfully.");
    expect(result.content[0].text).toContain(JSON.stringify(updated, null, 2));
    expect(mockToStructuredContent).toHaveBeenCalledWith(updated);
  });

  it("strips idParam and response_format from request body", async () => {
    const updated: TestItem = { id: "abc123", name: "Updated Widget" };
    mockMakeApiRequest.mockResolvedValue(updated);

    registerCrudTools(server as any, createFullCrudConfig());
    const handler = server.tools.get("holded_invoicing_update_widget")!.handler;
    await handler({
      widget_id: "abc123",
      name: "Updated Widget",
      response_format: ResponseFormat.MARKDOWN,
    });

    expect(mockMakeApiRequest).toHaveBeenCalledWith(
      "invoicing",
      "widgets/abc123",
      "PUT",
      { name: "Updated Widget" },
    );
  });

  it("sets correct annotations (idempotent)", () => {
    registerCrudTools(server as any, createFullCrudConfig());
    const tool = server.tools.get("holded_invoicing_update_widget")!;
    expect(tool.config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    });
  });

  it("handles API errors", async () => {
    mockMakeApiRequest.mockRejectedValue(new Error("not found"));

    registerCrudTools(server as any, createFullCrudConfig());
    const handler = server.tools.get("holded_invoicing_update_widget")!.handler;
    const result = await handler({ widget_id: "abc123", name: "Test", response_format: ResponseFormat.JSON });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not found");
  });
});

describe("registerCrudTools — delete", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
  });

  it("calls makeApiRequest with DELETE and returns confirmation", async () => {
    mockMakeApiRequest.mockResolvedValue(undefined);

    registerCrudTools(server as any, createFullCrudConfig());
    const handler = server.tools.get("holded_invoicing_delete_widget")!.handler;
    const result = await handler({ widget_id: "abc123", response_format: ResponseFormat.JSON });

    expect(mockMakeApiRequest).toHaveBeenCalledWith(
      "invoicing",
      "widgets/abc123",
      "DELETE",
    );
    expect(result.content[0].text).toBe("Widget abc123 deleted successfully.");
    expect(result.structuredContent).toEqual({ deleted: true, id: "abc123" });
  });

  it("sets correct annotations (destructive)", () => {
    registerCrudTools(server as any, createFullCrudConfig());
    const tool = server.tools.get("holded_invoicing_delete_widget")!;
    expect(tool.config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    });
  });

  it("handles API errors", async () => {
    const error = new Error("forbidden");
    mockMakeApiRequest.mockRejectedValue(error);

    registerCrudTools(server as any, createFullCrudConfig());
    const handler = server.tools.get("holded_invoicing_delete_widget")!.handler;
    const result = await handler({ widget_id: "abc123", response_format: ResponseFormat.JSON });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: forbidden");
    expect(mockHandleApiError).toHaveBeenCalledWith(error);
  });
});
