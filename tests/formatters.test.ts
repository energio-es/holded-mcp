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
import { formatDocumentsMarkdown, formatDocumentMarkdown } from "../src/tools/invoicing/documents.js";
import { formatLeadsMarkdown, formatLeadMarkdown } from "../src/tools/crm/leads.js";
import { formatBookingsMarkdown, formatBookingMarkdown } from "../src/tools/crm/bookings.js";

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

// ── Document formatters ─────────────────────────────────────────────────────

describe("formatDocumentsMarkdown", () => {
  it("renders a list of documents with doc type header and document info", () => {
    const documents = [
      {
        id: "doc-001",
        docType: "invoice",
        docNumber: "INV-001",
        contactName: "Acme Corp",
        date: 1704067200, // 2024-01-01 UTC
        total: 1500,
        currency: "EUR",
        status: "accepted",
        paid: true,
      },
      {
        id: "doc-002",
        docType: "invoice",
        docNumber: "INV-002",
        contactName: "Globe Supplies",
        date: 1704153600, // 2024-01-02 UTC
        total: 750.5,
        status: "draft",
        paid: false,
      },
    ];

    const result = formatDocumentsMarkdown(documents, "invoice");

    expect(result).toContain("# Invoice Documents");
    expect(result).toContain("Found 2 documents");
    expect(result).toContain("## INV-001");
    expect(result).toContain("doc-001");
    expect(result).toContain("Acme Corp");
    expect(result).toContain("1500");
    expect(result).toContain("EUR");
    expect(result).toContain("accepted");
    expect(result).toContain("## INV-002");
    expect(result).toContain("doc-002");
    expect(result).toContain("Globe Supplies");
    expect(result).toContain("750.5");
  });

  it("returns empty message when no documents", () => {
    expect(formatDocumentsMarkdown([], "invoice")).toBe("No invoice documents found.");
  });
});

describe("formatDocumentMarkdown", () => {
  it("renders single document with line items and totals", () => {
    const doc = {
      id: "doc-001",
      docType: "invoice",
      docNumber: "INV-001",
      contactName: "Acme Corp",
      contactId: "cnt-001",
      date: 1704067200,
      dueDate: 1706745600, // 2024-02-01 UTC
      status: "accepted",
      items: [
        { name: "Web Development", units: 10, subtotal: 1000, tax: "21%" },
        { name: "Hosting", units: 1, subtotal: 200, tax: "21%" },
      ],
      subtotal: 1200,
      tax: 252,
      total: 1452,
      currency: "EUR",
      paid: true,
      paidAmount: 1452,
      notes: "Thank you for your business",
    };

    const result = formatDocumentMarkdown(doc);

    expect(result).toContain("# INVOICE: INV-001");
    expect(result).toContain("**ID**: doc-001");
    expect(result).toContain("Acme Corp");
    expect(result).toContain("cnt-001");
    expect(result).toContain("**Status**: accepted");
    expect(result).toContain("## Line Items");
    expect(result).toContain("Web Development");
    expect(result).toContain("Hosting");
    expect(result).toContain("## Totals");
    expect(result).toContain("**Subtotal**: 1200");
    expect(result).toContain("**Tax**: 252");
    expect(result).toContain("**Total**: 1452 EUR");
    expect(result).toContain("**Paid**: Yes");
    expect(result).toContain("**Paid Amount**: 1452");
    expect(result).toContain("## Notes");
    expect(result).toContain("Thank you for your business");
  });

  it("uses id when docNumber is absent", () => {
    const result = formatDocumentMarkdown({ id: "doc-099", docType: "estimate" });
    expect(result).toContain("doc-099");
    expect(result).toContain("ESTIMATE");
  });
});

// ── Lead formatters ─────────────────────────────────────────────────────────

describe("formatLeadsMarkdown", () => {
  it("renders a list of leads with names and info", () => {
    const leads = [
      {
        id: "lead-001",
        name: "Big Deal",
        contactName: "Acme Corp",
        potential: 50000,
        currency: "EUR",
        probability: 75,
        status: "open",
      },
      {
        id: "lead-002",
        name: "Small Opportunity",
        contactName: "Globe Ltd",
        potential: 5000,
        probability: 30,
        status: "open",
      },
    ];

    const result = formatLeadsMarkdown(leads);

    expect(result).toContain("# Leads");
    expect(result).toContain("Found 2 leads");
    expect(result).toContain("## Big Deal");
    expect(result).toContain("lead-001");
    expect(result).toContain("Acme Corp");
    expect(result).toContain("50000");
    expect(result).toContain("75%");
    expect(result).toContain("## Small Opportunity");
    expect(result).toContain("lead-002");
    expect(result).toContain("Globe Ltd");
  });

  it("returns empty message when no leads", () => {
    expect(formatLeadsMarkdown([])).toBe("No leads found.");
  });
});

