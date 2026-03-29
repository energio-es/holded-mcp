/**
 * Holded API base URLs for different modules
 * 
 * API Versions (as of 2026-02-04):
 * - Invoice API: v1.4
 * - CRM API: v1.0
 * - Projects API: v1.2
 * - Team API: v1.0.1
 * - Accounting API: v1.0.0
 */
export const API_BASE_URL = "https://api.holded.com/api";

/**
 * API version tracking for each Holded module
 * 
 * These versions correspond to the official Holded API documentation
 * and should be updated when API versions change.
 * 
 * @see https://developers.holded.com/reference
 */
export const API_VERSIONS = {
  /** Invoice API version */
  INVOICING: 'v1.4',
  /** CRM API version */
  CRM: 'v1.0',
  /** Projects API version */
  PROJECTS: 'v1.2',
  /** Team API version */
  TEAM: 'v1.0.1',
  /** Accounting API version */
  ACCOUNTING: 'v1.0.0'
} as const;

export const API_ENDPOINTS = {
  /** Invoice API v1.4 */
  INVOICING: `${API_BASE_URL}/invoicing/v1`,
  /** CRM API v1.0 */
  CRM: `${API_BASE_URL}/crm/v1`,
  /** Projects API v1.2 */
  PROJECTS: `${API_BASE_URL}/projects/v1`,
  /** Accounting API */
  ACCOUNTING: `${API_BASE_URL}/accounting/v1`,
  /** Team API v1.0.1 */
  TEAM: `${API_BASE_URL}/team/v1`,
} as const;

/**
 * Maximum response size in characters to prevent overwhelming responses
 */
export const CHARACTER_LIMIT = 25000;

/**
 * Available document types in Holded
 */
export const DOCUMENT_TYPES = [
  "invoice",
  "salesreceipt",
  "creditnote",
  "receiptnote",
  "estimate",
  "salesorder",
  "waybill",
  "proform",
  "purchase",
  "purchaserefund",
  "purchaseorder",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/**
 * Response format options
 */
export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}
