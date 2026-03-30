/**
 * Snapshot tests for markdown formatter functions
 */

import { describe, it, expect } from "vitest";
import { formatEmployeesMarkdown, formatEmployeeMarkdown } from "../src/tools/team/employees.js";
import { formatContactsMarkdown, formatContactMarkdown } from "../src/tools/invoicing/contacts.js";
import {
  formatAccountingAccountsMarkdown,
  formatAccountingAccountMarkdown,
} from "../src/tools/accounting/accounts.js";

// ── Employee formatters ───────────────────────────────────────────────────────

describe("formatEmployeesMarkdown", () => {
  it("renders a list of employees with header and count", () => {
    const employees = [
      {
        id: "emp-001",
        name: "Alice Smith",
        email: "alice@example.com",
        phone: "+34 600 111 222",
        position: "Engineer",
        department: "Technology",
        status: "active",
        hireDate: 1609459200, // 2021-01-01 UTC
      },
      {
        id: "emp-002",
        name: "Bob Jones",
        email: "bob@example.com",
        position: "Designer",
        status: "active",
      },
    ];

    const result = formatEmployeesMarkdown(employees);

    expect(result).toContain("# Employees");
    expect(result).toContain("Found 2 employees");
    expect(result).toContain("## Alice Smith");
    expect(result).toContain("emp-001");
    expect(result).toContain("alice@example.com");
    expect(result).toContain("+34 600 111 222");
    expect(result).toContain("Engineer");
    expect(result).toContain("Technology");
    expect(result).toContain("active");
    expect(result).toContain("## Bob Jones");
    expect(result).toContain("emp-002");
  });

  it("returns empty message when no employees", () => {
    expect(formatEmployeesMarkdown([])).toBe("No employees found.");
  });

  it("omits optional fields that are absent", () => {
    const result = formatEmployeesMarkdown([{ id: "emp-003", name: "Carol White" }]);
    expect(result).toContain("## Carol White");
    expect(result).toContain("emp-003");
    expect(result).not.toContain("Email");
    expect(result).not.toContain("Phone");
    expect(result).not.toContain("Position");
    expect(result).not.toContain("Department");
    expect(result).not.toContain("Status");
    expect(result).not.toContain("Hire Date");
  });
});

describe("formatEmployeeMarkdown", () => {
  it("renders single employee with name as h1 header and all fields", () => {
    const employee = {
      id: "emp-001",
      name: "Alice Smith",
      email: "alice@example.com",
      phone: "+34 600 111 222",
      position: "Engineer",
      department: "Technology",
      status: "active",
      hireDate: 1609459200,
    };

    const result = formatEmployeeMarkdown(employee);

    expect(result).toContain("# Alice Smith");
    expect(result).toContain("**ID**: emp-001");
    expect(result).toContain("alice@example.com");
    expect(result).toContain("+34 600 111 222");
    expect(result).toContain("Engineer");
    expect(result).toContain("Technology");
    expect(result).toContain("active");
    expect(result).toContain("Hire Date");
  });

  it("omits optional fields that are absent", () => {
    const result = formatEmployeeMarkdown({ id: "emp-004", name: "Dave Brown" });
    expect(result).toContain("# Dave Brown");
    expect(result).toContain("**ID**: emp-004");
    expect(result).not.toContain("Email");
    expect(result).not.toContain("Phone");
  });
});

// ── Contact formatters ────────────────────────────────────────────────────────

describe("formatContactsMarkdown", () => {
  it("renders a list of contacts with header and field values", () => {
    const contacts = [
      {
        id: "cnt-001",
        name: "Acme Corp",
        email: "info@acme.com",
        phone: "+1 800 000 0001",
        type: "client",
        vatnumber: "US123456789",
      },
      {
        id: "cnt-002",
        name: "Globe Supplies",
        email: "contact@globe.com",
        type: "supplier",
      },
    ];

    const result = formatContactsMarkdown(contacts);

    expect(result).toContain("# Contacts");
    expect(result).toContain("Found 2 contacts");
    expect(result).toContain("## Acme Corp");
    expect(result).toContain("cnt-001");
    expect(result).toContain("info@acme.com");
    expect(result).toContain("+1 800 000 0001");
    expect(result).toContain("client");
    expect(result).toContain("US123456789");
    expect(result).toContain("## Globe Supplies");
    expect(result).toContain("cnt-002");
    expect(result).toContain("supplier");
  });

  it("returns empty message when no contacts", () => {
    expect(formatContactsMarkdown([])).toBe("No contacts found.");
  });

  it("omits optional fields that are absent", () => {
    const result = formatContactsMarkdown([{ id: "cnt-003", name: "Solo Trader" }]);
    expect(result).toContain("## Solo Trader");
    expect(result).not.toContain("Email");
    expect(result).not.toContain("Phone");
    expect(result).not.toContain("Type");
    expect(result).not.toContain("VAT");
  });
});

