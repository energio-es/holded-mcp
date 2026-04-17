# Holded MCP Server

[![npm version](https://img.shields.io/npm/v/@energio%2Fholded-mcp.svg)](https://www.npmjs.com/package/@energio/holded-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/energio-es/holded-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/energio-es/holded-mcp/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)

A Model Context Protocol (MCP) server for integrating with the Holded API. This server provides comprehensive access to Holded's business management platform, including invoicing, accounting, CRM, projects, and team functionality.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Available Tools](#available-tools)
- [Document Types](#document-types)
- [Response Formats](#response-formats)
- [Error Handling](#error-handling)
- [Performance](#performance)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Features

### Invoicing Module
- **Documents**: Full CRUD operations for documents (invoices, estimates, purchases, etc.) plus pay, send, PDF export, tracking, and pipeline management
- **Contacts**: Full CRUD operations for contacts and contact groups
- **Products**: Manage products, variants, and stock levels
- **Payments**: Full CRUD operations for payments
- **Numbering Series**: Full CRUD operations for document numbering series
- **Treasury**: Create, list, and retrieve treasury/bank accounts
- **Payment Methods**: List available payment methods
- **Expenses Accounts**: Full CRUD operations for expenses accounts
- **Sales Channels**: Full CRUD operations for sales channels
- **Services**: Full CRUD operations for services
- **Taxes**: Get tax information and rates
- **Warehouses**: Full CRUD operations for warehouses

### CRM Module
- **Leads**: Create, list, get, update, delete leads; manage stages, notes, and tasks
- **Funnels**: Full CRUD operations for sales funnels with custom stages
- **Events**: Full CRUD operations for CRM events
- **Bookings**: Full CRUD operations for bookings and manage locations

### Projects Module
- **Projects**: Full CRUD operations for projects plus project summaries
- **Tasks**: Full CRUD operations for project tasks
- **Time Tracking**: Full CRUD operations for project time tracking entries

### Accounting Module
- **Accounts**: List and create accounting accounts with prefix-based numbering
- **Daily Ledger**: List daily ledger entries and create accounting entries

### Team Module
- **Employees**: Full CRUD operations for employees
- **Time Tracking**: List all time trackings, list by employee, get, create, update, and delete time tracking entries

## Installation

### Prerequisites

1. **Node.js** >= 20 (check with `node --version`)
2. **Holded API Key** - Get yours from [Holded API Settings](https://app.holded.com/api) or go to Configuration (top bar) → API

### Quick Start (npx)

The easiest way to use this MCP server is via `npx` - no installation or build required! Just configure your MCP client as shown below.

### Setup for Claude Desktop

Add the following to your Claude Desktop configuration file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "holded": {
      "command": "npx",
      "args": ["-y", "@energio/holded-mcp"],
      "env": {
        "HOLDED_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Restart Claude Desktop to load the server.

### Setup for Claude Code

Add the server with a single command:

```bash
claude mcp add holded -- npx -y @energio/holded-mcp
```

Then set the API key in your environment:

```bash
export HOLDED_API_KEY=your_api_key_here
```

### Setup for Cursor

Add the following to your Cursor MCP settings file:

- **macOS**: `~/.cursor/mcp.json`
- **Windows**: `%APPDATA%\Cursor\mcp.json`
- **Linux**: `~/.config/cursor/mcp.json`

```json
{
  "mcpServers": {
    "holded": {
      "command": "npx",
      "args": ["-y", "@energio/holded-mcp"],
      "env": {
        "HOLDED_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

After saving, restart Cursor or reload the MCP servers from the settings.

### Setup for VS Code

Add the following to your VS Code user settings (`settings.json`) or workspace settings (`.vscode/mcp.json`):

**User settings (`settings.json`):**

```json
{
  "mcp": {
    "servers": {
      "holded": {
        "command": "npx",
        "args": ["-y", "@energio/holded-mcp"],
        "env": {
          "HOLDED_API_KEY": "your_api_key_here"
        }
      }
    }
  }
}
```

**Workspace settings (`.vscode/mcp.json`):**

```json
{
  "servers": {
    "holded": {
      "command": "npx",
      "args": ["-y", "@energio/holded-mcp"],
      "env": {
        "HOLDED_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Setup for Windsurf

Add the following to your Windsurf MCP configuration file:

- **macOS**: `~/.codeium/windsurf/mcp_config.json`
- **Windows**: `%APPDATA%\Codeium\windsurf\mcp_config.json`
- **Linux**: `~/.codeium/windsurf/mcp_config.json`

```json
{
  "mcpServers": {
    "holded": {
      "command": "npx",
      "args": ["-y", "@energio/holded-mcp"],
      "env": {
        "HOLDED_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Setup for Other MCP-Compatible Agents

Any MCP-compatible agent can use this server via npx. The general configuration requires:

1. **Command**: `npx`
2. **Arguments**: `["-y", "@energio/holded-mcp"]`
3. **Environment variable**: `HOLDED_API_KEY` with your API key

Example configuration:

```json
{
  "mcpServers": {
    "holded": {
      "command": "npx",
      "args": ["-y", "@energio/holded-mcp"],
      "env": {
        "HOLDED_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

The server communicates via stdio using the MCP protocol and can be integrated with any client that supports the [Model Context Protocol](https://modelcontextprotocol.io/).

## Configuration

The server requires a `HOLDED_API_KEY` environment variable. This is typically set in your MCP client configuration (see installation sections above).

For manual/development usage, you can set it directly:

```bash
export HOLDED_API_KEY=your_api_key_here
```

### Module Selection

By default, all modules are enabled. To load only specific modules, set the `HOLDED_MODULES` environment variable with a comma-separated list:

**Available modules**: `invoicing`, `crm`, `projects`, `accounting`, `team`

Example - enable only invoicing module:

```json
{
  "mcpServers": {
    "holded": {
      "command": "npx",
      "args": ["-y", "@energio/holded-mcp"],
      "env": {
        "HOLDED_API_KEY": "your_api_key_here",
        "HOLDED_MODULES": "invoicing"
      }
    }
  }
}
```

**Configuration examples**:

- **All modules (default)**: Omit `HOLDED_MODULES` or leave it empty
- **Only CRM**: `"HOLDED_MODULES": "crm"`
- **Only invoicing**: `"HOLDED_MODULES": "invoicing"`
- **Multiple modules**: `"HOLDED_MODULES": "invoicing,crm"`

### Debug Mode

Enable debug logging for API requests and retries by setting the `HOLDED_DEBUG` environment variable:

```json
{
  "mcpServers": {
    "holded": {
      "command": "npx",
      "args": ["-y", "@energio/holded-mcp"],
      "env": {
        "HOLDED_API_KEY": "your_api_key_here",
        "HOLDED_DEBUG": "true"
      }
    }
  }
}
```

When enabled, the server will log retry attempts and API request failures to stderr, which can be helpful for troubleshooting connection issues or rate limiting.

## Usage

### Running the Server Manually

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

**Note**: In most cases, you won't run the server manually. Your MCP client (Cursor, Claude Desktop, etc.) will start and manage the server process automatically based on your configuration.

## Available Tools

### Contact Tools
- `holded_invoicing_list_contacts` - List all contacts
- `holded_invoicing_get_contact` - Get a specific contact
- `holded_invoicing_create_contact` - Create a new contact
- `holded_invoicing_update_contact` - Update a contact
- `holded_invoicing_delete_contact` - Delete a contact
- `holded_invoicing_list_contact_groups` - List contact groups
- `holded_invoicing_get_contact_group` - Get a contact group
- `holded_invoicing_create_contact_group` - Create a contact group
- `holded_invoicing_update_contact_group` - Update a contact group
- `holded_invoicing_delete_contact_group` - Delete a contact group
- `holded_invoicing_list_contact_attachments` - List attachments for a contact
- `holded_invoicing_get_contact_attachment` - Get a specific contact attachment

### Product Tools
- `holded_invoicing_list_products` - List all products
- `holded_invoicing_get_product` - Get a specific product
- `holded_invoicing_create_product` - Create a new product
- `holded_invoicing_update_product` - Update a product
- `holded_invoicing_delete_product` - Delete a product
- `holded_invoicing_list_products_stock` - List product stock levels for a specific warehouse
- `holded_invoicing_update_product_stock` - Update product stock
- `holded_invoicing_get_product_image` - Get main product image
- `holded_invoicing_list_product_images` - List all product images
- `holded_invoicing_get_product_secondary_image` - Get a secondary product image
- `holded_invoicing_upload_product_image` - Upload an image to a product (accepts `file_path` for large files; `file_content` base64 still supported)

### Document Tools
- `holded_invoicing_list_documents` - List documents by type
- `holded_invoicing_get_document` - Get a specific document
- `holded_invoicing_create_document` - Create a new document
- `holded_invoicing_update_document` - Update a document
- `holded_invoicing_delete_document` - Delete a document
- `holded_invoicing_pay_document` - Record a payment for a document
- `holded_invoicing_send_document` - Send a document via email
- `holded_invoicing_get_document_pdf` - Get PDF version of a document
- `holded_invoicing_update_document_tracking` - Update document tracking info
- `holded_invoicing_update_document_pipeline` - Update document pipeline stage
- `holded_invoicing_ship_all_items` - Ship all items from a sales order
- `holded_invoicing_ship_items_by_line` - Ship specific items by line from a sales order
- `holded_invoicing_get_shipped_items` - Get shipped items for a document
- `holded_invoicing_attach_document_file` - Attach a file to a document (accepts `file_path` for large files; `file_content` base64 still supported)

### Payment & Treasury Tools
- `holded_invoicing_list_payments` - List all payments
- `holded_invoicing_get_payment` - Get a specific payment
- `holded_invoicing_create_payment` - Create a payment
- `holded_invoicing_update_payment` - Update a payment
- `holded_invoicing_delete_payment` - Delete a payment
- `holded_invoicing_get_numbering_series` - Get numbering series by type
- `holded_invoicing_create_numbering_serie` - Create a numbering series
- `holded_invoicing_update_numbering_serie` - Update a numbering series
- `holded_invoicing_delete_numbering_serie` - Delete a numbering series
- `holded_invoicing_create_treasury` - Create a treasury account
- `holded_invoicing_list_treasuries` - List treasury accounts
- `holded_invoicing_get_treasury` - Get a treasury account
- `holded_invoicing_list_payment_methods` - List available payment methods

### Expenses Account Tools
- `holded_invoicing_list_expenses_accounts` - List all expenses accounts
- `holded_invoicing_get_expenses_account` - Get a specific expenses account
- `holded_invoicing_create_expenses_account` - Create a new expenses account
- `holded_invoicing_update_expenses_account` - Update an expenses account
- `holded_invoicing_delete_expenses_account` - Delete an expenses account

### Sales Channel Tools
- `holded_invoicing_list_sales_channels` - List all sales channels
- `holded_invoicing_get_sales_channel` - Get a specific sales channel
- `holded_invoicing_create_sales_channel` - Create a new sales channel
- `holded_invoicing_update_sales_channel` - Update a sales channel
- `holded_invoicing_delete_sales_channel` - Delete a sales channel

### Services Tools
- `holded_invoicing_list_services` - List all services
- `holded_invoicing_get_service` - Get a specific service
- `holded_invoicing_create_service` - Create a new service
- `holded_invoicing_update_service` - Update a service
- `holded_invoicing_delete_service` - Delete a service

### Remittances Tools
- `holded_invoicing_list_remittances` - List all remittances
- `holded_invoicing_get_remittance` - Get a specific remittance

### Taxes Tools
- `holded_invoicing_get_taxes` - Get all taxes information

### Warehouse Tools
- `holded_invoicing_list_warehouses` - List all warehouses
- `holded_invoicing_get_warehouse` - Get a specific warehouse
- `holded_invoicing_create_warehouse` - Create a new warehouse
- `holded_invoicing_update_warehouse` - Update a warehouse
- `holded_invoicing_delete_warehouse` - Delete a warehouse

### CRM Tools

#### Lead Tools
- `holded_crm_list_leads` - List all leads
- `holded_crm_get_lead` - Get a specific lead
- `holded_crm_create_lead` - Create a new lead
- `holded_crm_update_lead` - Update a lead
- `holded_crm_delete_lead` - Delete a lead
- `holded_crm_update_lead_stage` - Move lead to a different stage
- `holded_crm_list_lead_notes` - List all notes for a lead
- `holded_crm_create_lead_note` - Add a note to a lead
- `holded_crm_update_lead_note` - Update a lead note
- `holded_crm_list_lead_tasks` - List all tasks for a lead
- `holded_crm_create_lead_task` - Create a task for a lead
- `holded_crm_update_lead_task` - Update a lead task
- `holded_crm_delete_lead_task` - Delete a lead task
- `holded_crm_update_lead_dates` - Update lead dates

#### Funnel Tools
- `holded_crm_list_funnels` - List all funnels
- `holded_crm_get_funnel` - Get a specific funnel
- `holded_crm_create_funnel` - Create a funnel
- `holded_crm_update_funnel` - Update a funnel
- `holded_crm_delete_funnel` - Delete a funnel

#### Event Tools
- `holded_crm_list_events` - List all events
- `holded_crm_get_event` - Get a specific event
- `holded_crm_create_event` - Create an event
- `holded_crm_update_event` - Update an event
- `holded_crm_delete_event` - Delete an event

#### Booking Tools
- `holded_crm_list_bookings` - List all bookings
- `holded_crm_get_booking` - Get a specific booking
- `holded_crm_create_booking` - Create a booking
- `holded_crm_update_booking` - Update a booking
- `holded_crm_delete_booking` - Delete/cancel a booking
- `holded_crm_list_booking_locations` - List booking locations
- `holded_crm_get_available_slots` - Get available booking slots

### Project Tools
- `holded_projects_list_projects` - List all projects
- `holded_projects_get_project` - Get a specific project
- `holded_projects_create_project` - Create a project
- `holded_projects_update_project` - Update a project
- `holded_projects_delete_project` - Delete a project
- `holded_projects_get_project_summary` - Get project summary/overview
- `holded_projects_list_tasks` - List all tasks
- `holded_projects_get_task` - Get a specific task
- `holded_projects_create_task` - Create a task
- `holded_projects_delete_task` - Delete a task

### Project Time Tracking Tools
- `holded_projects_list_project_time_trackings` - List all time trackings for a project
- `holded_projects_get_project_time_tracking` - Get a specific project time tracking entry
- `holded_projects_create_project_time_tracking` - Create a time tracking entry for a project
- `holded_projects_update_project_time_tracking` - Update a project time tracking entry
- `holded_projects_delete_project_time_tracking` - Delete a project time tracking entry
- `holded_projects_list_all_times` - List all time trackings across all projects

### Accounting Tools
- `holded_accounting_list_accounts` - List all accounting accounts (chart of accounts/PGC accounts)
- `holded_accounting_get_account` - Get a specific accounting account
- `holded_accounting_create_account` - Create an accounting account
- `holded_accounting_update_account` - Update an accounting account
- `holded_accounting_delete_account` - Delete an accounting account
- `holded_accounting_list_daily_ledger` - List daily ledger entries
- `holded_accounting_create_entry` - Create a daily ledger entry

### Team Tools

#### Employee Tools
- `holded_team_list_employees` - List all employees
- `holded_team_get_employee` - Get a specific employee
- `holded_team_create_employee` - Create a new employee
- `holded_team_update_employee` - Update an employee
- `holded_team_delete_employee` - Delete an employee

#### Time Tracking Tools
- `holded_team_list_all_time_trackings` - List all time trackings for all employees
- `holded_team_list_employee_time_trackings` - List all time trackings for a specific employee
- `holded_team_get_time_tracking` - Get a specific time tracking entry
- `holded_team_create_employee_time_tracking` - Create a time tracking entry for an employee
- `holded_team_update_time_tracking` - Update a time tracking entry
- `holded_team_delete_time_tracking` - Delete a time tracking entry
- `holded_team_employee_clock_in` - Clock in an employee
- `holded_team_employee_clock_out` - Clock out an employee
- `holded_team_employee_pause` - Pause employee time tracking
- `holded_team_employee_unpause` - Unpause employee time tracking

## Document Types

The following document types are supported:
- `invoice` - Sales invoices
- `salesreceipt` - Sales receipts
- `creditnote` - Sales refunds
- `receiptnote` - Ticket sales refunds
- `estimate` - Sales estimates/quotes
- `salesorder` - Sales orders
- `waybill` - Packing lists
- `proform` - Proforma invoices
- `purchase` - Purchases
- `purchaserefund` - Purchase refunds
- `purchaseorder` - Purchase orders

## Response Formats

All tools support two response formats:
- `json` (default) - Structured JSON data for programmatic processing
- `markdown` - Human-readable formatted text

## Error Handling

The server provides clear, actionable error messages for common scenarios:
- Authentication errors (401) - Check your API key
- Not found errors (404) - Verify resource IDs
- Rate limiting (429) - Wait before retrying
- Validation errors (422) - Check input parameters

## Performance

This server provides 143 tools covering all Holded API modules. If you only need a subset of functionality, you can improve performance by enabling only the modules you need using the `HOLDED_MODULES` environment variable (see [Module Selection](#module-selection) above):

- **Reduced token usage**: Fewer tool definitions means less context sent to the LLM
- **Faster responses**: The model spends less time parsing available tools
- **Lower costs**: Smaller prompts reduce API costs for token-based billing

For example, if you only work with invoicing, you can set `HOLDED_MODULES=invoicing` to disable CRM, Projects, Accounting, and Team modules.

## Troubleshooting

### Common Issues

#### 1. API Key Not Found
**Error**: `ERROR: HOLDED_API_KEY environment variable is required.`

**Solution**: Ensure your API key is properly configured in your MCP client settings:
- Check that `HOLDED_API_KEY` is set in the `env` section
- Verify the key is correct (no extra spaces or quotes)
- Get your API key from Configuration → API in Holded

#### 2. 401 Unauthorized
**Error**: API returns 401 status code

**Solution**:
- Verify your API key is valid and not expired
- Check that the key has the necessary permissions
- Regenerate the API key if needed

#### 3. 422 Validation Error
**Error**: API returns 422 status code

**Solution**:
- Check that all required parameters are provided
- Verify parameter types match expectations (string vs number)
- For nested objects (stock updates, custom fields), ensure correct structure

#### 4. Module Not Loading
**Error**: Tools from a specific module are missing

**Solution**:
- Check if you've set `HOLDED_MODULES` environment variable
- If set, ensure the module name is included (e.g., `"HOLDED_MODULES": "invoicing,crm"`)
- Remove `HOLDED_MODULES` or leave it empty to load all modules

## Complex Operation Examples

### Stock Updates

Updating product stock requires a nested object structure where you specify warehouse ID and product/variant IDs:

```typescript
// Stock update structure: stock[warehouseId][productId/variantId] = quantity
{
  "product_id": "abc123",
  "stock": {
    "warehouse1": {
      "productId1": 100,
      "variantId1": 50
    },
    "warehouse2": {
      "productId1": 75
    }
  }
}
```

**Example**: Set stock for product "abc123" to 100 units in warehouse "wh1":
```typescript
{
  "product_id": "abc123",
  "stock": {
    "wh1": {
      "abc123": 100
    }
  }
}
```

### Booking Creation

Bookings require specific custom fields with key-value pairs:

```typescript
{
  "locationId": "location123",
  "serviceId": "service456",
  "dateTime": 1730109600,  // Unix timestamp
  "timezone": "Europe/Madrid",
  "language": "es",
  "customFields": [
    {
      "key": "name",
      "value": "John Doe"
    },
    {
      "key": "email",
      "value": "john@example.com"
    },
    {
      "key": "phone",
      "value": "+34612345678"
    }
  ]
}
```

### Task Creation

Tasks require both project ID and list ID (the list/column within the project):

```typescript
{
  "name": "New Task",
  "project_id": "proj123",
  "list_id": "list456"  // Get this from project details
}
```

**Note**: To get available list IDs, first fetch the project details using `holded_projects_get_project`.

### Accounting Entries

Daily ledger entries must have balanced debits and credits:

```typescript
{
  "date": 1730109600,  // Unix timestamp
  "lines": [
    {
      "account": 4300,  // Account number (integer)
      "debit": 1000,
      "description": "Sales revenue"
    },
    {
      "account": 5700,  // Account number (integer)
      "credit": 1000,
      "description": "Bank account"
    }
  ],
  "notes": "Monthly sales entry"
}
```

**Requirements**:
- Minimum 2 lines
- Total debits must equal total credits
- Each line must have either debit OR credit (not both)
- Account numbers must be positive integers

### Parameter Naming Convention

This MCP server uses a consistent parameter naming convention:

- **Path/Query parameters**: Use `snake_case` (e.g., `employee_id`, `doc_type`)
- **Request body fields**: Use `camelCase` matching the API (e.g., `lastName`, `sendInvite`)

The tool handlers automatically transform parameters to the format expected by the Holded API.

### Custom fields

> **Breaking in v1.4.0:** The `customFields` parameter shape changed from `[{field, value}]` to a flat `{key: value}` object. Replace each `[{field: "k", value: "v"}]` with `{"k": "v"}` in calls to `create_document`, `update_document`, `update_lead`, and `update_funnel`. Responses use the same map shape. The old array shape is rejected by the Zod schema.

Tools that accept or return `customFields` (documents, leads, funnels) use a flat `{key: value}` map:

```json
{
  "customFields": {
    "source_path": "/tmp/invoice.pdf",
    "source": "invoices-to-holded@v1/file"
  }
}
```

The server normalizes Holded's internal wire shape (which varies per endpoint and has a known bug in `POST /documents/{docType}` — see `holded_api_specs/DRIFT.md#DRIFT-INV-14`) so the map form round-trips consistently. On reads, previously-mangled records are repaired transparently.

### Updating an invoice's exchange rate

> **Breaking in v1.5.0:** `update_document` no longer accepts `currencyChange`. Holded's PUT endpoint silently drops the field, so attempting an exchange-rate update produced a success response but no change. To change an invoice's exchange rate, delete the invoice and recreate it with the new `currencyChange` at creation time (the create path honors it and recomputes totals).

## Workflow Examples

This section demonstrates common real-world workflows combining multiple API operations.

### Creating a Complete Invoice

```typescript
// 1. First, ensure you have a contact
const contact = await holded_invoicing_create_contact({
  name: "Acme Corp",
  email: "billing@acme.com",
  code: "B12345678"  // Tax ID
});

// 2. Create the invoice with line items
const invoice = await holded_invoicing_create_document({
  doc_type: "invoice",
  contactId: contact.id,
  contactName: "Acme Corp",
  date: 1730109600,  // Unix timestamp
  items: [
    {
      name: "Web Development Service",
      units: 40,
      subtotal: 4000,  // 40 hours × €100/hour
      tax: 21  // 21% VAT
    },
    {
      name: "Hosting Service (Annual)",
      units: 1,
      subtotal: 500,
      tax: 21
    }
  ],
  notes: "Payment due within 30 days"
});

// 3. Send the invoice via email
await holded_invoicing_send_document({
  doc_type: "invoice",
  document_id: invoice.id,
  emails: ["billing@acme.com"]
});

// 4. Record payment when received
await holded_invoicing_pay_document({
  doc_type: "invoice",
  document_id: invoice.id,
  paid: 5445,  // Total with VAT (€4,500 × 1.21)
  date: 1732701600  // Payment date
});
```

### Managing Lead Lifecycle

```typescript
// 1. Create a new lead
const lead = await holded_crm_create_lead({
  name: "Enterprise Client Prospect",
  funnelId: "funnel123",
  stageId: "stage_initial_contact",
  contactName: "Jane Smith",
  email: "jane.smith@enterprise.com",
  phone: "+34912345678"
});

// 2. Add initial contact notes
await holded_crm_create_lead_note({
  lead_id: lead.id,
  note: "Initial call: Interested in enterprise plan. Budget: €50k/year. Decision timeline: Q2 2026."
});

// 3. Create follow-up task
await holded_crm_create_lead_task({
  lead_id: lead.id,
  task: "Send proposal and pricing",
  dueDate: 1730800000  // 1 week from now
});

// 4. Update lead stage after proposal sent
await holded_crm_update_lead_stage({
  lead_id: lead.id,
  stageId: "stage_proposal_sent"
});

// 5. Add proposal notes
await holded_crm_create_lead_note({
  lead_id: lead.id,
  note: "Sent proposal via email. Includes: Enterprise tier, custom integrations, dedicated support."
});

// 6. When deal is won, convert to contact
const contact = await holded_invoicing_create_contact({
  name: "Enterprise Client Inc",
  email: "jane.smith@enterprise.com",
  phone: "+34912345678"
});

// 7. Move lead to won stage
await holded_crm_update_lead_stage({
  lead_id: lead.id,
  stageId: "stage_won"
});
```

### Employee Onboarding Workflow

```typescript
// 1. Create new employee
const employee = await holded_team_create_employee({
  name: "María",
  lastName: "García",
  email: "maria.garcia@company.com",
  sendInvite: true  // Sends email invitation
});

// 2. Update employee details after onboarding
await holded_team_update_employee({
  employee_id: employee.id,
  phone: "+34666123456",
  mobile: "+34666123456",
  dateOfBirth: "15/03/1990",
  nationality: "Spanish",
  iban: "ES1234567890123456789012",
  address: {
    address: "Calle Mayor 123",
    city: "Madrid",
    postalCode: "28013",
    province: "Madrid",
    country: "Spain"
  },
  workplace: "office_madrid_001",
  teams: ["team_engineering", "team_backend"]
});

// 3. Set up first time tracking entry
await holded_team_create_employee_time_tracking({
  employee_id: employee.id,
  startTmp: "1730109600",  // 9:00 AM (Unix timestamp as string)
  endTmp: "1730138400"     // 5:00 PM (Unix timestamp as string)
});

// 4. Use clock-in/clock-out for daily tracking
await holded_team_employee_clock_in({
  employee_id: employee.id,
  location: "Madrid Office"
});

// Later in the day...
await holded_team_employee_clock_out({
  employee_id: employee.id,
  latitude: "40.4168",
  longitude: "-3.7038"
});
```

### Multi-Warehouse Stock Management

```typescript
// 1. Create warehouses
const warehouseMadrid = await holded_invoicing_create_warehouse({
  name: "Madrid Warehouse",
  address: {
    address: "Polígono Industrial Sur",
    city: "Madrid",
    postalCode: "28021",
    country: "Spain"
  }
});

const warehouseBarcelona = await holded_invoicing_create_warehouse({
  name: "Barcelona Warehouse",
  address: {
    address: "Zona Franca",
    city: "Barcelona",
    postalCode: "08040",
    country: "Spain"
  }
});

// 2. Create a product
const product = await holded_invoicing_create_product({
  name: "Wireless Mouse MX Master",
  sku: "TECH-MOUSE-001",
  price: 89.99,
  tax: 21
});

// 3. Update stock across multiple warehouses
await holded_invoicing_update_product_stock({
  product_id: product.id,
  stock: {
    [warehouseMadrid.id]: {
      [product.id]: 150  // 150 units in Madrid
    },
    [warehouseBarcelona.id]: {
      [product.id]: 200  // 200 units in Barcelona
    }
  }
});

// 4. Check stock levels for a specific warehouse
const madridStock = await holded_invoicing_list_products_stock({
  warehouse_id: warehouseMadrid.id
});

// 5. Transfer stock between warehouses (reduce Madrid, increase Barcelona)
await holded_invoicing_update_product_stock({
  product_id: product.id,
  stock: {
    [warehouseMadrid.id]: {
      [product.id]: 125  // Reduced by 25
    },
    [warehouseBarcelona.id]: {
      [product.id]: 225  // Increased by 25
    }
  }
});
```

### Document Shipping Workflow

```typescript
// 1. Create a sales order
const salesOrder = await holded_invoicing_create_document({
  doc_type: "salesorder",
  contactId: "contact123",
  contactName: "Tech Store SL",
  date: 1730109600,
  items: [
    {
      name: "Laptop HP ProBook",
      sku: "LAPTOP-HP-001",
      units: 5,
      subtotal: 3500,
      tax: 21
    },
    {
      name: "USB-C Dock",
      sku: "DOCK-USBC-001", 
      units: 5,
      subtotal: 500,
      tax: 21
    }
  ],
  warehouseId: "warehouse_madrid_001"
});

// 2. Add tracking information
await holded_invoicing_update_document_tracking({
  doc_type: "salesorder",
  document_id: salesOrder.id,
  carrier: "DHL Express",
  trackingNumber: "1234567890",
  trackingUrl: "https://dhl.com/track/1234567890"
});

// 3. Ship all items at once
const shipment = await holded_invoicing_ship_all_items({
  document_id: salesOrder.id
});

// Alternative: Ship items line by line (partial shipments)
// await holded_invoicing_ship_items_by_line({
//   document_id: salesOrder.id,
//   lines: [
//     { lineId: "line1", units: 3 },  // Ship 3 laptops now
//     { lineId: "line2", units: 5 }   // Ship all docks now
//   ]
// });

// 4. Check shipped items
const shippedItems = await holded_invoicing_get_shipped_items({
  doc_type: "salesorder",
  document_id: salesOrder.id
});

// 5. Update pipeline stage
await holded_invoicing_update_document_pipeline({
  doc_type: "salesorder",
  document_id: salesOrder.id,
  pipelineStage: "shipped"
});

// 6. Create invoice from the sales order
const invoice = await holded_invoicing_create_document({
  doc_type: "invoice",
  contactId: "contact123",
  salesorderId: salesOrder.id,  // Link to sales order
  date: 1730196000
});
```

## Development

### Build from Source

If you want to build from source (for development or contributions):

```bash
git clone https://github.com/energio-es/holded-mcp.git
cd holded-mcp
npm install
npm run build
```

Then use the built server in your MCP client configuration:

```json
{
  "mcpServers": {
    "holded": {
      "command": "node",
      "args": ["/absolute/path/to/holded-mcp/dist/index.js"],
      "env": {
        "HOLDED_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode with auto-reload
npm run dev

# Clean build artifacts
npm run clean
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on the process for submitting pull requests.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (`git commit -m 'feat: add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Community & Governance

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Governance](GOVERNANCE.md)
- [Security Policy](SECURITY.md)

## Support

- **Holded API Documentation**: https://developers.holded.com/reference
- **Issues**: [GitHub Issues](https://github.com/energio-es/holded-mcp/issues) - *Response time: 1-2 weeks*
- **Discussions**: [GitHub Discussions](https://github.com/energio-es/holded-mcp/discussions)
- **Security**: [Report a Vulnerability](SECURITY.md) - *Response time: 72 hours*

