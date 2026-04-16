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

export const validTags = ['tag1', 'tag2', 'tag3'];

export const validCurrency = 'EUR';

export const validCurrencyUSD = 'USD';