describe("formatContactMarkdown", () => {
  it("renders single contact with name as h1 header and billing address section", () => {
    const contact = {
      id: "cnt-001",
      name: "Acme Corp",
      code: "A001",
      email: "info@acme.com",
      phone: "+1 800 000 0001",
      mobile: "+1 800 000 0002",
      type: "client",
      vatnumber: "US123456789",
      tradeName: "Acme",
      currency: "USD",
      billAddress: {
        address: "123 Main St",
        city: "Springfield",
        postalCode: "62701",
        province: "Illinois",
        country: "United States",
      },
      notes: "Preferred customer",
    };

    const result = formatContactMarkdown(contact);

    expect(result).toContain("# Acme Corp");
    expect(result).toContain("**ID**: cnt-001");
    expect(result).toContain("A001");
    expect(result).toContain("info@acme.com");
    expect(result).toContain("+1 800 000 0001");
    expect(result).toContain("+1 800 000 0002");
    expect(result).toContain("client");
    expect(result).toContain("US123456789");
    expect(result).toContain("Acme");
    expect(result).toContain("USD");
    expect(result).toContain("### Billing Address");
    expect(result).toContain("123 Main St");
    expect(result).toContain("Springfield");
    expect(result).toContain("62701");
    expect(result).toContain("Illinois");
    expect(result).toContain("United States");
    expect(result).toContain("### Notes");
    expect(result).toContain("Preferred customer");
  });

  it("omits billing address section when not present", () => {
    const result = formatContactMarkdown({ id: "cnt-005", name: "Minimal Contact" });
    expect(result).toContain("# Minimal Contact");
    expect(result).not.toContain("Billing Address");
    expect(result).not.toContain("Notes");
  });
});

// ── Accounting account formatters ─────────────────────────────────────────────

describe("formatAccountingAccountsMarkdown", () => {
  it("renders a list of accounts with header and field values", () => {
    const accounts = [
      { id: "acc-001", code: "7000001", name: "Sales Revenue", type: "income" },
      { id: "acc-002", code: "6000001", name: "Operating Costs", type: "expense", parentId: "acc-parent-01" },
    ];

    const result = formatAccountingAccountsMarkdown(accounts);

    expect(result).toContain("# Accounting Accounts");
    expect(result).toContain("Found 2 accounts");
    expect(result).toContain("## Sales Revenue");
    expect(result).toContain("acc-001");
    expect(result).toContain("7000001");
    expect(result).toContain("income");
    expect(result).toContain("## Operating Costs");
    expect(result).toContain("acc-002");
    expect(result).toContain("6000001");
    expect(result).toContain("expense");
    expect(result).toContain("acc-parent-01");
  });

  it("returns empty message when no accounts", () => {
    expect(formatAccountingAccountsMarkdown([])).toBe("No accounting accounts found.");
  });

  it("omits optional fields that are absent", () => {
    const result = formatAccountingAccountsMarkdown([
      { id: "acc-003", code: "1000001", name: "Cash" },
    ]);
    expect(result).toContain("## Cash");
    expect(result).toContain("1000001");
    expect(result).not.toContain("Type");
    expect(result).not.toContain("Parent ID");
  });
});

describe("formatAccountingAccountMarkdown", () => {
  it("renders single account with name as h1 header, code, and type", () => {
    const account = {
      id: "acc-001",
      code: "7000001",
      name: "Sales Revenue",
      type: "income",
      parentId: "acc-parent-01",
    };

    const result = formatAccountingAccountMarkdown(account);

    expect(result).toContain("# Sales Revenue");
    expect(result).toContain("**ID**: acc-001");
    expect(result).toContain("7000001");
    expect(result).toContain("income");
    expect(result).toContain("acc-parent-01");
  });

  it("omits optional fields that are absent", () => {
    const result = formatAccountingAccountMarkdown({
      id: "acc-004",
      code: "1000002",
      name: "Bank Account",
    });
    expect(result).toContain("# Bank Account");
    expect(result).toContain("**ID**: acc-004");
    expect(result).toContain("1000002");
    expect(result).not.toContain("Type");
    expect(result).not.toContain("Parent ID");
  });
});
