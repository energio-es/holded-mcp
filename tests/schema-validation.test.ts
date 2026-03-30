/**
 * Schema Validation Tests
 * 
 * These tests validate that our Zod schemas match the official Holded API OpenAPI specifications.
 * Tests verify:
 * - Required parameters are present
 * - Parameter types match
 * - Optional parameters are correctly marked
 */

import { describe, it, expect } from 'vitest';
import * as z from 'zod';

// Import schemas
import { CreateEmployeeInputSchema } from '../src/schemas/team/employees.js';
import { CreateTaskInputSchema } from '../src/schemas/projects/tasks.js';
import { CreateBookingInputSchema } from '../src/schemas/crm/bookings.js';
import { CreateNumberingSeriesInputSchema } from '../src/schemas/invoicing/numbering-series.js';
import { EntryLineSchema } from '../src/schemas/accounting/daily-ledger.js';
import { UpdateProductStockInputSchema, CreateProductInputSchema } from '../src/schemas/invoicing/products.js';
import { CreateEmployeeTimeTrackingInputSchema } from '../src/schemas/team/time-tracking.js';

// Invoicing schemas
import { CreateContactInputSchema, UpdateContactInputSchema } from '../src/schemas/invoicing/contacts.js';
import { CreateDocumentInputSchema, DocumentItemSchema } from '../src/schemas/invoicing/documents.js';
import { CreateServiceInputSchema } from '../src/schemas/invoicing/services.js';
import { CreatePaymentInputSchema } from '../src/schemas/invoicing/payments.js';
import { GetTaxesInputSchema } from '../src/schemas/invoicing/taxes.js';
import { CreateWarehouseInputSchema } from '../src/schemas/invoicing/warehouses.js';
import { CreateTreasuryInputSchema } from '../src/schemas/invoicing/treasury.js';
import { CreateSalesChannelInputSchema } from '../src/schemas/invoicing/sales-channels.js';
import { ListRemittancesInputSchema } from '../src/schemas/invoicing/remittances.js';
import { CreateExpensesAccountInputSchema } from '../src/schemas/invoicing/expenses-accounts.js';

// CRM schemas
import { CreateLeadInputSchema } from '../src/schemas/crm/leads.js';
import { CreateFunnelInputSchema, FunnelStageSchema } from '../src/schemas/crm/funnels.js';
import { CreateEventInputSchema, UpdateEventInputSchema } from '../src/schemas/crm/events.js';

// Projects schemas
import { CreateProjectInputSchema } from '../src/schemas/projects/projects.js';
import { CreateProjectTimeTrackingInputSchema } from '../src/schemas/projects/time-tracking.js';

// Accounting schemas
import { CreateAccountInputSchema, ListAccountingAccountsInputSchema } from '../src/schemas/accounting/accounts.js';
import {
  AccountBalancesInputSchema,
} from '../src/schemas/accounting/account-balances.js';

// Common schemas
import { PaginationSchema, TimestampSchema, AddressSchema, ShippingAddressSchema, NumberingSeriesSchema, ContactPersonSchema } from '../src/schemas/common.js';
import { ContactDefaultsSchema } from '../src/schemas/invoicing/contacts.js';
import {
  validAccountBalances,
  accountBalancesWithFilter,
  invalidAccountBalancesEndBeforeStart,
  invalidAccountBalancesMissingStart,
  invalidAccountBalancesMissingEnd,
} from './fixtures/accounting.js';

