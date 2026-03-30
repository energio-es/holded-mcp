import { describe, it, expect } from "vitest";
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
}, 30000);
