/**
 * Holded API client with authentication, error handling, and retry logic
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import FormDataLib from "form-data";
import { API_ENDPOINTS } from "../constants.js";

let apiKey: string | undefined;
let axiosInstance: AxiosInstance | undefined;

/**
 * Debug mode - set HOLDED_DEBUG=true to enable request logging
 */
const DEBUG = process.env.HOLDED_DEBUG === 'true';

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  /** Maximum number of retry attempts */
  maxRetries: 3,
  /** Initial delay in milliseconds before first retry */
  initialDelayMs: 1000,
  /** Maximum delay in milliseconds between retries */
  maxDelayMs: 10000,
  /** Multiplier for exponential backoff */
  backoffMultiplier: 2,
  /** HTTP status codes that should trigger a retry */
  retryableStatuses: [429, 500, 502, 503, 504],
};

/**
 * Rate limiting configuration
 * Set HOLDED_RATE_LIMIT_PER_SECOND to control request rate (default: 10 req/sec)
 */
const RATE_LIMIT_CONFIG = {
  /** Maximum requests per second (configurable via env) */
  requestsPerSecond: parseInt(process.env.HOLDED_RATE_LIMIT_PER_SECOND || '10', 10),
  /** Enabled by default, set HOLDED_DISABLE_RATE_LIMIT=true to disable */
  enabled: process.env.HOLDED_DISABLE_RATE_LIMIT !== 'true',
};

/**
 * Token bucket for rate limiting
 * Exported for testing purposes
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per millisecond

  constructor(requestsPerSecond: number) {
    this.capacity = requestsPerSecond;
    this.tokens = requestsPerSecond;
    this.lastRefill = Date.now();
    this.refillRate = requestsPerSecond / 1000; // tokens per ms
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Try to consume a token, wait if not available
   */
  async consume(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Calculate wait time for next token
    const tokensNeeded = 1 - this.tokens;
    const waitMs = Math.ceil(tokensNeeded / this.refillRate);
    
    if (DEBUG) {
      console.error(`[Rate Limit] Waiting ${waitMs}ms for next available token`);
    }

    await sleep(waitMs);
    
    // Refill and consume
    this.refill();
    this.tokens -= 1;
  }

  /**
   * Get current token count (for testing)
   */
  getTokens(): number {
    return this.tokens;
  }

  /**
   * Get capacity (for testing)
   */
  getCapacity(): number {
    return this.capacity;
  }
}

/**
 * Global rate limiter instance
 */
let rateLimiter: TokenBucket | null = null;

/**
 * Initialize rate limiter if enabled
 */
function getRateLimiter(): TokenBucket | null {
  if (!RATE_LIMIT_CONFIG.enabled) {
    return null;
  }
  
  if (!rateLimiter) {
    rateLimiter = new TokenBucket(RATE_LIMIT_CONFIG.requestsPerSecond);
  }
  
  return rateLimiter;
}

/**
 * Sleep for a specified number of milliseconds
 * Exported for testing purposes
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay for retry with exponential backoff and jitter
 * Exported for testing purposes
 */
export function calculateRetryDelay(attempt: number, retryAfterHeader?: string): number {
  // If server specifies Retry-After, use that
  if (retryAfterHeader) {
    const retryAfterSeconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(retryAfterSeconds)) {
      return retryAfterSeconds * 1000;
    }
  }

  // Exponential backoff with jitter
  const exponentialDelay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
  const delay = Math.min(exponentialDelay + jitter, RETRY_CONFIG.maxDelayMs);

  return Math.round(delay);
}

/**
 * Check if an error is retryable based on status code
 * Exported for testing purposes
 */
export function isRetryableError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status && RETRY_CONFIG.retryableStatuses.includes(status)) {
      return true;
    }
    // Also retry on network errors
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return true;
    }
  }
  return false;
}

/**
 * Get Retry-After header value if present
 * Exported for testing purposes
 */
export function getRetryAfterHeader(error: AxiosError): string | undefined {
  return error.response?.headers?.["retry-after"] as string | undefined;
}

/**
 * Initialize the API client with the Holded API key
 */
export function initializeApi(key: string): void {
  apiKey = key;
  axiosInstance = axios.create({
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      key: apiKey,
    },
  });
}

