/**
 * Domain-specific handler tests for non-standard tool handlers
 * (leads sub-resources, bookings custom endpoints, documents custom endpoints)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/services/api.js", () => ({
  makeApiRequest: vi.fn(),
  makeMultipartApiRequest: vi.fn(),
  handleApiError: vi.fn((e: Error) => `Error: ${e.message}`),
  toStructuredContent: vi.fn((data: unknown) => data),
  initializeApi: vi.fn(),
  getApiKey: vi.fn(() => "test-key"),
}));

import { makeApiRequest } from "../src/services/api.js";
const mockMakeApiRequest = vi.mocked(makeApiRequest);

import { registerLeadTools } from "../src/tools/crm/leads.js";
import { registerBookingTools } from "../src/tools/crm/bookings.js";
import { registerFunnelTools } from "../src/tools/crm/funnels.js";
import { registerDocumentTools } from "../src/tools/invoicing/documents.js";

function createMockServer() {
  const tools = new Map<string, { config: any; handler: Function }>();
  return {
    registerTool: vi.fn((name: string, config: any, handler: Function) => {
      tools.set(name, { config, handler });
      return { enable: vi.fn(), disable: vi.fn(), update: vi.fn(), remove: vi.fn() };
    }),
    tools,
  };
}

// ============================================================
// Lead sub-resource handler tests
// ============================================================

describe("Lead sub-resource handlers", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    registerLeadTools(server as any);
  });

  describe("holded_crm_create_lead_note", () => {
    it("calls makeApiRequest with POST to leads/{id}/notes", async () => {
      const mockNote = { id: "note-1", title: "Test note", desc: "Test description" };
      mockMakeApiRequest.mockResolvedValueOnce(mockNote);

      const handler = server.tools.get("holded_crm_create_lead_note")!.handler;
      const result = await handler({ lead_id: "lead-abc", title: "Test note", desc: "Test description" });

      expect(mockMakeApiRequest).toHaveBeenCalledWith(
        "crm",
        "leads/lead-abc/notes",
        "POST",
        { title: "Test note", desc: "Test description" },
      );
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Note added successfully");
    });
  });

  describe("holded_crm_update_lead_note", () => {
    it("calls makeApiRequest with PUT to leads/{id}/notes with noteId and title", async () => {
      const mockNote = { id: "note-1", title: "Updated note" };
      mockMakeApiRequest.mockResolvedValueOnce(mockNote);

      const handler = server.tools.get("holded_crm_update_lead_note")!.handler;
      const result = await handler({
        lead_id: "lead-abc",
        note_id: "note-1",
        title: "Updated note",
      });

      expect(mockMakeApiRequest).toHaveBeenCalledWith(
        "crm",
        "leads/lead-abc/notes",
        "PUT",
        { noteId: "note-1", title: "Updated note" },
      );
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Note updated successfully");
    });
  });

  describe("holded_crm_create_lead_task", () => {
    it("calls makeApiRequest with POST to leads/{id}/tasks", async () => {
      const mockTask = { id: "task-1", name: "Follow up" };
      mockMakeApiRequest.mockResolvedValueOnce(mockTask);

      const handler = server.tools.get("holded_crm_create_lead_task")!.handler;
      const result = await handler({
        lead_id: "lead-abc",
        name: "Follow up",
      });

      expect(mockMakeApiRequest).toHaveBeenCalledWith(
        "crm",
        "leads/lead-abc/tasks",
        "POST",
        { name: "Follow up" },
      );
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Task created successfully");
    });
  });

  describe("holded_crm_update_lead_task", () => {
    it("calls makeApiRequest with PUT to leads/{id}/tasks with taskId", async () => {
      const mockTask = { id: "task-1", name: "Updated task" };
      mockMakeApiRequest.mockResolvedValueOnce(mockTask);

      const handler = server.tools.get("holded_crm_update_lead_task")!.handler;
      const result = await handler({
        lead_id: "lead-abc",
        task_id: "task-1",
        name: "Updated task",
      });

      expect(mockMakeApiRequest).toHaveBeenCalledWith(
        "crm",
        "leads/lead-abc/tasks",
        "PUT",
        { taskId: "task-1", name: "Updated task" },
      );
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Task updated successfully");
    });
  });

  describe("holded_crm_delete_lead_task", () => {
    it("calls makeApiRequest with DELETE to leads/{id}/tasks with taskId", async () => {
      mockMakeApiRequest.mockResolvedValueOnce(undefined);

      const handler = server.tools.get("holded_crm_delete_lead_task")!.handler;
      const result = await handler({ lead_id: "lead-abc", task_id: "task-1" });

      expect(mockMakeApiRequest).toHaveBeenCalledWith(
        "crm",
        "leads/lead-abc/tasks",
        "DELETE",
        { taskId: "task-1" },
      );
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        deleted: true,
        leadId: "lead-abc",
        taskId: "task-1",
      });
    });
  });

  describe("holded_crm_update_lead_stage", () => {
    it("calls makeApiRequest with PUT to leads/{id}/stages with stageId", async () => {
      mockMakeApiRequest.mockResolvedValueOnce({ status: "ok" });

      const handler = server.tools.get("holded_crm_update_lead_stage")!.handler;
      const result = await handler({ lead_id: "lead-abc", stage_id: "stage-2" });

      expect(mockMakeApiRequest).toHaveBeenCalledWith(
        "crm",
        "leads/lead-abc/stages",
        "PUT",
        { stageId: "stage-2" },
      );
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        updated: true,
        leadId: "lead-abc",
        stageId: "stage-2",
      });
    });
  });
});

// ============================================================
// Booking custom handler tests
// ============================================================

describe("Booking custom handlers", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    registerBookingTools(server as any);
  });

  describe("holded_crm_list_booking_locations", () => {
    it("calls makeApiRequest with GET to bookings/locations", async () => {
      const mockLocations = [
        { id: "loc-1", name: "Main Office", active: true, availableServices: ["svc-1"] },
      ];
      mockMakeApiRequest.mockResolvedValueOnce(mockLocations);

      const handler = server.tools.get("holded_crm_list_booking_locations")!.handler;
      const result = await handler({});

      expect(mockMakeApiRequest).toHaveBeenCalledWith(
        "crm",
        "bookings/locations",
        "GET",
      );
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        locations: mockLocations,
        count: 1,
      });
    });
  });

  describe("holded_crm_get_available_slots", () => {
    it("calls makeApiRequest with GET to bookings/locations/{id}/slots with query params", async () => {
      const mockSlots = [
        { dateTime: 1700000000, from: "09:00", to: "10:00", duration: 3600 },
      ];
      mockMakeApiRequest.mockResolvedValueOnce(mockSlots);

      const handler = server.tools.get("holded_crm_get_available_slots")!.handler;
      const result = await handler({
        location_id: "loc-1",
        serviceId: "svc-1",
        day: "2025-01-15",
      });

      expect(mockMakeApiRequest).toHaveBeenCalledWith(
        "crm",
        "bookings/locations/loc-1/slots",
        "GET",
        undefined,
        { serviceId: "svc-1", day: "2025-01-15" },
      );
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        slots: mockSlots,
        count: 1,
        locationId: "loc-1",
      });
    });
  });
});

// ============================================================
// Document custom handler tests
// ============================================================

describe("Document custom handlers", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    registerDocumentTools(server as any);
  });

  describe("holded_invoicing_pay_document", () => {
    it("calls makeApiRequest with POST to documents/{type}/{id}/pay", async () => {
      mockMakeApiRequest.mockResolvedValueOnce({ status: "ok" });

      const handler = server.tools.get("holded_invoicing_pay_document")!.handler;
      const result = await handler({
        doc_type: "invoice",
        document_id: "doc-123",
        amount: 100.5,
        date: 1700000000,
      });

      expect(mockMakeApiRequest).toHaveBeenCalledWith(
        "invoicing",
        "documents/invoice/doc-123/pay",
        "POST",
        { amount: 100.5, date: 1700000000 },
      );
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Payment recorded successfully");
    });

    it("converts account_id to treasury in the request body", async () => {
      mockMakeApiRequest.mockResolvedValueOnce({ status: "ok" });

      const handler = server.tools.get("holded_invoicing_pay_document")!.handler;
      await handler({
        doc_type: "invoice",
        document_id: "doc-123",
        account_id: "acct-456",
        amount: 50,
      });

      expect(mockMakeApiRequest).toHaveBeenCalledWith(
        "invoicing",
        "documents/invoice/doc-123/pay",
        "POST",
        { amount: 50, treasury: "acct-456" },
      );
    });
  });

  describe("holded_invoicing_send_document", () => {
    it("calls makeApiRequest with POST to documents/{type}/{id}/send", async () => {
      mockMakeApiRequest.mockResolvedValueOnce({ status: "ok" });

      const handler = server.tools.get("holded_invoicing_send_document")!.handler;
      const result = await handler({
        doc_type: "estimate",
        document_id: "doc-456",
        emails: "client@example.com",
        subject: "Your estimate",
        message: "Please review",
      });

      expect(mockMakeApiRequest).toHaveBeenCalledWith(
        "invoicing",
        "documents/estimate/doc-456/send",
        "POST",
        { emails: "client@example.com", subject: "Your estimate", message: "Please review" },
      );
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Document sent successfully");
    });
  });

  describe("holded_invoicing_get_document_pdf", () => {
    it("calls makeApiRequest with GET to documents/{type}/{id}/pdf", async () => {
      mockMakeApiRequest.mockResolvedValueOnce({ url: "https://example.com/doc.pdf" });

      const handler = server.tools.get("holded_invoicing_get_document_pdf")!.handler;
      const result = await handler({
        doc_type: "invoice",
        document_id: "doc-789",
      });

      expect(mockMakeApiRequest).toHaveBeenCalledWith(
        "invoicing",
        "documents/invoice/doc-789/pdf",
        "GET",
      );
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("https://example.com/doc.pdf");
    });
  });

  describe("holded_invoicing_ship_all_items", () => {
    it("calls makeApiRequest with POST to documents/salesorder/{id}/shipall", async () => {
      mockMakeApiRequest.mockResolvedValueOnce({ status: 1, info: "shipped" });

      const handler = server.tools.get("holded_invoicing_ship_all_items")!.handler;
      const result = await handler({ document_id: "order-100" });

      expect(mockMakeApiRequest).toHaveBeenCalledWith(
        "invoicing",
        "documents/salesorder/order-100/shipall",
        "POST",
      );
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Items shipped successfully");
    });
  });
});

// ============================================================
// Document customFields serialization
// ============================================================

describe("Document customFields wire transforms", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    registerDocumentTools(server as any);
  });

  it("holded_invoicing_create_document sends customFields as map-per-entry and repairs response", async () => {
    mockMakeApiRequest.mockResolvedValueOnce({
      status: 1,
      id: "d1",
      customFields: [
        { field: "field", value: "source_path" },
        { field: "value", value: "/tmp/a.pdf" },
      ],
    });
    const handler = server.tools.get("holded_invoicing_create_document")!.handler;
    const result = await handler({
      doc_type: "purchase",
      contactId: "c1",
      date: 1776000000,
      items: [{ name: "x", units: 1, subtotal: 1 }],
      customFields: { source_path: "/tmp/a.pdf", source: "skill@v1" },
    });
    const [, , , body] = mockMakeApiRequest.mock.calls[0];
    expect((body as any).customFields).toEqual([
      { source_path: "/tmp/a.pdf" },
      { source: "skill@v1" },
    ]);
    expect(result.structuredContent.customFields).toEqual({ source_path: "/tmp/a.pdf" });
  });

  it("holded_invoicing_update_document sends customFields as documented {field,value} and repairs response", async () => {
    mockMakeApiRequest.mockResolvedValueOnce({
      status: 1,
      id: "d1",
      customFields: [{ field: "source_path", value: "/tmp/a.pdf" }],
    });
    const handler = server.tools.get("holded_invoicing_update_document")!.handler;
    const result = await handler({
      doc_type: "purchase",
      document_id: "d1",
      customFields: { source_path: "/tmp/a.pdf" },
    });
    const [, , , body] = mockMakeApiRequest.mock.calls[0];
    expect((body as any).customFields).toEqual([{ field: "source_path", value: "/tmp/a.pdf" }]);
    expect(result.structuredContent.customFields).toEqual({ source_path: "/tmp/a.pdf" });
  });

  it("holded_invoicing_get_document repairs mangled customFields on read", async () => {
    mockMakeApiRequest.mockResolvedValueOnce({
      id: "d1",
      customFields: [
        { field: "field", value: "source_path" },
        { field: "value", value: "/tmp/a.pdf" },
      ],
    });
    const handler = server.tools.get("holded_invoicing_get_document")!.handler;
    const result = await handler({ doc_type: "purchase", document_id: "d1", response_format: "json" });
    expect(result.structuredContent.customFields).toEqual({ source_path: "/tmp/a.pdf" });
  });

  it("holded_invoicing_list_documents repairs customFields on each item", async () => {
    mockMakeApiRequest.mockResolvedValueOnce([
      { id: "d1", customFields: [{ field: "a", value: "1" }] },
      { id: "d2", customFields: [{ b: "2" }] },
    ]);
    const handler = server.tools.get("holded_invoicing_list_documents")!.handler;
    const result = await handler({ doc_type: "purchase", page: 1, response_format: "json" });
    expect(result.structuredContent.documents[0].customFields).toEqual({ a: "1" });
    expect(result.structuredContent.documents[1].customFields).toEqual({ b: "2" });
  });
});

// ============================================================
// Lead customFields wire transforms (factory-driven)
// ============================================================

describe("Lead customFields wire transforms", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    registerLeadTools(server as any);
  });

  it("holded_crm_update_lead sends customFields as documented {field,value}", async () => {
    mockMakeApiRequest.mockResolvedValueOnce({ id: "l1" });
    const handler = server.tools.get("holded_crm_update_lead")!.handler;
    await handler({ lead_id: "l1", customFields: { tag: "vip" } });
    const [, , , body] = mockMakeApiRequest.mock.calls[0];
    expect((body as any).customFields).toEqual([{ field: "tag", value: "vip" }]);
  });

  it("holded_crm_get_lead repairs mangled customFields on read", async () => {
    mockMakeApiRequest.mockResolvedValueOnce({
      id: "l1",
      customFields: [
        { field: "field", value: "tag" },
        { field: "value", value: "vip" },
      ],
    });
    const handler = server.tools.get("holded_crm_get_lead")!.handler;
    const result = await handler({ lead_id: "l1", response_format: "json" });
    expect(result.structuredContent.customFields).toEqual({ tag: "vip" });
  });
});

// ============================================================
// Funnel customFields wire transforms
// ============================================================

describe("Funnel customFields wire transforms", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    registerFunnelTools(server as any);
  });

  it("holded_crm_update_funnel sends customFields as map-per-entry", async () => {
    mockMakeApiRequest.mockResolvedValueOnce({ id: "f1" });
    const handler = server.tools.get("holded_crm_update_funnel")!.handler;
    await handler({ funnel_id: "f1", customFields: { stage_meta: "pipeline-v2" } });
    const [, , , body] = mockMakeApiRequest.mock.calls[0];
    expect((body as any).customFields).toEqual([{ stage_meta: "pipeline-v2" }]);
  });

  it("holded_crm_get_funnel repairs customFields on read", async () => {
    mockMakeApiRequest.mockResolvedValueOnce({
      id: "f1",
      customFields: [
        { field: "field", value: "stage_meta" },
        { field: "value", value: "pipeline-v2" },
      ],
    });
    const handler = server.tools.get("holded_crm_get_funnel")!.handler;
    const result = await handler({ funnel_id: "f1", response_format: "json" });
    expect(result.structuredContent.customFields).toEqual({ stage_meta: "pipeline-v2" });
  });
});
