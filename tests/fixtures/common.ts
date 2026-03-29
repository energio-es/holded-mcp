/**
 * Test fixtures for common schemas (pagination, timestamps, etc.)
 */

export const validTimestamp = 1730109600;

export const invalidNegativeTimestamp = -1730109600;

export const validPagination = {
  page: 1,
};

export const paginationPage5 = {
  page: 5,
};

export const invalidPaginationZero = {
  page: 0,
};

export const validCustomField = {
  field: 'custom_field_name',
  value: 'custom_field_value',
};

export const validCustomFields = [
  { field: 'field1', value: 'value1' },
  { field: 'field2', value: 'value2' },
];

export const validTags = ['tag1', 'tag2', 'tag3'];

export const validCurrency = 'EUR';

export const validCurrencyUSD = 'USD';
