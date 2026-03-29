/**
 * Test fixtures for payment-related tests
 */

export const validPayment = {
  doc_id: 'doc123',
  amount: 500.50,
  date: 1730109600,
};

export const invalidPaymentNegativeAmount = {
  doc_id: 'doc123',
  amount: -100,
  date: 1730109600,
};

export const invalidPaymentMissingAmount = {
  doc_id: 'doc123',
  date: 1730109600,
};

export const invalidPaymentMissingDocId = {
  amount: 500.50,
  date: 1730109600,
};
