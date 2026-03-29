/**
 * Test fixtures for accounting-related tests
 */

export const validAccount = {
  prefix: 7000,
};

export const accountWithDetails = {
  prefix: 7000,
  name: 'Sales Account',
  color: '#FF0000',
};

export const invalidAccountThreeDigits = {
  prefix: 123, // Only 3 digits
};

export const invalidAccountInvalidColor = {
  prefix: 7000,
  color: 'red', // Invalid, should be hex
};

export const validEntryLine = {
  account: 4300,
  debit: 1000,
};

export const invalidEntryLineStringAccount = {
  account: '4300', // String instead of integer
  debit: 1000,
};

export const invalidEntryLineNegativeAccount = {
  account: -4300,
  debit: 1000,
};

export const validAccountingAccountList = {
  starttmp: 1730109600,
  endtmp: 1730196000,
};

export const invalidAccountingAccountListEndBeforeStart = {
  starttmp: 1730196000,
  endtmp: 1730109600, // End before start
};
