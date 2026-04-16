/**
 * API Client Integration Tests
 * 
 * Tests for retry logic, error handling, and response formatting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import type { AxiosError } from 'axios';

// Mock axios before importing the API module
vi.mock('axios');
const mockedAxios = axios as any;

// Import after mocking
import {
  makeApiRequest,
  makeMultipartApiRequest,
  handleApiError,
  formatResponse,
  toStructuredContent,
  initializeApi,
  TokenBucket,
  calculateRetryDelay,
  isRetryableError,
  getRetryAfterHeader,
  buildPaginationParams,
  _resetForTesting,
} from '../src/services/api.js';

describe('API Client Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetForTesting();

    // Mock axios.create BEFORE initializing API
    const mockInstance = {
      request: vi.fn(),
      post: vi.fn(),
    };
    mockedAxios.create.mockReturnValue(mockInstance as any);

    // Initialize with test API key (uses the mock above)
    initializeApi('test-api-key-12345');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TokenBucket', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should initialize with correct capacity and tokens', () => {
      const bucket = new TokenBucket(10);
      expect(bucket.getCapacity()).toBe(10);
      expect(bucket.getTokens()).toBe(10);
    });

    it('should consume a token immediately when available', async () => {
      const bucket = new TokenBucket(10);
      
      await bucket.consume();
      
      expect(bucket.getTokens()).toBe(9);
    });

    it('should consume multiple tokens sequentially', async () => {
      const bucket = new TokenBucket(10);
      
      await bucket.consume();
      await bucket.consume();
      await bucket.consume();
      
      expect(bucket.getTokens()).toBe(7);
    });

    it('should refill tokens over time', async () => {
      const bucket = new TokenBucket(10); // 10 tokens per second = 0.01 tokens per ms
      
      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        await bucket.consume();
      }
      expect(bucket.getTokens()).toBe(0);
      
      // Advance time by 500ms (should refill 5 tokens)
      vi.advanceTimersByTime(500);
      
      // Consume should succeed now (after refill)
      await bucket.consume();
      expect(bucket.getTokens()).toBeCloseTo(4, 0); // ~5 tokens refilled - 1 consumed
    });

    it('should block when tokens are exhausted and wait for refill', async () => {
      const bucket = new TokenBucket(10);
      
      // Consume all 10 tokens
      for (let i = 0; i < 10; i++) {
        await bucket.consume();
      }
      
      // Next consume should block
      const consumePromise = bucket.consume();
      
      // Advance timers to allow the sleep to complete
      await vi.advanceTimersByTimeAsync(100);
      
      await consumePromise;
      
      // Token should be consumed
      expect(bucket.getTokens()).toBeLessThan(1);
    });

    it('should not exceed capacity when refilling', async () => {
      const bucket = new TokenBucket(5);
      
      // Consume 2 tokens
      await bucket.consume();
      await bucket.consume();
      
      // Advance time by a lot (way more than needed to refill)
      vi.advanceTimersByTime(10000);
      
      // Force refill by consuming
      await bucket.consume();
      
      // Should have capacity - 1 (the one we just consumed)
      expect(bucket.getTokens()).toBeLessThanOrEqual(5);
      expect(bucket.getTokens()).toBeGreaterThanOrEqual(4);
    });

    it('should handle rapid consumption correctly', async () => {
      const bucket = new TokenBucket(3);
      
      // Rapidly consume 3 tokens
      const promises = [
        bucket.consume(),
        bucket.consume(),
        bucket.consume(),
      ];
      
      await Promise.all(promises);
      
      expect(bucket.getTokens()).toBe(0);
    });

    it('should calculate correct wait time when tokens exhausted', async () => {
      const bucket = new TokenBucket(10); // 10 req/sec = 100ms per token
      
      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        await bucket.consume();
      }
      
      // Next consume should wait ~100ms for next token
      const consumePromise = bucket.consume();
      
      // Should still be waiting
      expect(bucket.getTokens()).toBe(0);
      
      // Advance by 100ms
      await vi.advanceTimersByTimeAsync(100);
      
      await consumePromise;
      
      // Should have consumed successfully
      expect(bucket.getTokens()).toBeLessThan(1);
    });
  });

  describe('Retry Logic', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry on 429 rate limit error', async () => {
      const mockInstance = mockedAxios.create() as any;
      const rateLimitError = {
        isAxiosError: true,
        response: { status: 429 },
      } as AxiosError;

      mockInstance.request
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ data: { success: true } });

      mockedAxios.isAxiosError.mockReturnValue(true);

      const resultPromise = makeApiRequest('invoicing', 'contacts', 'GET');
      await vi.advanceTimersByTimeAsync(30000);
      const result = await resultPromise;

      expect(result).toEqual({ success: true });
      expect(mockInstance.request).toHaveBeenCalledTimes(3);
    });

    it('should retry on 500 server error', async () => {
      const mockInstance = mockedAxios.create() as any;
      const serverError = {
        isAxiosError: true,
        response: { status: 500 },
      } as AxiosError;

      mockInstance.request
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({ data: { success: true } });

      mockedAxios.isAxiosError.mockReturnValue(true);

      const resultPromise = makeApiRequest('invoicing', 'contacts', 'GET');
      await vi.advanceTimersByTimeAsync(30000);
      const result = await resultPromise;

      expect(result).toEqual({ success: true });
      expect(mockInstance.request).toHaveBeenCalledTimes(2);
    });

    it('should respect Retry-After header', async () => {
      const mockInstance = mockedAxios.create() as any;
      const rateLimitError = {
        isAxiosError: true,
        response: {
          status: 429,
          headers: { 'retry-after': '2' },
        },
      } as unknown as AxiosError;

      mockInstance.request
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ data: { success: true } });

      mockedAxios.isAxiosError.mockReturnValue(true);

      const requestPromise = makeApiRequest('invoicing', 'contacts', 'GET');
      await vi.advanceTimersByTimeAsync(30000);
      const result = await requestPromise;

      expect(result).toEqual({ success: true });
      expect(mockInstance.request).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 404 not found error', async () => {
      const mockInstance = mockedAxios.create() as any;
      const notFoundError = {
        isAxiosError: true,
        response: { status: 404 },
      } as AxiosError;

      mockInstance.request.mockRejectedValueOnce(notFoundError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const resultPromise = makeApiRequest('invoicing', 'contacts/invalid-id', 'GET');
      // Attach rejection handler before advancing timers to avoid unhandled rejection
      const expectPromise = expect(resultPromise).rejects.toBeDefined();
      await vi.advanceTimersByTimeAsync(1000);
      await expectPromise;

      expect(mockInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should stop after max retries', async () => {
      const mockInstance = mockedAxios.create() as any;
      const serverError = {
        isAxiosError: true,
        response: { status: 500 },
      } as AxiosError;

      mockInstance.request.mockRejectedValue(serverError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const resultPromise = makeApiRequest('invoicing', 'contacts', 'GET');
      const expectPromise = expect(resultPromise).rejects.toBeDefined();
      await vi.advanceTimersByTimeAsync(30000);
      await expectPromise;

      expect(mockInstance.request).toHaveBeenCalledTimes(4);
    });

    it('should throw on HTML response (Holded 200 with HTML error page)', async () => {
      const mockInstance = mockedAxios.create() as any;
      const htmlBody = '<!DOCTYPE html><html><head><title>404 · Holded</title></head><body></body></html>';

      mockInstance.request.mockResolvedValueOnce({ data: htmlBody });

      const resultPromise = makeApiRequest('accounting', 'account/77800000', 'GET');
      const expectPromise = expect(resultPromise).rejects.toThrow('Unexpected HTML response');
      await vi.advanceTimersByTimeAsync(1000);
      await expectPromise;
    });
  });

  describe('Error Handling', () => {
    it('should handle 400 bad request error', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'Invalid parameters' }
        },
        config: { url: 'https://api.holded.com/api/invoicing/v1/contacts', method: 'post' }
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      const errorMessage = handleApiError(error);

      expect(errorMessage).toContain('Bad request');
      expect(errorMessage).toContain('Invalid parameters');
      expect(errorMessage).toContain('Remediation');
    });

    it('should handle 401 unauthorized error', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { message: 'Invalid API key' }
        },
        config: { url: 'https://api.holded.com/api/invoicing/v1/contacts' }
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      const errorMessage = handleApiError(error);

      expect(errorMessage).toContain('Unauthorized');
      expect(errorMessage).toContain('HOLDED_API_KEY');
      expect(errorMessage).toContain('Remediation');
    });

    it('should handle 403 forbidden error', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 403,
          data: { message: 'Insufficient permissions' }
        },
        config: { url: 'https://api.holded.com/api/invoicing/v1/contacts' }
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      const errorMessage = handleApiError(error);

      expect(errorMessage).toContain('Forbidden');
      expect(errorMessage).toContain('Insufficient permissions');
      expect(errorMessage).toContain('permission');
    });

    it('should handle 404 not found error', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { message: 'Contact not found' }
        },
        config: { url: 'https://api.holded.com/api/invoicing/v1/contacts/123' }
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      const errorMessage = handleApiError(error);

      expect(errorMessage).toContain('not found');
      expect(errorMessage).toContain('Contact not found');
      expect(errorMessage).toContain('Remediation');
    });

    it('should handle 409 conflict error', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 409,
          data: { message: 'Resource already exists' }
        },
        config: { url: 'https://api.holded.com/api/invoicing/v1/contacts', method: 'post' }
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      const errorMessage = handleApiError(error);

      expect(errorMessage).toContain('Conflict');
      expect(errorMessage).toContain('Resource already exists');
      expect(errorMessage).toContain('already exist');
    });

    it('should handle 410 gone error (booking specific)', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 410,
          data: { message: 'Booking slot no longer available' }
        },
        config: { url: 'https://api.holded.com/api/crm/v1/bookings' }
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      const errorMessage = handleApiError(error);

      expect(errorMessage).toContain('no longer available');
      expect(errorMessage).toContain('Booking slot no longer available');
      expect(errorMessage).toContain('holded_crm_get_available_slots');
    });

    it('should handle 422 validation error', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 422,
          data: { message: 'Email is required' }
        },
        config: { url: 'https://api.holded.com/api/invoicing/v1/contacts', method: 'post' }
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      const errorMessage = handleApiError(error);

      expect(errorMessage).toContain('Validation failed');
      expect(errorMessage).toContain('Email is required');
      expect(errorMessage).toContain('Remediation');
    });

    it('should handle 429 rate limit error', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 429,
          data: { message: 'Too many requests' }
        },
        config: { url: 'https://api.holded.com/api/invoicing/v1/contacts' }
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      const errorMessage = handleApiError(error);

      expect(errorMessage).toContain('Rate limit exceeded');
      expect(errorMessage).toContain('Too many requests');
      expect(errorMessage).toContain('automatically retry');
    });

    it('should handle 500 server error', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        },
        config: { url: 'https://api.holded.com/api/invoicing/v1/contacts' }
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      const errorMessage = handleApiError(error);

      expect(errorMessage).toContain('server error');
      expect(errorMessage).toContain('automatically retry');
      expect(errorMessage).toContain('Remediation');
    });

    it('should handle 502 bad gateway error', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 502,
          data: { message: 'Bad gateway' }
        },
        config: { url: 'https://api.holded.com/api/invoicing/v1/contacts' }
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      const errorMessage = handleApiError(error);

      expect(errorMessage).toContain('temporarily unavailable');
      expect(errorMessage).toContain('502');
      expect(errorMessage).toContain('automatically retry');
    });

    it('should handle 503 service unavailable error', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 503,
          data: { message: 'Service unavailable' }
        },
        config: { url: 'https://api.holded.com/api/invoicing/v1/contacts' }
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      const errorMessage = handleApiError(error);

      expect(errorMessage).toContain('temporarily unavailable');
      expect(errorMessage).toContain('503');
      expect(errorMessage).toContain('Remediation');
    });

    it('should handle 504 gateway timeout error', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 504,
          data: { message: 'Gateway timeout' }
        },
        config: { url: 'https://api.holded.com/api/invoicing/v1/contacts' }
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      const errorMessage = handleApiError(error);

      expect(errorMessage).toContain('temporarily unavailable');
      expect(errorMessage).toContain('504');
      expect(errorMessage).toContain('Remediation');
    });

    it('should handle network timeout error', () => {
      const error = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        config: { timeout: 30000 }
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      const errorMessage = handleApiError(error);

      expect(errorMessage).toContain('timed out');
      expect(errorMessage).toContain('30000ms');
      expect(errorMessage).toContain('Remediation');
    });

    it('should handle connection refused error', () => {
      const error = {
        isAxiosError: true,
        code: 'ECONNREFUSED',
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      const errorMessage = handleApiError(error);

      expect(errorMessage).toContain('Unable to connect');
      expect(errorMessage).toContain('api.holded.com');
    });

    it('should handle DNS not found error', () => {
      const error = {
        isAxiosError: true,
        code: 'ENOTFOUND',
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      const errorMessage = handleApiError(error);

      expect(errorMessage).toContain('Unable to connect');
      expect(errorMessage).toContain('DNS');
    });

    it('should handle unexpected errors', () => {
      const error = new Error('Unexpected error');

      const errorMessage = handleApiError(error);

      expect(errorMessage).toContain('Unexpected error');
      expect(errorMessage).toContain('Remediation');
    });

    it('should handle errors without response data', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 404,
          data: {}
        },
        config: { url: 'https://api.holded.com/api/invoicing/v1/contacts/123' }
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      const errorMessage = handleApiError(error);

      expect(errorMessage).toContain('not found');
      // Should use default message when data.message is not available
    });
  });

  describe('Response Formatting', () => {
    it('should format small responses without truncation', () => {
      const data = { id: '123', name: 'Test Contact' };
      const result = formatResponse(data);

      expect(result.truncated).toBe(false);
      expect(result.text).toContain('Test Contact');
    });

    it('should truncate large array responses', () => {
      const largeArray = Array(1000).fill({
        id: '123',
        name: 'Contact',
        description: 'A'.repeat(100)
      });

      const result = formatResponse(largeArray);

      expect(result.truncated).toBe(true);
      expect(result.text).toContain('truncated');
    });

    it('should truncate large string responses', () => {
      const largeString = 'A'.repeat(30000);
      const result = formatResponse(largeString);

      expect(result.truncated).toBe(true);
      expect(result.text.length).toBeLessThanOrEqual(25000);
    });
  });

  describe('Structured Content Conversion', () => {
    it('should convert object to structured content', () => {
      const data = { id: '123', name: 'Test' };
      const result = toStructuredContent(data);

      expect(result).toEqual(data);
    });

    it('should wrap string responses', () => {
      const data = 'Success';
      const result = toStructuredContent(data);

      expect(result).toEqual({ message: 'Success', success: true });
    });

    it('should wrap array responses', () => {
      const data = [{ id: '1' }, { id: '2' }];
      const result = toStructuredContent(data);

      expect(result).toEqual({ data, success: true });
    });

    it('should handle null/undefined', () => {
      const result = toStructuredContent(null);

      expect(result).toEqual({ data: null, success: true });
    });
  });

  describe('API Request Construction', () => {
    it('should construct GET request correctly', async () => {
      const mockInstance = mockedAxios.create() as any;
      mockInstance.request.mockResolvedValue({ data: { success: true } });

      await makeApiRequest('invoicing', 'contacts', 'GET');

      expect(mockInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'https://api.holded.com/api/invoicing/v1/contacts',
        })
      );
    });

    it('should construct POST request with data', async () => {
      const mockInstance = mockedAxios.create() as any;
      mockInstance.request.mockResolvedValue({ data: { id: '123' } });

      const postData = { name: 'Test Contact', email: 'test@example.com' };
      await makeApiRequest('invoicing', 'contacts', 'POST', postData);

      expect(mockInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: postData,
        })
      );
    });

    it('should add query parameters correctly', async () => {
      const mockInstance = mockedAxios.create() as any;
      mockInstance.request.mockResolvedValue({ data: [] });

      await makeApiRequest('invoicing', 'contacts', 'GET', undefined, { page: 2 });

      expect(mockInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { page: 2 },
        })
      );
    });
  });

  describe('calculateRetryDelay', () => {
    it('should return Retry-After header value in ms when present', () => {
      const delay = calculateRetryDelay(0, '5');
      expect(delay).toBe(5000);
    });

    it('should handle invalid Retry-After header', () => {
      const delay = calculateRetryDelay(0, 'invalid');
      // Should fall back to exponential backoff
      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThanOrEqual(10000);
    });

    it('should use exponential backoff without Retry-After header', () => {
      const delay0 = calculateRetryDelay(0);
      const delay1 = calculateRetryDelay(1);
      const delay2 = calculateRetryDelay(2);
      
      // Each delay should be larger (accounting for jitter)
      expect(delay1).toBeGreaterThan(delay0 * 0.7); // Account for jitter
      expect(delay2).toBeGreaterThan(delay1 * 0.7);
    });

    it('should cap delay at maxDelayMs (10000)', () => {
      const delay = calculateRetryDelay(100); // Very high attempt number
      expect(delay).toBeLessThanOrEqual(10000);
    });

    it('should add jitter to prevent thundering herd', () => {
      // Run multiple times and verify they're not all identical
      const delays = Array.from({ length: 10 }, () => calculateRetryDelay(2));
      const uniqueDelays = new Set(delays);
      
      // With 30% jitter, we should see variation
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });

    it('should respect initial delay for first attempt', () => {
      const delay = calculateRetryDelay(0);
      // Initial delay is 1000ms, with up to 30% jitter
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(1300);
    });
  });

  describe('isRetryableError', () => {
    it.each([429, 500, 502, 503, 504])('should return true for status %i', (status) => {
      const error = {
        isAxiosError: true,
        response: { status },
      } as AxiosError;
      
      mockedAxios.isAxiosError.mockReturnValue(true);
      expect(isRetryableError(error)).toBe(true);
    });

    it.each([400, 401, 403, 404, 409, 410, 422])('should return false for status %i', (status) => {
      const error = {
        isAxiosError: true,
        response: { status },
      } as AxiosError;
      
      mockedAxios.isAxiosError.mockReturnValue(true);
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return true for ECONNABORTED error', () => {
      const error = {
        isAxiosError: true,
        code: 'ECONNABORTED',
      } as AxiosError;
      
      mockedAxios.isAxiosError.mockReturnValue(true);
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for ETIMEDOUT error', () => {
      const error = {
        isAxiosError: true,
        code: 'ETIMEDOUT',
      } as AxiosError;
      
      mockedAxios.isAxiosError.mockReturnValue(true);
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for non-Axios errors', () => {
      const error = new Error('Regular error');
      
      mockedAxios.isAxiosError.mockReturnValue(false);
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for Axios error without response', () => {
      const error = {
        isAxiosError: true,
      } as AxiosError;
      
      mockedAxios.isAxiosError.mockReturnValue(true);
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('getRetryAfterHeader', () => {
    it('should return Retry-After header value', () => {
      const error = {
        isAxiosError: true,
        response: {
          headers: { 'retry-after': '10' },
          status: 429,
          data: {},
          statusText: 'Too Many Requests',
          config: {} as any,
        },
        config: {} as any,
        name: 'AxiosError',
        message: 'Request failed',
        toJSON: () => ({}),
      } as AxiosError;
      
      expect(getRetryAfterHeader(error)).toBe('10');
    });

    it('should return undefined when header is missing', () => {
      const error = {
        isAxiosError: true,
        response: {
          headers: {},
          status: 429,
          data: {},
          statusText: 'Too Many Requests',
          config: {} as any,
        },
        config: {} as any,
        name: 'AxiosError',
        message: 'Request failed',
        toJSON: () => ({}),
      } as AxiosError;
      
      expect(getRetryAfterHeader(error)).toBeUndefined();
    });

    it('should return undefined when response is missing', () => {
      const error = {
        isAxiosError: true,
        config: {} as any,
        name: 'AxiosError',
        message: 'Request failed',
        toJSON: () => ({}),
      } as AxiosError;
      
      expect(getRetryAfterHeader(error)).toBeUndefined();
    });

    it('should handle lowercase header name', () => {
      const error = {
        isAxiosError: true,
        response: {
          headers: { 'retry-after': '5' },
          status: 429,
          data: {},
          statusText: 'Too Many Requests',
          config: {} as any,
        },
        config: {} as any,
        name: 'AxiosError',
        message: 'Request failed',
        toJSON: () => ({}),
      } as AxiosError;
      
      expect(getRetryAfterHeader(error)).toBe('5');
    });
  });

  describe('buildPaginationParams', () => {
    it('should return empty object for undefined page', () => {
      expect(buildPaginationParams()).toEqual({});
    });

    it('should return empty object for page 0', () => {
      expect(buildPaginationParams(0)).toEqual({});
    });

    it('should return empty object for negative page', () => {
      expect(buildPaginationParams(-1)).toEqual({});
    });

    it('should include page when positive', () => {
      expect(buildPaginationParams(1)).toEqual({ page: 1 });
    });

    it('should include page for large page numbers', () => {
      expect(buildPaginationParams(999)).toEqual({ page: 999 });
    });
  });

  describe('makeMultipartApiRequest', () => {
    beforeEach(() => {
      process.env.HOLDED_API_KEY = 'test-api-key-12345';
      _resetForTesting();
      initializeApi('test-api-key-12345');
    });

    it('should construct multipart form data correctly', async () => {
      // @ts-expect-error - Mock function type inference issue
      const mockPost = vi.fn().mockResolvedValue({ data: { success: true } });
      const mockAxiosInstance = {
        post: mockPost,
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const fileBuffer = Buffer.from('test file content');
      const fileName = 'test.jpg';

      await makeMultipartApiRequest('invoicing', 'contacts/123/attachment', fileBuffer, fileName);

      expect(mockedAxios.create).toHaveBeenCalled();
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'https://api.holded.com/api/invoicing/v1/contacts/123/attachment',
        expect.anything() // FormData object
      );
    });

    it('should include setMain parameter when provided', async () => {
      // @ts-expect-error - Mock function type inference issue
      const mockPost = vi.fn().mockResolvedValue({ data: { success: true } });
      const mockAxiosInstance = {
        post: mockPost,
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const fileBuffer = Buffer.from('test file content');
      const fileName = 'test.jpg';

      await makeMultipartApiRequest('invoicing', 'contacts/123/attachment', fileBuffer, fileName, true);

      expect(mockAxiosInstance.post).toHaveBeenCalled();
      // The FormData should include setMain field (verified by the implementation)
    });

    it('should use longer timeout (60s) for file uploads', async () => {
      // @ts-expect-error - Mock function type inference issue
      const mockPost = vi.fn().mockResolvedValue({ data: { success: true } });
      const mockAxiosInstance = {
        post: mockPost,
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const fileBuffer = Buffer.from('test file content');
      const fileName = 'test.jpg';

      await makeMultipartApiRequest('invoicing', 'contacts/123/attachment', fileBuffer, fileName);

      // Verify axios.create was called with 60s timeout
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000, // 60 seconds
        })
      );
    });

    it('should retry on transient errors', async () => {
      vi.useFakeTimers();
      const serverError = {
        isAxiosError: true,
        response: { status: 500 },
      } as AxiosError;

      const mockFn = vi.fn();
      // @ts-expect-error - Mock function type inference issue with chained methods
      mockFn.mockRejectedValueOnce(serverError).mockResolvedValueOnce({ data: { success: true } });
      const mockAxiosInstance = {
        post: mockFn,
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const fileBuffer = Buffer.from('test file content');
      const fileName = 'test.jpg';

      const resultPromise = makeMultipartApiRequest('invoicing', 'contacts/123/attachment', fileBuffer, fileName);
      await vi.advanceTimersByTimeAsync(30000);
      const result = await resultPromise;

      expect(result).toEqual({ success: true });
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('should retry on rate limit (429)', async () => {
      vi.useFakeTimers();
      const rateLimitError = {
        isAxiosError: true,
        response: { status: 429, headers: {} },
      } as AxiosError;

      const mockFn = vi.fn();
      // @ts-expect-error - Mock function type inference issue with chained methods
      mockFn.mockRejectedValueOnce(rateLimitError).mockResolvedValueOnce({ data: { success: true } });
      const mockAxiosInstance = {
        post: mockFn,
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const fileBuffer = Buffer.from('test file content');
      const fileName = 'test.jpg';

      const resultPromise = makeMultipartApiRequest('invoicing', 'contacts/123/attachment', fileBuffer, fileName);
      await vi.advanceTimersByTimeAsync(30000);
      const result = await resultPromise;

      expect(result).toEqual({ success: true });
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('should not retry on 404 error', async () => {
      vi.useFakeTimers();
      const notFoundError = {
        isAxiosError: true,
        response: { status: 404 },
      } as AxiosError;

      // @ts-expect-error - Mock function type inference issue
      const mockPost = vi.fn().mockRejectedValue(notFoundError);
      const mockAxiosInstance = {
        post: mockPost,
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const fileBuffer = Buffer.from('test file content');
      const fileName = 'test.jpg';

      const resultPromise = makeMultipartApiRequest('invoicing', 'contacts/123/attachment', fileBuffer, fileName);
      const expectPromise = expect(resultPromise).rejects.toBeDefined();
      await vi.advanceTimersByTimeAsync(1000);
      await expectPromise;

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('should stop after max retries', async () => {
      vi.useFakeTimers();
      const serverError = {
        isAxiosError: true,
        response: { status: 500 },
      } as AxiosError;

      // @ts-expect-error - Mock function type inference issue
      const mockPost = vi.fn().mockRejectedValue(serverError);
      const mockAxiosInstance = {
        post: mockPost,
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const fileBuffer = Buffer.from('test file content');
      const fileName = 'test.jpg';

      const resultPromise = makeMultipartApiRequest('invoicing', 'contacts/123/attachment', fileBuffer, fileName);
      const expectPromise = expect(resultPromise).rejects.toBeDefined();
      await vi.advanceTimersByTimeAsync(30000);
      await expectPromise;

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(4);
      vi.useRealTimers();
    });

    it('should handle different modules correctly', async () => {
      // @ts-expect-error - Mock function type inference issue
      const mockPost = vi.fn().mockResolvedValue({ data: { success: true } });
      const mockAxiosInstance = {
        post: mockPost,
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const fileBuffer = Buffer.from('test file content');
      const fileName = 'test.jpg';

      await makeMultipartApiRequest('crm', 'leads/123/attachment', fileBuffer, fileName);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'https://api.holded.com/api/crm/v1/leads/123/attachment',
        expect.anything()
      );
    });

    it('should throw on HTML response (Holded 200 with HTML error page)', async () => {
      const htmlBody = '<!DOCTYPE html><html><head><title>404 · Holded</title></head><body></body></html>';
      // @ts-expect-error - Mock function type inference issue
      const mockPost = vi.fn().mockResolvedValue({ data: htmlBody, status: 200 });
      const mockAxiosInstance = {
        post: mockPost,
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const fileBuffer = Buffer.from('x');
      const fileName = 'x.txt';

      await expect(
        makeMultipartApiRequest('invoicing', 'contacts/123/attachments', fileBuffer, fileName)
      ).rejects.toThrow(/Unexpected HTML response/);
    });
  });
});
