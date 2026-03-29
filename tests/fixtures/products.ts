/**
 * Test fixtures for product-related tests
 */

export const validProduct = {
  name: 'Test Product',
};

export const productWithPrice = {
  name: 'Test Product',
  sku: 'PROD-001',
  price: 99.99,
  kind: 'product' as const,
};

export const invalidProductNegativePrice = {
  name: 'Test Product',
  price: -10,
};

export const invalidProductMissingName = {
  price: 99.99,
};

export const validService = {
  name: 'Consulting Service',
};

export const serviceWithDetails = {
  name: 'Consulting Service',
  desc: 'Professional consulting',
  tax: 21,
  subtotal: 15000,
};

export const validStockUpdate = {
  product_id: 'prod123',
  stock: {
    'warehouse1': {
      'prod123': 100,
      'variant1': 50,
    },
    'warehouse2': {
      'prod123': 75,
    },
  },
};

export const invalidStockUpdateSimpleNumber = {
  product_id: 'prod123',
  stock: 100, // Should be nested object, not number
};
