import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { makeApiRequest, initializeApi } from "../src/services/api.js";

const API_KEY = process.env.HOLDED_TEST_API_KEY;
const describeSmoke = API_KEY ? describe : describe.skip;

describeSmoke("Smoke Tests (Real API)", () => {
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
      const result = await makeApiRequest<{ employees: unknown[] }>("team", "employees", "GET");
      expect(result).toHaveProperty("employees");
      expect(Array.isArray(result.employees)).toBe(true);
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

  describe("customFields round-trip", () => {
    // Use a single throwaway contact as the owner of all test purchase docs.
    let testContactId: string;

    beforeAll(async () => {
      const stamp = Math.floor(Date.now() / 1000);
      const resp = await makeApiRequest<{ id: string }>(
        "invoicing",
        "contacts",
        "POST",
        { name: `CF-SMOKE-${stamp}`, type: "supplier" },
      );
      testContactId = resp.id;
    });

    afterAll(async () => {
      if (testContactId) {
        await makeApiRequest("invoicing", `contacts/${testContactId}`, "DELETE");
      }
    });

    it("document purchase round-trips customFields map", async () => {
      const stamp = Math.floor(Date.now() / 1000);
      const invoiceNum = `CFSMOKE-${stamp}-doc`;
      const { serialize, parse } = await import("../src/utils/custom-fields.js");
      const cf = { source_path: "/tmp/smoke.pdf", source: "smoke@v1" };
      const created = await makeApiRequest<{ id: string }>(
        "invoicing",
        "documents/purchase",
        "POST",
        {
          contactId: testContactId,
          invoiceNum,
          date: stamp,
          dueDate: stamp,
          currency: "eur",
          approveDoc: false,
          items: [{ name: "smoke", units: 1, subtotal: 1 }],
          customFields: serialize(cf, "map-per-entry"),
        },
      );
      try {
        const read = await makeApiRequest<{ customFields: unknown }>(
          "invoicing",
          `documents/purchase/${created.id}`,
          "GET",
        );
        expect(parse(read.customFields)).toEqual(cf);
      } finally {
        await makeApiRequest("invoicing", `documents/purchase/${created.id}`, "DELETE");
      }
    });

    it("funnel update round-trips customFields map", async () => {
      const stamp = Math.floor(Date.now() / 1000);
      const { serialize, parse } = await import("../src/utils/custom-fields.js");
      const funnel = await makeApiRequest<{ id: string }>(
        "crm",
        "funnels",
        "POST",
        { name: `CF-SMOKE-F-${stamp}` },
      );
      try {
        const cf = { stage_meta: "pipeline-v2", owner: "qa" };
        await makeApiRequest(
          "crm",
          `funnels/${funnel.id}`,
          "PUT",
          { customFields: serialize(cf, "map-per-entry") },
        );
        const read = await makeApiRequest<{ customFields: unknown }>(
          "crm",
          `funnels/${funnel.id}`,
          "GET",
        );
        expect(parse(read.customFields)).toEqual(cf);
      } finally {
        await makeApiRequest("crm", `funnels/${funnel.id}`, "DELETE");
      }
    });
  });

  describe("items[].subtotal per-unit semantics", () => {
    let testContactId: string;

    beforeAll(async () => {
      const stamp = Math.floor(Date.now() / 1000);
      const resp = await makeApiRequest<{ id: string }>(
        "invoicing",
        "contacts",
        "POST",
        { name: `SUBTOTAL-SMOKE-${stamp}`, type: "client" },
      );
      testContactId = resp.id;
    });

    afterAll(async () => {
      if (testContactId) {
        await makeApiRequest("invoicing", `contacts/${testContactId}`, "DELETE");
      }
    });

    it("stores items[].subtotal as per-unit price on create", async () => {
      const stamp = Math.floor(Date.now() / 1000);
      const created = await makeApiRequest<{ id: string }>(
        "invoicing",
        "documents/estimate",
        "POST",
        {
          contactId: testContactId,
          date: stamp,
          items: [{ name: "subtotal-per-unit smoke", units: 10, subtotal: 1 }],
        },
      );
      try {
        const read = await makeApiRequest<{
          products: Array<{ price: number; units: number }>;
          subtotal: number;
        }>("invoicing", `documents/estimate/${created.id}`, "GET");
        expect(read.products[0].price).toBe(1);
        expect(read.products[0].units).toBe(10);
        expect(read.subtotal).toBe(10);
      } finally {
        await makeApiRequest(
          "invoicing",
          `documents/estimate/${created.id}`,
          "DELETE",
        );
      }
    });
  });
}, 30000);
