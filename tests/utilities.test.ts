/**
 * Tests for shared tool utilities
 */

import { describe, it, expect, vi } from "vitest";
import { ResponseFormat } from "../src/constants.js";
import { toStructuredContent } from "../src/services/api.js";
import { buildToolResponse, withErrorHandling, snakeToCamel } from "../src/tools/utilities.js";

describe("buildToolResponse", () => {
  it("returns markdown when format is MARKDOWN", () => {
    const data = { id: "123", name: "Test" };
    const formatter = (d: typeof data) => `# ${d.name}\nID: ${d.id}`;

    const result = buildToolResponse(data, ResponseFormat.MARKDOWN, formatter);

    expect(result).toEqual({
      content: [{ type: "text", text: "# Test\nID: 123" }],
      structuredContent: toStructuredContent(data),
    });
  });

  it("returns JSON when format is JSON", () => {
    const data = { id: "123", name: "Test" };
    const formatter = (d: typeof data) => `# ${d.name}`;

    const result = buildToolResponse(data, ResponseFormat.JSON, formatter);

    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: toStructuredContent(data),
    });
  });

  it("handles array data", () => {
    const data = [
      { id: "1", name: "A" },
      { id: "2", name: "B" },
    ];
    const formatter = (d: typeof data) =>
      d.map((item) => `- ${item.name}`).join("\n");

    const result = buildToolResponse(data, ResponseFormat.MARKDOWN, formatter);

    expect(result).toEqual({
      content: [{ type: "text", text: "- A\n- B" }],
      structuredContent: toStructuredContent(data),
    });
  });

  it("handles null fields in data", () => {
    const data = { id: "123", name: null, description: null };
    const formatter = (d: typeof data) => `ID: ${d.id}, Name: ${d.name}`;

    const result = buildToolResponse(data, ResponseFormat.JSON, formatter);

    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: toStructuredContent(data),
    });
  });

  it("uses structuredContent override when provided", () => {
    const data = [
      { id: "1", name: "A" },
      { id: "2", name: "B" },
    ];
    const formatter = (d: typeof data) =>
      d.map((item) => `- ${item.name}`).join("\n");
    const override = { items: data, count: 2, page: 1 };

    const result = buildToolResponse(data, ResponseFormat.MARKDOWN, formatter, override);

    expect(result).toEqual({
      content: [{ type: "text", text: "- A\n- B" }],
      structuredContent: override,
    });
  });
});

describe("withErrorHandling", () => {
  it("returns handler result on success", async () => {
    const expectedResult = {
      content: [{ type: "text", text: "success" }],
    };
    const handler = vi.fn().mockResolvedValue(expectedResult);
    const wrapped = withErrorHandling(handler);

    const result = await wrapped({ foo: "bar" });

    expect(result).toEqual(expectedResult);
  });

  it("catches errors and returns isError response", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("something broke"));
    const wrapped = withErrorHandling(handler);

    const result = await wrapped({});

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("something broke");
  });

  it("passes params through to the handler", async () => {
    const handler = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
    });
    const wrapped = withErrorHandling(handler);
    const params = { contactId: "abc", page: 1 };

    await wrapped(params);

    expect(handler).toHaveBeenCalledWith(params);
  });

  it("accepts unknown input and casts to Record<string, unknown>", async () => {
    const handler = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
    });
    const wrapped = withErrorHandling(handler);
    const input: unknown = { foo: "bar" };

    await wrapped(input);

    expect(handler).toHaveBeenCalledWith({ foo: "bar" });
  });
});

describe("snakeToCamel", () => {
  it("converts snake_case keys to camelCase", () => {
    const input = { first_name: "Alice", last_name: "Smith" };
    expect(snakeToCamel(input)).toEqual({ firstName: "Alice", lastName: "Smith" });
  });

  it("preserves already camelCase keys", () => {
    const input = { firstName: "Alice", lastName: "Smith" };
    expect(snakeToCamel(input)).toEqual({ firstName: "Alice", lastName: "Smith" });
  });

  it("handles mixed keys", () => {
    const input = { first_name: "Alice", lastName: "Smith", age: 30 };
    expect(snakeToCamel(input)).toEqual({ firstName: "Alice", lastName: "Smith", age: 30 });
  });

  it("handles empty object", () => {
    expect(snakeToCamel({})).toEqual({});
  });

  it("does not convert nested objects", () => {
    const input = { user_name: "Alice", address: { street_name: "Main St" } };
    const result = snakeToCamel(input);
    expect(result).toEqual({
      userName: "Alice",
      address: { street_name: "Main St" },
    });
  });

  it("handles keys with multiple underscores", () => {
    const input = { first_middle_last_name: "Alice B Smith", api_base_url: "http://example.com" };
    expect(snakeToCamel(input)).toEqual({
      firstMiddleLastName: "Alice B Smith",
      apiBaseUrl: "http://example.com",
    });
  });
});
