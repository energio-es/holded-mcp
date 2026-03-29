/**
 * Test fixtures for error scenarios
 */

import type { AxiosError } from 'axios';

export const create400Error = (message = 'Invalid parameters'): AxiosError => ({
  isAxiosError: true,
  response: {
    status: 400,
    data: { message },
    statusText: 'Bad Request',
    headers: {},
    config: {} as any,
  },
  config: { url: 'https://api.holded.com/api/invoicing/v1/contacts', method: 'post' } as any,
  name: 'AxiosError',
  message: 'Request failed with status code 400',
  toJSON: () => ({}),
});

export const create401Error = (message = 'Invalid API key'): AxiosError => ({
  isAxiosError: true,
  response: {
    status: 401,
    data: { message },
    statusText: 'Unauthorized',
    headers: {},
    config: {} as any,
  },
  config: { url: 'https://api.holded.com/api/invoicing/v1/contacts' } as any,
  name: 'AxiosError',
  message: 'Request failed with status code 401',
  toJSON: () => ({}),
});

export const create403Error = (message = 'Insufficient permissions'): AxiosError => ({
  isAxiosError: true,
  response: {
    status: 403,
    data: { message },
    statusText: 'Forbidden',
    headers: {},
    config: {} as any,
  },
  config: { url: 'https://api.holded.com/api/invoicing/v1/contacts' } as any,
  name: 'AxiosError',
  message: 'Request failed with status code 403',
  toJSON: () => ({}),
});

export const create404Error = (message = 'Resource not found'): AxiosError => ({
  isAxiosError: true,
  response: {
    status: 404,
    data: { message },
    statusText: 'Not Found',
    headers: {},
    config: {} as any,
  },
  config: { url: 'https://api.holded.com/api/invoicing/v1/contacts/123' } as any,
  name: 'AxiosError',
  message: 'Request failed with status code 404',
  toJSON: () => ({}),
});

export const create422Error = (message = 'Validation failed'): AxiosError => ({
  isAxiosError: true,
  response: {
    status: 422,
    data: { message },
    statusText: 'Unprocessable Entity',
    headers: {},
    config: {} as any,
  },
  config: { url: 'https://api.holded.com/api/invoicing/v1/contacts', method: 'post' } as any,
  name: 'AxiosError',
  message: 'Request failed with status code 422',
  toJSON: () => ({}),
});

export const create429Error = (retryAfter?: string): AxiosError => ({
  isAxiosError: true,
  response: {
    status: 429,
    data: { message: 'Too many requests' },
    statusText: 'Too Many Requests',
    headers: retryAfter ? { 'retry-after': retryAfter } : {},
    config: {} as any,
  },
  config: { url: 'https://api.holded.com/api/invoicing/v1/contacts' } as any,
  name: 'AxiosError',
  message: 'Request failed with status code 429',
  toJSON: () => ({}),
});

export const create500Error = (message = 'Internal server error'): AxiosError => ({
  isAxiosError: true,
  response: {
    status: 500,
    data: { message },
    statusText: 'Internal Server Error',
    headers: {},
    config: {} as any,
  },
  config: { url: 'https://api.holded.com/api/invoicing/v1/contacts' } as any,
  name: 'AxiosError',
  message: 'Request failed with status code 500',
  toJSON: () => ({}),
});

export const createTimeoutError = (): AxiosError => ({
  isAxiosError: true,
  code: 'ECONNABORTED',
  config: { timeout: 30000 } as any,
  name: 'AxiosError',
  message: 'timeout of 30000ms exceeded',
  toJSON: () => ({}),
});

export const createConnectionRefusedError = (): AxiosError => ({
  isAxiosError: true,
  code: 'ECONNREFUSED',
  config: {} as any,
  name: 'AxiosError',
  message: 'connect ECONNREFUSED',
  toJSON: () => ({}),
});
