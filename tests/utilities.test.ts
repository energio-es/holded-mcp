/**
 * Tests for shared tool utilities
 */

import { describe, it, expect, vi } from "vitest";
import { ResponseFormat } from "../src/constants.js";
import { toStructuredContent } from "../src/services/api.js";
import { buildToolResponse, withErrorHandling } from "../src/tools/utilities.js";

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
});