/**
 * Get the API key from environment or throw error
 */
export function getApiKey(): string {
  if (!apiKey) {
    const envKey = process.env.HOLDED_API_KEY;
    if (!envKey) {
      throw new Error(
        "HOLDED_API_KEY environment variable is required. " +
          "Get your API key from https://app.holded.com/api"
      );
    }
    initializeApi(envKey);
  }
  return apiKey!;
}

/**
 * Get the axios instance, initializing if needed
 */
function getAxiosInstance(): AxiosInstance {
  if (!axiosInstance) {
    getApiKey(); // This will initialize the instance
  }
  return axiosInstance!;
}

/**
 * API module types
 */
export type ApiModule = "invoicing" | "crm" | "projects" | "accounting" | "team";

/**
 * Get the base URL for a specific API module
 */
function getBaseUrl(module: ApiModule): string {
  switch (module) {
    case "invoicing":
      return API_ENDPOINTS.INVOICING;
    case "crm":
      return API_ENDPOINTS.CRM;
    case "projects":
      return API_ENDPOINTS.PROJECTS;
    case "accounting":
      return API_ENDPOINTS.ACCOUNTING;
    case "team":
      return API_ENDPOINTS.TEAM;
  }
}

/**
 * Make an API request to the Holded API with automatic retry for transient errors
 * 
 * Retries automatically on:
 * - 429 (Rate limit exceeded)
 * - 500, 502, 503, 504 (Server errors)
 * - Network timeout errors
 * 
 * Uses exponential backoff with jitter between retries.
 * Includes proactive rate limiting to prevent hitting API limits.
 */
export async function makeApiRequest<T>(
  module: ApiModule,
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: unknown,
  params?: Record<string, unknown>
): Promise<T> {
  const client = getAxiosInstance();
  const baseUrl = getBaseUrl(module);
  const url = `${baseUrl}/${endpoint}`;

  const config: AxiosRequestConfig = {
    method,
    url,
    params,
  };

  if (data && (method === "POST" || method === "PUT")) {
    config.data = data;
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Apply rate limiting before making request
      const limiter = getRateLimiter();
      if (limiter) {
        await limiter.consume();
      }

      const response = await client.request<T>(config);

      // Holded sometimes returns HTTP 200 with an HTML error page instead of
      // a proper JSON error response (e.g. for non-existent resources).
      // Detect this and throw so the normal error-handling path is used.
      if (typeof response.data === "string" && response.data.includes("<!DOCTYPE html>")) {
        throw new Error(
          `Unexpected HTML response from ${method} ${url}. ` +
          "The API returned an HTML page instead of JSON data. " +
          "This usually means the requested resource does not exist."
        );
      }

      return response.data;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt < RETRY_CONFIG.maxRetries && isRetryableError(error)) {
        const retryAfter = axios.isAxiosError(error) ? getRetryAfterHeader(error) : undefined;
        const delay = calculateRetryDelay(attempt, retryAfter);
        
        // Log retry attempt (only in debug mode)
        if (DEBUG) {
          const status = axios.isAxiosError(error) ? error.response?.status : "unknown";
          console.error(`[Holded API] Request failed with status ${status}, retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries})`);
        }
        
        await sleep(delay);
        continue;
      }

      // Not retryable or max retries exceeded
      throw error;
    }
  }

  // Should not reach here, but throw last error just in case
  throw lastError;
}

/**
 * Make a multipart/form-data API request for file uploads with automatic retry
 * 
 * Retries automatically on transient errors (rate limit, server errors).
 * Includes proactive rate limiting to prevent hitting API limits.
 */
