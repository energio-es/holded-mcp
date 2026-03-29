/**
 * Test fixtures for address-related tests
 */

export const emptyAddress = {};

export const partialAddress = {
  city: 'Madrid',
  postalCode: '28001',
};

export const fullAddress = {
  address: '123 Main St',
  city: 'Madrid',
  postalCode: '28001',
  province: 'Madrid',
  country: 'Spain',
  countryCode: 'ES',
};

export const addressWithStreetOnly = {
  address: '456 Oak Avenue',
};

export const addressWithCityState = {
  city: 'Barcelona',
  province: 'Barcelona',
  country: 'Spain',
};
