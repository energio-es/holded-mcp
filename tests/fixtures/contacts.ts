/**
 * Test fixtures for contact-related tests
 */

export const validContact = {
  name: 'Test Contact',
  email: 'test@example.com',
};

export const contactWithPhone = {
  ...validContact,
  phone: '+34123456789',
};

export const contactWithAddress = {
  ...validContact,
  address: {
    city: 'Madrid',
    postalCode: '28001',
  },
};

export const contactWithFullAddress = {
  ...validContact,
  address: {
    address: '123 Main St',
    city: 'Madrid',
    postalCode: '28001',
    province: 'Madrid',
    country: 'Spain',
    countryCode: 'ES',
  },
};

export const clientContact = {
  ...validContact,
  type: 'client' as const,
};

export const providerContact = {
  ...validContact,
  type: 'provider' as const,
};

export const invalidContactMissingName = {
  email: 'test@example.com',
};

export const invalidContactBadEmail = {
  name: 'Test Contact',
  email: 'not-an-email',
};