export async function makeMultipartApiRequest<T>(
  module: ApiModule,
  endpoint: string,
  fileBuffer: Buffer,
  fileName: string,
  setMain?: boolean
): Promise<T> {
  const key = getApiKey();
  const baseUrl = getBaseUrl(module);
  const url = `${baseUrl}/${endpoint}`;

  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    // Create fresh FormData for each attempt (can't reuse after sending)
    const formData = new FormDataLib();
    formData.append("file", fileBuffer, fileName);
    if (setMain !== undefined) {
      formData.append("setMain", String(setMain));
    }

    // Create a new axios instance for multipart requests
    const client = axios.create({
      timeout: 60000, // Longer timeout for file uploads
      headers: {
        key,
        ...formData.getHeaders(), // This sets Content-Type with boundary
      },
    });

    try {
      // Apply rate limiting before making request
      const limiter = getRateLimiter();
      if (limiter) {
        await limiter.consume();
      }

      const response = await client.post<T>(url, formData);
      return response.data;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt < RETRY_CONFIG.maxRetries && isRetryableError(error)) {
        const retryAfter = axios.isAxiosError(error) ? getRetryAfterHeader(error) : undefined;
        const delay = calculateRetryDelay(attempt, retryAfter);
        
        if (DEBUG) {
          const status = axios.isAxiosError(error) ? error.response?.status : "unknown";
          console.error(`[Holded API] Multipart request failed with status ${status}, retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries})`);
        }
        
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Handle API errors and return user-friendly messages with actionable remediation hints
 * 
 * Error codes per Holded API documentation:
 * - 400: Bad request
 * - 401: Unauthorized (invalid API key)
 * - 403: Forbidden
 * - 404: Resource not found
 * - 409: Conflict
 * - 410: Gone (e.g., booking slot no longer available)
 * - 422: Validation failed
 * - 429: Rate limit exceeded
 * - 500: Server error
 */
export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string; info?: string; status?: number }>;

    if (axiosError.response) {
      const status = axiosError.response.status;
      const data = axiosError.response.data;
      const errorMessage = data?.message || data?.error || data?.info || "";
      const url = axiosError.config?.url || "";
      const method = axiosError.config?.method?.toUpperCase() || "";

      switch (status) {
        case 400:
          return `Error: Bad request to ${method} ${url}. ${errorMessage || "The request parameters are invalid."}\n\nRemediation:\n- Verify all required parameters are provided\n- Check parameter types match the API specification\n- Ensure date/timestamp formats are correct (Unix timestamps)\n- Review nested object structures (e.g., stock updates, addresses)`;
        
        case 401:
          return `Error: Unauthorized request to ${url}.\n\nRemediation:\n- Verify HOLDED_API_KEY environment variable is set correctly\n- Check your API key is valid at https://app.holded.com/api\n- Ensure the API key has not expired\n- Confirm you're using the correct key header format`;
        
        case 403:
          return `Error: Forbidden access to ${url}. ${errorMessage || "You don't have permission to access this resource."}\n\nRemediation:\n- Verify your API key has the necessary permissions\n- Check if your Holded account has access to this feature\n- Ensure the resource belongs to your organization\n- Contact Holded support if you believe you should have access`;
        
        case 404:
          return `Error: Resource not found at ${url}. ${errorMessage || "The requested resource does not exist."}\n\nRemediation:\n- Verify the ID is correct and exists in your Holded account\n- Use list endpoints to find valid IDs (e.g., holded_invoicing_list_contacts)\n- Check for typos in the ID parameter\n- Ensure the resource wasn't deleted\n- Confirm you're using the correct document type for documents`;
        
        case 409:
          return `Error: Conflict with ${method} ${url}. ${errorMessage || "The resource may already exist or conflicts with the current state."}\n\nRemediation:\n- Check if a resource with the same unique identifier already exists\n- Verify the resource hasn't been modified since you last read it\n- For numbering series, ensure the format doesn't conflict with existing series\n- Try using update instead of create if the resource exists`;
        
        case 410:
          // Specific error for booking slots - per Holded CRM API v1.0
          return `Error: Resource no longer available at ${url}. ${errorMessage || "The resource has been removed or is no longer accessible."}\n\nRemediation:\n- For bookings: Use holded_crm_get_available_slots to find current available time slots\n- The time slot may have been booked by another user\n- Try selecting a different date/time\n- Refresh your list of available resources`;
        
        case 422:
          return `Error: Validation failed for ${method} ${url}. ${errorMessage || "The request data is invalid."}\n\nRemediation:\n- Review the error message for specific field validation issues\n- Check required fields are present: ${errorMessage}\n- Verify field types (strings vs numbers, especially for timestamps)\n- For accounting entries: Ensure debits equal credits\n- For stock updates: Use correct nested object structure\n- For emails: Ensure email addresses are valid\n- For dates: Use Unix timestamps (seconds since epoch) as integers`;
        
        case 429:
          return `Error: Rate limit exceeded. ${errorMessage || "Too many requests sent to the API."}\n\nRemediation:\n- Wait a few seconds before retrying\n- The request will automatically retry with exponential backoff\n- Consider reducing request frequency\n- Adjust HOLDED_RATE_LIMIT_PER_SECOND environment variable (default: 10 req/sec)\n- Batch operations when possible to reduce API calls`;
        
        case 500:
          return `Error: Holded server error at ${url}. ${errorMessage || "An internal error occurred on the Holded server."}\n\nRemediation:\n- The request will automatically retry\n- Try again in a few moments\n- If the error persists, contact Holded support\n- Check Holded status page for any ongoing incidents`;
        
        case 502:
        case 503:
        case 504:
          return `Error: Holded service temporarily unavailable (${status}). ${errorMessage}\n\nRemediation:\n- The request will automatically retry with exponential backoff\n- Wait a few minutes and try again\n- Check if Holded is performing maintenance\n- Monitor Holded status page for service updates`;
        
        default:
          return `Error: API request failed with status ${status} for ${method} ${url}. ${errorMessage}\n\nRemediation:\n- Review the Holded API documentation for this endpoint\n- Check the API response for specific error details\n- Contact Holded support if the issue persists`;
      }
    } else if (axiosError.code === "ECONNABORTED") {
      return `Error: Request timed out after ${axiosError.config?.timeout || 30000}ms.\n\nRemediation:\n- The operation took too long to complete\n- For file uploads: Check file size is reasonable\n- Try again with a stable internet connection\n- If timeout persists, the Holded API may be slow - try during off-peak hours`;
    } else if (axiosError.code === "ENOTFOUND" || axiosError.code === "ECONNREFUSED") {
      return `Error: Unable to connect to Holded API.\n\nRemediation:\n- Check your internet connection\n- Verify DNS resolution is working\n- Check if you're behind a firewall or proxy\n- Ensure api.holded.com is accessible from your network\n- Try accessing https://api.holded.com in a browser`;
    }
  }

  return `Error: Unexpected error occurred: ${error instanceof Error ? error.message : String(error)}\n\nRemediation:\n- Check the error message above for details\n- Review your input parameters\n- Ensure all required dependencies are installed\n- Enable debug mode (HOLDED_DEBUG=true) for more details`;
}

