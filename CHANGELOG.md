# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Jest testing dependencies for comprehensive test coverage
- Integration tests for API client retry logic and error handling
- Debug mode via `HOLDED_DEBUG` environment variable for request logging
- Date format validation for employee `dateOfBirth` field (dd/mm/yyyy)
- Language enum validation for employee `mainLanguage` field with all 29 supported languages
- Comprehensive API client tests covering retry logic, error handling, and response formatting

### Changed
- Console logging for retry attempts now respects `HOLDED_DEBUG` flag to reduce noise in production
- Employee schema now validates date format and language values at input time

### Fixed
- Missing Jest dependencies in devDependencies

## [1.0.0] - 2026-02-04

### Added
- Complete MCP server implementation with 143 tools covering all Holded API endpoints
- Support for 5 modules: Invoicing, CRM, Projects, Accounting, and Team
- Comprehensive error handling with retry logic for transient failures
- Exponential backoff with jitter for API retries
- Response truncation for large payloads (25k character limit)
- Module selection via `HOLDED_MODULES` environment variable
- Pagination support for all list endpoints where API supports it
- TypeScript type definitions for all API entities
- Zod schema validation for all tool inputs
- Markdown and JSON response formats
- API version tracking for each module
- Comprehensive README with examples and workflows
- Schema validation tests

### Modules

#### Invoicing (76 endpoints)
- Contacts and Contact Groups management
- Products with stock control and variants
- Documents (12 types: invoices, estimates, purchases, etc.)
- Payments and treasury accounts
- Numbering series management
- Warehouses and sales channels
- Services and expenses accounts
- Tax information and remittances

#### CRM (27 endpoints)
- Leads with stages, notes, and tasks
- Sales funnels with custom stages
- Events and calendar management
- Bookings with location and slots

#### Projects (14 endpoints)
- Project management with summaries
- Task management
- Project time tracking

#### Accounting (5 endpoints)
- Chart of accounts management
- Daily ledger entries

#### Team (15 endpoints)
- Employee management
- Employee time tracking with clock in/out

### Technical Details
- Node.js >= 20 required
- TypeScript with strict mode
- MCP SDK ^1.25.3
- Axios ^1.13.2 for HTTP requests
- Zod ^4.3.5 for schema validation
- Automatic retry on 429, 500, 502, 503, 504 status codes
- Respects `Retry-After` header
- Maximum 3 retry attempts with exponential backoff

[Unreleased]: https://github.com/energio-es/holded-mcp/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/energio-es/holded-mcp/releases/tag/v1.0.0
