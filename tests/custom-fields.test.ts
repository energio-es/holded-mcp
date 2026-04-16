import { describe, it, expect } from "vitest";
import { serialize, parse, repairCustomFieldsInPlace, type CustomFieldsMap } from "../src/utils/custom-fields.js";

describe("serialize", () => {
  it("returns undefined for undefined input", () => {
    expect(serialize(undefined, "documented")).toBeUndefined();
    expect(serialize(undefined, "map-per-entry")).toBeUndefined();
  });

  it("returns undefined for empty map", () => {
    expect(serialize({}, "documented")).toBeUndefined();
    expect(serialize({}, "map-per-entry")).toBeUndefined();
  });

  it("serializes to documented shape", () => {
    expect(serialize({ a: "1", b: "2" }, "documented")).toEqual([
      { field: "a", value: "1" },
      { field: "b", value: "2" },
    ]);
  });

  it("serializes to map-per-entry shape", () => {
    expect(serialize({ a: "1", b: "2" }, "map-per-entry")).toEqual([
      { a: "1" },
      { b: "2" },
    ]);
  });

  it("serializes a single entry correctly in both variants", () => {
    expect(serialize({ only: "one" }, "documented")).toEqual([{ field: "only", value: "one" }]);
    expect(serialize({ only: "one" }, "map-per-entry")).toEqual([{ only: "one" }]);
  });
});

describe("parse", () => {
  it("returns {} for undefined / null / non-array", () => {
    expect(parse(undefined)).toEqual({});
    expect(parse(null)).toEqual({});
    expect(parse("not-an-array")).toEqual({});
    expect(parse({ a: "1" })).toEqual({});
  });

  it("returns {} for empty array", () => {
    expect(parse([])).toEqual({});
  });

  it("collapses mangled alternating pairs (rule 3)", () => {
    const raw = [
      { field: "field", value: "src_path" },
      { field: "value", value: "/tmp/a.pdf" },
      { field: "field", value: "source" },
      { field: "value", value: "skill@v1" },
    ];
    expect(parse(raw)).toEqual({ src_path: "/tmp/a.pdf", source: "skill@v1" });
  });

  it("parses the documented {field, value} shape (rule 4a)", () => {
    expect(parse([{ field: "a", value: "1" }, { field: "b", value: "2" }])).toEqual({ a: "1", b: "2" });
  });

  it("parses the map-per-entry shape (rule 4b)", () => {
    expect(parse([{ a: "1" }, { b: "2" }])).toEqual({ a: "1", b: "2" });
  });

  it("mangled check wins over entry-by-entry for the literal {field, value} pair", () => {
    // A user's pair of fields literally named "field" then "value" is indistinguishable from
    // the mangled pattern. The mangled-case repair takes priority by design (see design doc §3).
    const raw = [
      { field: "field", value: "something" },
      { field: "value", value: "other" },
    ];
    expect(parse(raw)).toEqual({ something: "other" });
  });

  it("falls through to rule 4 for odd-length input", () => {
    const raw = [{ field: "a", value: "1" }, { field: "b", value: "2" }, { field: "c", value: "3" }];
    expect(parse(raw)).toEqual({ a: "1", b: "2", c: "3" });
  });

  it("skips unknown-shape entries without throwing", () => {
    const raw = [{ field: "a", value: "1" }, { garbage: true }, { a: "1", b: "2" }, { b: "2" }];
    expect(parse(raw)).toEqual({ a: "1", b: "2" });
  });

  it("last-write-wins on duplicate keys", () => {
    expect(parse([{ field: "a", value: "1" }, { field: "a", value: "2" }])).toEqual({ a: "2" });
  });

  it("parse returns {} when given an already-parsed map (not idempotent)", () => {
    // parse accepts raw (unknown); passing a map-shaped object through yields {}.
    // Callers should not re-parse — this test guards against accidental double-apply in list repair.
    const already: CustomFieldsMap = { a: "1" };
    expect(parse(already)).toEqual({});
  });
});

describe("repairCustomFieldsInPlace", () => {
  it("mutates customFields on an object with the key", () => {
    const item = {
      id: "x",
      customFields: [
        { field: "field", value: "a" },
        { field: "value", value: "1" },
      ],
    };
    const result = repairCustomFieldsInPlace(item);
    expect(result).toBe(item); // same reference
    expect(item.customFields as unknown).toEqual({ a: "1" });
  });

  it("is a no-op on objects without customFields", () => {
    const item = { id: "x", name: "y" } as Record<string, unknown>;
    const result = repairCustomFieldsInPlace(item);
    expect(result).toBe(item);
    expect(item).toEqual({ id: "x", name: "y" });
  });

  it("is a no-op on null, undefined, primitives, and arrays", () => {
    expect(repairCustomFieldsInPlace(null)).toBeNull();
    expect(repairCustomFieldsInPlace(undefined)).toBeUndefined();
    expect(repairCustomFieldsInPlace("x")).toBe("x");
    expect(repairCustomFieldsInPlace(42)).toBe(42);
    expect(repairCustomFieldsInPlace([1, 2])).toEqual([1, 2]);
  });
});