describe('Schema Validation Against OpenAPI Specs', () => {

  describe('Employee Creation', () => {
    it('should require name, lastName, and email', () => {
      const result = CreateEmployeeInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('name');
        expect(issues).toContain('lastName');
        expect(issues).toContain('email');
      }
    });

    it('should accept valid employee data', () => {
      const validData = {
        name: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      };

      const result = CreateEmployeeInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should make sendInvite optional', () => {
      const validData = {
        name: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        sendInvite: true,
      };

      const result = CreateEmployeeInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        name: 'John',
        lastName: 'Doe',
        email: 'not-an-email',
      };

      const result = CreateEmployeeInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Task Creation', () => {
    it('should require name, project_id, and list_id', () => {
      const result = CreateTaskInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('name');
        expect(issues).toContain('project_id');
        expect(issues).toContain('list_id');
      }
    });

    it('should accept valid task data', () => {
      const validData = {
        name: 'New Task',
        project_id: 'proj123',
        list_id: 'list456',
      };

      const result = CreateTaskInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should not have undocumented fields in schema', () => {
      // Test that only the documented fields are present
      const validData = {
        name: 'New Task',
        project_id: 'proj123',
        list_id: 'list456',
      };

      const result = CreateTaskInputSchema.safeParse(validData);
      expect(result.success).toBe(true);

      // Extra fields should be rejected in strict mode
      const invalidData = {
        name: 'New Task',
        project_id: 'proj123',
        list_id: 'list456',
        description: 'Should not be accepted',
      };

      const invalidResult = CreateTaskInputSchema.safeParse(invalidData);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Booking Creation', () => {
    it('should require all booking fields', () => {
      const result = CreateBookingInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('locationId');
        expect(issues).toContain('serviceId');
        expect(issues).toContain('dateTime');
        expect(issues).toContain('timezone');
        expect(issues).toContain('language');
        expect(issues).toContain('customFields');
      }
    });

    it('should accept valid booking data', () => {
      const validData = {
        locationId: 'loc123',
        serviceId: 'svc456',
        dateTime: 1730109600,
        timezone: 'Europe/Madrid',
        language: 'es',
        customFields: [
          { key: 'name', value: 'John Doe' },
          { key: 'email', value: 'john@example.com' },
        ],
      };

      const result = CreateBookingInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate dateTime is a positive integer', () => {
      const invalidData = {
        locationId: 'loc123',
        serviceId: 'svc456',
        dateTime: -100,
        timezone: 'Europe/Madrid',
        language: 'es',
        customFields: [{ key: 'name', value: 'John' }],
      };

      const result = CreateBookingInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Numbering Series', () => {
    it('should use format and last parameters', () => {
      const validData = {
        doc_type: 'invoice',
        name: 'Default',
        format: 'F17%%%%',
        last: 6,
      };

      const result = CreateNumberingSeriesInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept last as integer for create', () => {
      const validData = {
        doc_type: 'invoice',
        name: 'Default',
        format: 'F17%%%%',
        last: 6, // Should be a number
      };

      const result = CreateNumberingSeriesInputSchema.safeParse(validData);
      expect(result.success).toBe(true);

      // String should fail
      const invalidData = {
        doc_type: 'invoice',
        name: 'Default',
        format: 'F17%%%%',
        last: '6', // String should fail
      };

      const invalidResult = CreateNumberingSeriesInputSchema.safeParse(invalidData);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Accounting Entry', () => {
    it('should require account as integer', () => {
      const invalidData = {
        account: '4300', // String instead of integer
        debit: 1000,
      };

      const result = EntryLineSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept account as integer', () => {
      const validData = {
        account: 4300,
        debit: 1000,
      };

      const result = EntryLineSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate positive integer for account', () => {
      const invalidData = {
        account: -4300,
        debit: 1000,
      };

      const result = EntryLineSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Product Stock Update', () => {
    it('should accept nested object structure', () => {
      const validData = {
        product_id: 'prod123',
        stock: {
          'warehouse1': {
            'prod123': 100,
            'variant1': 50,
          },
          'warehouse2': {
            'prod123': 75,
          },
        },
      };

      const result = UpdateProductStockInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject simple number for stock', () => {
      const invalidData = {
        product_id: 'prod123',
        stock: 100, // Should be nested object, not number
      };

      const result = UpdateProductStockInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Employee Time Tracking', () => {
    it('should require startTmp and endTmp as strings', () => {
      const validData = {
        employee_id: 'emp123',
        startTmp: '1730109600',
        endTmp: '1730113200',
      };

      const result = CreateEmployeeTimeTrackingInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject number for startTmp/endTmp', () => {
      const invalidData = {
        employee_id: 'emp123',
        startTmp: 1730109600, // Should be string
        endTmp: 1730113200, // Should be string
      };

      const result = CreateEmployeeTimeTrackingInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should not have undocumented date/hours fields', () => {
      // Extra fields should be rejected in strict mode
      const invalidData = {
        employee_id: 'emp123',
        startTmp: '1730109600',
        endTmp: '1730113200',
        date: '2024-10-28', // Should not be accepted
      };

      const result = CreateEmployeeTimeTrackingInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Error Messages', () => {
    it('should use "message" format for Zod errors', () => {
      const result = CreateEmployeeInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        // All error messages should exist and be descriptive
        result.error.issues.forEach(issue => {
          expect(issue.message).toBeDefined();
          expect(issue.message.length).toBeGreaterThan(0);
        });
      }
    });
  });

  // ===== INVOICING MODULE TESTS =====

  describe('Contact Creation', () => {
    it('should require name field', () => {
      const result = CreateContactInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('name');
      }
    });

    it('should accept valid contact data', () => {
      const validData = {
        name: 'Test Contact',
      };

      const result = CreateContactInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate email format', () => {
      const invalidData = {
        name: 'Test Contact',
        email: 'not-an-email',
      };

      const result = CreateContactInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const validData = {
        name: 'Test Contact',
        email: 'test@example.com',
        phone: '+34123456789',
        type: 'client' as const,
      };

      const result = CreateContactInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept new contact fields', () => {
      const validData = {
        name: 'Test Contact',
        CustomId: 'CUST-001',
        tradeName: 'Test Trading Co',
        sepaRef: 'SEPA-REF-001',
        clientRecord: 4300,
        taxOperation: 'general' as const,
        numberingSeries: { invoice: 'series1', receipt: 'series2' },
        contactPersons: [{ name: 'John Doe', email: 'john@test.com' }],
        defaults: {
          salesTax: 21,
          currency: 'eur',
          language: 'es' as const,
          showTradeNameOnDocs: true,
        },
      };

      const result = CreateContactInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid taxOperation', () => {
      const invalidData = {
        name: 'Test Contact',
        taxOperation: 'invalid',
      };

      const result = CreateContactInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject contactPerson with empty name', () => {
      const invalidData = {
        name: 'Test Contact',
        contactPersons: [{ name: '', email: 'john@test.com' }],
      };

      const result = CreateContactInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject unknown keys in numberingSeries (strictObject)', () => {
      const invalidData = {
        name: 'Test Contact',
        numberingSeries: { invoice: 'series1', unknownDocType: 'series2' },
      };

      const result = CreateContactInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid language in defaults', () => {
      const invalidData = {
        name: 'Test Contact',
        defaults: { language: 'xx' },
      };

      const result = CreateContactInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid accumulateInForm347 value', () => {
      const invalidData = {
        name: 'Test Contact',
        defaults: { accumulateInForm347: 'Maybe' },
      };

      const result = CreateContactInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Contact Update', () => {
    it('should require contact_id', () => {
      const result = UpdateContactInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('contact_id');
      }
    });

    it('should accept contact_id with optional fields', () => {
      const validData = {
        contact_id: 'contact123',
        name: 'Updated Name',
      };

      const result = UpdateContactInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Document Creation', () => {
    it('should require items array', () => {
      const result = CreateDocumentInputSchema.safeParse({
        doc_type: 'invoice',
      });
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('items');
      }
    });

    it('should require at least one item', () => {
      const invalidData = {
        doc_type: 'invoice',
        date: 1730109600,
        dueDate: 1730196000,
        items: [], // Empty array should fail
      };

      const result = CreateDocumentInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept valid document data', () => {
      const validData = {
        doc_type: 'invoice',
        date: 1730109600,
        dueDate: 1730196000,
        items: [
          { name: 'Product 1', units: 2, subtotal: 100 },
        ],
      };

      const result = CreateDocumentInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate item structure', () => {
      const result = DocumentItemSchema.safeParse({
        name: 'Test Item',
        units: 5,
      });
      expect(result.success).toBe(true);
    });

    it('should require date field', () => {
      const invalidData = {
        doc_type: 'invoice',
        items: [{ name: 'Product 1', units: 2, subtotal: 100 }],
      };

      const result = CreateDocumentInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('date');
      }
    });

    it('should accept new document fields', () => {
      const validData = {
        doc_type: 'invoice',
        date: 1730109600,
        items: [{ name: 'Product 1', units: 2, subtotal: 100, taxes: ['s_iva_21'], serviceId: 'svc1' }],
        contactCode: 'B12345678',
        language: 'es',
        currency: 'eur',
        approveDoc: true,
        shippingAddress: '123 Main St',
        shippingCity: 'Madrid',
        customFields: [{ field: 'ref', value: '123' }],
        tags: ['urgent'],
      };

      const result = CreateDocumentInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Product Creation', () => {
    it('should require name field', () => {
      const result = CreateProductInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('name');
      }
    });

    it('should accept valid product data', () => {
      const validData = {
        name: 'Test Product',
      };

      const result = CreateProductInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept optional fields', () => {
      const validData = {
        name: 'Test Product',
        sku: 'PROD-001',
        price: 99.99,
        kind: 'product' as const,
      };

      const result = CreateProductInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate price is non-negative', () => {
      const invalidData = {
        name: 'Test Product',
        price: -10,
      };

      const result = CreateProductInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept new product fields', () => {
      const validData = {
        name: 'Test Product',
        purchasePrice: 50.00,
        tags: ['electronics', 'sale'],
        calculatecost: 45.00,
      };

      const result = CreateProductInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Service Creation', () => {
    it('should require name field', () => {
      const result = CreateServiceInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('name');
      }
    });

    it('should accept valid service data', () => {
      const validData = {
        name: 'Consulting Service',
      };

      const result = CreateServiceInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept optional fields', () => {
      const validData = {
        name: 'Consulting Service',
        desc: 'Professional consulting',
        tax: 21,
        subtotal: 15000,
      };

      const result = CreateServiceInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Payment Creation', () => {
    it('should require amount and date fields', () => {
      const result = CreatePaymentInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('amount');
        expect(issues).toContain('doc_id');
      }
    });

    it('should require positive amount', () => {
      const invalidData = {
        doc_id: 'doc123',
        amount: -100,
        date: 1730109600,
      };

      const result = CreatePaymentInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept valid payment data', () => {
      const validData = {
        doc_id: 'doc123',
        amount: 500.50,
        date: 1730109600,
      };

      const result = CreatePaymentInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Taxes', () => {
    it('should accept optional response_format', () => {
      const validData = {
        response_format: 'json' as const,
      };

      const result = GetTaxesInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = GetTaxesInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('Warehouse Creation', () => {
    it('should require name field', () => {
      const result = CreateWarehouseInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('name');
      }
    });

    it('should accept valid warehouse data', () => {
      const validData = {
        name: 'Main Warehouse',
      };

      const result = CreateWarehouseInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept optional address', () => {
      const validData = {
        name: 'Main Warehouse',
        address: {
          address: '123 Main St',
          city: 'Madrid',
          postalCode: '28001',
        },
      };

      const result = CreateWarehouseInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Treasury Creation', () => {
    it('should require name field', () => {
      const result = CreateTreasuryInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('name');
      }
    });

    it('should accept valid treasury data', () => {
      const validData = {
        name: 'Main Bank Account',
      };

      const result = CreateTreasuryInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept optional bank details', () => {
      const validData = {
        name: 'Main Bank Account',
        type: 'bank',
        iban: 'ES9121000418450200051332',
        swift: 'CAIXESBBXXX',
      };

      const result = CreateTreasuryInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Sales Channel Creation', () => {
    it('should require name field', () => {
      const result = CreateSalesChannelInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('name');
      }
    });

    it('should accept valid sales channel data', () => {
      const validData = {
        name: 'Online Store',
      };

      const result = CreateSalesChannelInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Remittances List', () => {
    it('should accept optional pagination', () => {
      const validData = {
        page: 1,
        response_format: 'json' as const,
      };

      const result = ListRemittancesInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Expenses Account Creation', () => {
    it('should require name field', () => {
      const result = CreateExpensesAccountInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('name');
      }
    });

    it('should accept valid expenses account data', () => {
      const validData = {
        name: 'Office Supplies',
      };

      const result = CreateExpensesAccountInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  // ===== CRM MODULE TESTS =====

  describe('Lead Creation', () => {
    it('should require name, funnel_id, and contact_id', () => {
      const result = CreateLeadInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('name');
        expect(issues).toContain('funnel_id');
        expect(issues).toContain('contact_id');
      }
    });

    it('should accept valid lead data', () => {
      const validData = {
        name: 'New Lead',
        funnel_id: 'funnel123',
        contact_id: 'contact456',
      };

      const result = CreateLeadInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing funnel_id', () => {
      const invalidData = {
        name: 'New Lead',
        contact_id: 'contact456',
      };

      const result = CreateLeadInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const validData = {
        name: 'New Lead',
        funnel_id: 'funnel123',
        contact_id: 'contact456',
        stage_id: 'stage789',
        value: 5000,
        due_date: 1730109600,
      };

      const result = CreateLeadInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Funnel Creation', () => {
    it('should require name field', () => {
      const result = CreateFunnelInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('name');
      }
    });

    it('should accept valid funnel data', () => {
      const validData = {
        name: 'Sales Funnel',
      };

      const result = CreateFunnelInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept optional stages', () => {
      const validData = {
        name: 'Sales Funnel',
        stages: [
          { name: 'Contact', order: 1, probability: 25 },
          { name: 'Proposal', order: 2, probability: 50 },
          { name: 'Negotiation', order: 3, probability: 75 },
        ],
      };

      const result = CreateFunnelInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate stage schema', () => {
      const result = FunnelStageSchema.safeParse({
        name: 'Contact',
        probability: 25,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Event Creation', () => {
    it('should require name field', () => {
      const result = CreateEventInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('name');
      }
    });

    it('should accept valid event data', () => {
      const validData = {
        name: 'Client Meeting',
        start: 1730109600,
      };

      const result = CreateEventInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept optional fields', () => {
      const validData = {
        name: 'Client Meeting',
        start: 1730109600,
        end: 1730113200,
        allDay: false,
        description: 'Discuss project requirements',
        leadId: 'lead123',
      };

      const result = CreateEventInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Event Update', () => {
    it('should require event_id', () => {
      const result = UpdateEventInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('event_id');
      }
    });

    it('should accept event_id with optional fields', () => {
      const validData = {
        event_id: 'event123',
        name: 'Updated Meeting',
      };

      const result = UpdateEventInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  // ===== PROJECTS MODULE TESTS =====

  describe('Project Creation', () => {
    it('should require name field', () => {
      const result = CreateProjectInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('name');
      }
    });

    it('should accept valid project data', () => {
      const validData = {
        name: 'Website Redesign',
      };

      const result = CreateProjectInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should not have undocumented fields', () => {
      // Only name should be accepted
      const validData = {
        name: 'Website Redesign',
      };

      const result = CreateProjectInputSchema.safeParse(validData);
      expect(result.success).toBe(true);

      // Extra fields should be rejected in strict mode
      const invalidData = {
        name: 'Website Redesign',
        description: 'Should not be accepted',
      };

      const invalidResult = CreateProjectInputSchema.safeParse(invalidData);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Project Time Tracking', () => {
    it('should require duration and costHour fields', () => {
      const result = CreateProjectTimeTrackingInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('project_id');
        expect(issues).toContain('duration');
        expect(issues).toContain('costHour');
      }
    });

    it('should accept valid time tracking data', () => {
      const validData = {
        project_id: 'proj123',
        duration: 3600, // 1 hour in seconds
        costHour: 5000, // 50.00 in cents
      };

      const result = CreateProjectTimeTrackingInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require positive duration', () => {
      const invalidData = {
        project_id: 'proj123',
        duration: -100,
        costHour: 5000,
      };

      const result = CreateProjectTimeTrackingInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // ===== ACCOUNTING MODULE TESTS =====

  describe('Accounting Account Creation', () => {
    it('should require prefix field', () => {
      const result = CreateAccountInputSchema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('prefix');
      }
    });

    it('should validate prefix is 4 digits', () => {
      const invalidData = {
        prefix: 123, // Only 3 digits
      };

      const result = CreateAccountInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept valid 4-digit prefix', () => {
      const validData = {
        prefix: 7000,
      };

      const result = CreateAccountInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate color format', () => {
      const invalidData = {
        prefix: 7000,
        color: 'red', // Invalid, should be hex
      };

      const result = CreateAccountInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept valid hex color', () => {
      const validData = {
        prefix: 7000,
        name: 'Sales Account',
        color: '#FF0000',
      };

      const result = CreateAccountInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Accounting Account List', () => {
    it('should accept default include_empty', () => {
      const validData = {};

      const result = ListAccountingAccountsInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_empty).toBe(true);
      }
    });

    it('should reject starttmp and endtmp as unknown fields', () => {
      const data = {
        starttmp: 1730109600,
        endtmp: 1730196000,
      };

      const result = ListAccountingAccountsInputSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Account Balances', () => {
    it('should accept valid starttmp and endtmp', () => {
      const result = AccountBalancesInputSchema.safeParse(validAccountBalances);
      expect(result.success).toBe(true);
    });

    it('should accept optional account_filter and include_opening', () => {
      const result = AccountBalancesInputSchema.safeParse(accountBalancesWithFilter);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.account_filter).toEqual([62900001, 62900002]);
        expect(result.data.include_opening).toBe(true);
      }
    });

    it('should reject when endtmp is before starttmp', () => {
      const result = AccountBalancesInputSchema.safeParse(invalidAccountBalancesEndBeforeStart);
      expect(result.success).toBe(false);
    });

    it('should require starttmp', () => {
      const result = AccountBalancesInputSchema.safeParse(invalidAccountBalancesMissingStart);
      expect(result.success).toBe(false);
    });

    it('should require endtmp', () => {
      const result = AccountBalancesInputSchema.safeParse(invalidAccountBalancesMissingEnd);
      expect(result.success).toBe(false);
    });

    it('should default include_opening to false', () => {
      const result = AccountBalancesInputSchema.safeParse(validAccountBalances);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_opening).toBe(false);
      }
    });

    it('should default response_format to json', () => {
      const result = AccountBalancesInputSchema.safeParse(validAccountBalances);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.response_format).toBe('json');
      }
    });
  });

  // ===== COMMON SCHEMAS TESTS =====

  describe('Pagination Schema', () => {
    it('should default to page 1', () => {
      const result = PaginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it('should reject page 0', () => {
      const result = PaginationSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('should accept positive page numbers', () => {
      const result = PaginationSchema.safeParse({ page: 5 });
      expect(result.success).toBe(true);
    });
  });

  describe('Timestamp Schema', () => {
    it('should accept positive integers', () => {
      const result = TimestampSchema.safeParse(1730109600);
      expect(result.success).toBe(true);
    });

    it('should reject negative numbers', () => {
      const result = TimestampSchema.safeParse(-1730109600);
      expect(result.success).toBe(false);
    });

    it('should be optional', () => {
      const result = TimestampSchema.safeParse(undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('Address Schema', () => {
    it('should accept empty object', () => {
      const result = AddressSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept partial address', () => {
      const validData = {
        city: 'Madrid',
        postalCode: '28001',
      };

      const result = AddressSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept full address', () => {
      const validData = {
        address: '123 Main St',
        city: 'Madrid',
        postalCode: '28001',
        province: 'Madrid',
        country: 'Spain',
        countryCode: 'ES',
      };

      const result = AddressSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('ShippingAddressSchema', () => {
    it('should accept address with countryCode inherited from AddressSchema', () => {
      const validData = {
        address: '123 Main St',
        city: 'Madrid',
        countryCode: 'ES',
        name: 'Main Warehouse',
        notes: 'Ring bell twice',
      };

      const result = ShippingAddressSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept all shipping-specific fields', () => {
      const validData = {
        name: 'Office',
        address: '456 Oak Ave',
        city: 'Barcelona',
        postalCode: '08001',
        province: 'Barcelona',
        country: 'Spain',
        countryCode: 'ES',
        notes: 'Leave at reception',
        privateNote: 'Internal use only',
      };

      const result = ShippingAddressSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject unknown fields (strictObject)', () => {
      const invalidData = {
        address: '123 Main St',
        unknownField: 'should fail',
      };

      const result = ShippingAddressSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('NumberingSeriesSchema', () => {
    it('should reject unknown document type keys', () => {
      const invalidData = {
        invoice: 'series1',
        unknownType: 'series2',
      };

      const result = NumberingSeriesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('ContactPersonSchema', () => {
    it('should require name', () => {
      const result = ContactPersonSchema.safeParse({ email: 'test@test.com' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const result = ContactPersonSchema.safeParse({ name: 'John', email: 'not-email' });
      expect(result.success).toBe(false);
    });
  });
});
