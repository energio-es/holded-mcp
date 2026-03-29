# Holded MCP Server Tests

This directory contains automated tests for the Holded MCP server.

## Test Suites

### Schema Validation Tests (`schema-validation.test.ts`)

These tests validate that our Zod schemas match the official Holded API OpenAPI specifications. They ensure:

- **Required parameters** are correctly enforced
- **Parameter types** match API expectations (string, number, integer, object)
- **Optional parameters** are properly marked
- **Undocumented fields** have been removed
- **Error messages** use the correct Zod format

### Test Coverage

The tests cover critical schema fixes from the audit:

1. ✅ **Employee Creation** - Validates only documented fields (name, lastName, email, sendInvite)
2. ✅ **Task Creation** - Confirms undocumented fields removed (description, priority, etc.)
3. ✅ **Booking Creation** - Validates all required fields and custom fields structure
4. ✅ **Numbering Series** - Confirms format and last parameters
5. ✅ **Accounting Entry** - Validates account as integer (not string)
6. ✅ **Product Stock Update** - Validates nested object structure
7. ✅ **Employee Time Tracking** - Validates startTmp/endTmp as strings

## Running Tests

```bash
# Install Jest and dependencies
npm install --save-dev jest @jest/globals @types/jest ts-jest

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Adding New Tests

When adding new tests:

1. Import the schema from `src/schemas/`
2. Test required vs optional fields
3. Test type validation
4. Test error cases
5. Add descriptive test names

Example:

```typescript
describe('New Feature Schema', () => {
  it('should require specific fields', () => {
    const result = NewFeatureSchema.safeParse({});
    expect(result.success).toBe(false);
    // ... assertions
  });
});
```

## Test Philosophy

These tests serve as:

- **Documentation** of API requirements
- **Regression prevention** for schema changes
- **Validation** against OpenAPI specifications
- **Quality assurance** for type safety

All schemas should have corresponding tests that validate against the official Holded API documentation.
