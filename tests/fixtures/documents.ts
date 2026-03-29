/**
 * Test fixtures for document-related tests
 */

export const validDocumentItem = {
  name: 'Product 1',
  units: 2,
  subtotal: 100,
};

export const validDocument = {
  doc_type: 'invoice' as const,
  date: 1730109600,
  dueDate: 1730196000,
  items: [validDocumentItem],
};

export const documentWithMultipleItems = {
  doc_type: 'invoice' as const,
  date: 1730109600,
  dueDate: 1730196000,
  items: [
    { name: 'Product 1', units: 2, subtotal: 100 },
    { name: 'Product 2', units: 1, subtotal: 50 },
    { name: 'Service 1', units: 3, subtotal: 300 },
  ],
};

export const invalidDocumentEmptyItems = {
  doc_type: 'invoice' as const,
  date: 1730109600,
  dueDate: 1730196000,
  items: [], // Empty array should fail
};

export const invalidDocumentMissingItems = {
  doc_type: 'invoice' as const,
  date: 1730109600,
  dueDate: 1730196000,
};
