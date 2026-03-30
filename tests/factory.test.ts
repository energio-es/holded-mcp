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
