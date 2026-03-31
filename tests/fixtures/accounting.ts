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

// Account Balances — date mode (default)
export const validAccountBalances = {
  start_date: '2025-01-01',
  end_date: '2025-12-31',
};

export const accountBalancesWithFilter = {
  start_date: '2025-01-01',
  end_date: '2025-12-31',
  account_filter: [62900001, 62900002],
  include_opening: true,
};

// Account Balances — raw timestamp mode
export const validAccountBalancesRaw = {
  starttmp: 1735686000,
  endtmp: 1767222000,
  raw_timestamps: true,
};

// Account Balances — invalid cases
export const invalidAccountBalancesEndBeforeStart = {
  start_date: '2025-12-31',
  end_date: '2025-01-01',
};

export const invalidAccountBalancesMissingStart = {
  end_date: '2025-12-31',
};

export const invalidAccountBalancesMissingEnd = {
  start_date: '2025-01-01',
};

export const invalidAccountBalancesMixedMode = {
  start_date: '2025-01-01',
  end_date: '2025-12-31',
  starttmp: 1735686000,
};