/**
 * Format a successful response with optional truncation
 */
export function formatResponse<T>(
  data: T,
  characterLimit: number = 25000
): { text: string; truncated: boolean } {
  let text = JSON.stringify(data, null, 2);
  let truncated = false;

  if (text.length > characterLimit) {
    // Try to truncate the data array if it exists
    if (Array.isArray(data)) {
      const halfLength = Math.max(1, Math.floor(data.length / 2));
      const truncatedData = data.slice(0, halfLength);
      text = JSON.stringify(
        {
          data: truncatedData,
          truncated: true,
          message: `Response truncated from ${data.length} to ${halfLength} items. Use pagination parameters to see more results.`,
        },
        null,
        2
      );
      truncated = true;
    } else {
      const suffix = "\n... (response truncated)";
      text = text.substring(0, characterLimit - suffix.length) + suffix;
      truncated = true;
    }
  }

  return { text, truncated };
}

/**
 * Build pagination query parameters
 */
export function buildPaginationParams(
  page?: number
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (page !== undefined && page > 0) {
    params.page = page;
  }
  return params;
}

/**
 * Safely convert API response to Record<string, unknown> for structuredContent
 * Handles cases where API might return string, object, array, or other types
 */
export function toStructuredContent(response: unknown): Record<string, unknown> {
  if (typeof response === "string") {
    return { message: response, success: true };
  }
  if (response && typeof response === "object" && !Array.isArray(response)) {
    return response as Record<string, unknown>;
  }
  // For arrays or other types, wrap in a data property
  return { data: response, success: true };
}

/**
 * Reset internal state for testing purposes only
 */
export function _resetForTesting(): void {
  rateLimiter = null;
  axiosInstance = undefined;
  apiKey = undefined;
}