describe("formatLeadMarkdown", () => {
  it("renders single lead with all fields", () => {
    const lead = {
      id: "lead-001",
      name: "Big Deal",
      contactName: "Acme Corp",
      contactId: "cnt-001",
      funnelId: "funnel-001",
      stageId: "stage-003",
      potential: 50000,
      currency: "EUR",
      probability: 75,
      status: "open",
      expectedCloseDate: 1717200000, // 2024-06-01 UTC
      assignedTo: "user-042",
      notes: "High priority deal",
      tags: ["enterprise", "priority"],
    };

    const result = formatLeadMarkdown(lead);

    expect(result).toContain("# Big Deal");
    expect(result).toContain("**ID**: lead-001");
    expect(result).toContain("Acme Corp");
    expect(result).toContain("cnt-001");
    expect(result).toContain("**Funnel ID**: funnel-001");
    expect(result).toContain("**Stage ID**: stage-003");
    expect(result).toContain("50000");
    expect(result).toContain("EUR");
    expect(result).toContain("75%");
    expect(result).toContain("open");
    expect(result).toContain("Expected Close");
    expect(result).toContain("user-042");
    expect(result).toContain("## Notes");
    expect(result).toContain("High priority deal");
    expect(result).toContain("enterprise, priority");
  });

  it("omits optional fields that are absent", () => {
    const result = formatLeadMarkdown({ id: "lead-099", name: "Minimal Lead" });
    expect(result).toContain("# Minimal Lead");
    expect(result).toContain("**ID**: lead-099");
    expect(result).not.toContain("Contact");
    expect(result).not.toContain("Funnel");
    expect(result).not.toContain("Stage");
    expect(result).not.toContain("Potential");
    expect(result).not.toContain("Notes");
    expect(result).not.toContain("Tags");
  });
});

// ── Booking formatters ──────────────────────────────────────────────────────

describe("formatBookingsMarkdown", () => {
  it("renders a list of bookings with service names", () => {
    const bookings = [
      {
        id: "bk-001",
        startTime: 1704067200,
        endTime: 1704070800,
        duration: 3600,
        createdAt: 1704000000,
        updatedAt: 1704000000,
        status: "confirmed",
        service: [{ id: "svc-001", name: "Consultation", duration: 3600 }],
        space: [{ id: "sp-001", name: "Room A" }],
      },
      {
        id: "bk-002",
        startTime: 1704153600,
        endTime: 1704157200,
        duration: 3600,
        createdAt: 1704100000,
        updatedAt: 1704100000,
        status: "pending",
        service: { id: "svc-002", name: "Training", duration: 3600 },
      },
    ] as any;

    const result = formatBookingsMarkdown(bookings);

    expect(result).toContain("# Bookings");
    expect(result).toContain("Found 2 bookings");
    expect(result).toContain("## Consultation");
    expect(result).toContain("bk-001");
    expect(result).toContain("confirmed");
    expect(result).toContain("Room A");
    expect(result).toContain("## Training");
    expect(result).toContain("bk-002");
    expect(result).toContain("pending");
  });

  it("returns empty message when no bookings", () => {
    expect(formatBookingsMarkdown([])).toBe("No bookings found.");
  });
});

describe("formatBookingMarkdown", () => {
  it("renders single booking with service as array", () => {
    const booking = {
      id: "bk-001",
      startTime: 1704067200,
      endTime: 1704070800,
      duration: 3600,
      createdAt: 1704000000,
      updatedAt: 1704000000,
      status: "confirmed",
      service: [
        {
          id: "svc-001",
          name: "Consultation",
          description: "1-hour consultation session",
          duration: 3600,
          total: [{ amount: 100, currency: "EUR" }],
        },
      ],
      space: [{ id: "sp-001", name: "Room A" }],
      customFieldsValues: [
        { key: "name", label: "Name", type: "text", value: "John Doe" },
        { key: "email", label: "Email", type: "email", value: "john@example.com" },
      ],
    } as any;

    const result = formatBookingMarkdown(booking);

    expect(result).toContain("# Consultation");
    expect(result).toContain("**ID**: bk-001");
    expect(result).toContain("60 min");
    expect(result).toContain("confirmed");
    expect(result).toContain("Room A");
    expect(result).toContain("### Service");
    expect(result).toContain("Consultation");
    expect(result).toContain("1-hour consultation session");
    expect(result).toContain("100");
    expect(result).toContain("EUR");
    expect(result).toContain("### Custom Fields");
    expect(result).toContain("**Name**: John Doe");
    expect(result).toContain("**Email**: john@example.com");
  });

  it("renders single booking with service as object", () => {
    const booking = {
      id: "bk-003",
      startTime: 1704067200,
      endTime: 1704070800,
      duration: 1800,
      createdAt: 1704000000,
      updatedAt: 1704000000,
      status: "pending",
      service: {
        id: "svc-002",
        name: "Quick Call",
        duration: 1800,
        total: { amount: 50, currency: "USD" },
      },
    } as any;

    const result = formatBookingMarkdown(booking);

    expect(result).toContain("# Quick Call");
    expect(result).toContain("**ID**: bk-003");
    expect(result).toContain("30 min");
    expect(result).toContain("pending");
    expect(result).toContain("### Service");
    expect(result).toContain("Quick Call");
    expect(result).toContain("50");
    expect(result).toContain("USD");
  });

  it("falls back to booking id when service has no name", () => {
    const booking = {
      id: "bk-004",
      startTime: 1704067200,
      endTime: 1704070800,
      duration: 3600,
      createdAt: 1704000000,
      updatedAt: 1704000000,
      status: "confirmed",
      service: { id: "svc-x", duration: 3600 } as any,
    } as any;

    const result = formatBookingMarkdown(booking);

    expect(result).toContain("Booking bk-004");
  });
});
