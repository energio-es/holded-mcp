/**
 * TypeScript type definitions for Holded API entities
 * 
 * API Versions targeted:
 * - Invoice API: v1.4
 * - CRM API: v1.0
 * - Projects API: v1.2
 * - Team API: v1.0.1
 * 
 * Documentation: https://developers.holded.com/reference
 * Last updated: 2026-02-04
 * 
 * DEPRECATION NOTICE:
 * Some type fields are marked with @deprecated. These fields exist for backwards
 * compatibility with existing code but may not be returned by the actual Holded API.
 * 
 * Migration guide:
 * - Project: Use 'desc' instead of 'description', 'price' instead of 'budget',
 *   'date' instead of 'startDate', 'dueDate' instead of 'endDate'
 * - Task: Use 'desc' instead of 'description', 'userId' instead of 'assignedTo',
 *   'status' (number) instead of 'priority' (string)
 * - ProjectLabel: Use 'id' instead of 'labelId', 'name' instead of 'labelName',
 *   'color' instead of 'labelColor'
 * - Booking: Use 'customFieldsValues' or 'customFields' instead of legacy fields
 * 
 * These deprecated fields will be removed in the next major version.
 */

// Contact types
export interface Contact {
  id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  type?: string;
  iban?: string;
  swift?: string;
  groupId?: string;
  tradeName?: string;
  clientRecord?: number;
  supplierRecord?: number;
  billAddress?: Address;
  customFields?: CustomField[];
  defaults?: ContactDefaults;
  socialNetworks?: SocialNetworks;
  tags?: string[];
  notes?: string;
  isperson?: boolean;
  vatnumber?: string;
  currency?: string;
  language?: string;
  paymentDay?: number;
  paymentExpDays?: number;
  paymentExpMonth?: number;
  paymentMethod?: string;
  salesChannel?: string;
  shippingAddresses?: Address[];
}

export interface Address {
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;
  countryCode?: string;
}

export interface CustomField {
  field: string;
  value: string;
}

export interface ContactDefaults {
  salesChannel?: string;
  paymentMethod?: string;
  paymentDay?: number;
  dueDays?: number;
}

export interface SocialNetworks {
  website?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
}

// Contact Group types
export interface ContactGroup {
  id: string;
  name: string;
  desc?: string;
  color?: string;
  pos?: number;
}

// Product types
export interface Product {
  id: string;
  name: string;
  sku?: string;
  kind?: "product" | "service" | "pack";
  type?: string;
  desc?: string;
  price?: number;
  costPrice?: number;
  tax?: string;
  stock?: number;
  stockControl?: boolean;
  barcode?: string;
  weight?: number;
  packQuantity?: number;
  packProducts?: PackProduct[];
  tags?: string[];
  variants?: ProductVariant[];
  customFields?: CustomField[];
}

export interface PackProduct {
  productId: string;
  quantity: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  price?: number;
  costPrice?: number;
  stock?: number;
}

export interface ProductStock {
  productId: string;
  name: string;
  sku?: string;
  stock: number;
  warehouses?: WarehouseStock[];
}

export interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  stock: number;
}

export interface Warehouse {
  id: string;
  name: string;
  address?: Address;
  active?: boolean;
  [key: string]: unknown;
}

// Document types
/**
 * Strict union type for all available document types
 * Per holded_docs/documents.md
 */
export type DocumentType = 
  | 'invoice'        // Sales invoices
  | 'salesreceipt'   // Sales receipts
  | 'creditnote'     // Sales refunds
  | 'receiptnote'    // Ticket sales refunds
  | 'estimate'       // Sales estimates/quotes
  | 'salesorder'     // Sales orders
  | 'waybill'        // Packing lists
  | 'proform'        // Proforma invoices
  | 'purchase'       // Purchases
  | 'purchaserefund' // Purchase refunds
  | 'purchaseorder'; // Purchase orders

export interface Document {
  id: string;
  docType: string;
  docNumber?: string;
  contact?: string;
  contactId?: string;
  contactName?: string;
  date?: number;
  dueDate?: number;
  status?: string;
  currency?: string;
  currencyChange?: number;
  subtotal?: number;
  tax?: number;
  total?: number;
  items?: DocumentItem[];
  notes?: string;
  tags?: string[];
  paid?: boolean;
  paidAmount?: number;
  salesChannel?: string;
  customFields?: CustomField[];
}

export interface DocumentItem {
  name: string;
  desc?: string;
  units?: number;
  subtotal?: number;
  tax?: string;
  discount?: number;
  productId?: string;
  sku?: string;
  weight?: number;
  accountingAccount?: string;
}

// Payment types
export interface Payment {
  id: string;
  docId: string;
  amount: number;
  date: number;
  accountId?: string;
  desc?: string;
}

/**
 * Treasury type - matches Holded Invoice API v1.4 response
 */
export interface Treasury {
  id: string;
  name: string;
  type: string;
  balance?: number;
  accountNumber?: number;
  iban?: string;
  swift?: string;
  bank?: string;
  bankname?: string;
  /** @deprecated Not in API response - may not be returned by the API */
  currency?: string;
}

// Numbering Series types
export interface NumberingSeries {
  id: string;
  name: string;
  prefix?: string;
  suffix?: string;
  nextNumber: number;
  docType: string;
}

// CRM types
export interface Lead {
  id: string;
  name: string;
  funnelId?: string;
  stageId?: string;
  contactId?: string;
  contactName?: string;
  potential?: number;
  currency?: string;
  status?: string;
  probability?: number;
  expectedCloseDate?: number;
  assignedTo?: string;
  notes?: string;
  tags?: string[];
  customFields?: CustomField[];
}

export interface LeadNote {
  id: string;
  leadId: string;
  content: string;
  createdAt: number;
  createdBy?: string;
}

export interface LeadTask {
  id: string;
  leadId: string;
  name: string;
  description?: string;
  dueDate?: number;
  completed?: boolean;
  assignedTo?: string;
}

export interface Funnel {
  id: string;
  name: string;
  stages?: FunnelStage[];
}

export interface FunnelStage {
  id: string;
  name: string;
  order: number;
  probability?: number;
}

export interface CrmEvent {
  id: string;
  name: string;
  description?: string;
  start: number;
  end?: number;
  allDay?: boolean;
  leadId?: string;
  contactId?: string;
  assignedTo?: string;
}

/**
 * Amount with currency type for booking service pricing
 */
export interface BookingAmount {
  amount: number;
  currency: string;
}

/**
 * Booking service nested type
 * Per Holded CRM API v1.0
 * 
 * Note: API may return subtotal/total as either object or array of objects
 */
export interface BookingService {
  id: string;
  name: string;
  description?: string;
  duration: number;
  subtotal?: BookingAmount | BookingAmount[];
  total?: BookingAmount | BookingAmount[];
}

/**
 * Booking space nested type
 * Per Holded CRM API v1.0
 */
export interface BookingSpace {
  id: string;
  name: string;
}

/**
 * Booking outcome nested type
 * Per Holded CRM API v1.0
 */
export interface BookingOutcome {
  documentId: string;
  type: string;
  exportedAt: number;
}

/**
 * Booking custom field value nested type
 * Per Holded CRM API v1.0
 */
export interface BookingCustomFieldValue {
  key: string;
  label: string;
  type: string;
  value: string;
}

/**
 * Booking type - matches Holded CRM API v1.0 response
 * 
 * Note: The API returns startTime/endTime, NOT start/end
 * Note: API may return custom fields as either 'customFieldsValues' (schema) or 'customFields' (example)
 */
export interface Booking {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  createdAt: number;
  updatedAt: number;
  status: string;
  service: BookingService | BookingService[];
  space?: BookingSpace | BookingSpace[];
  outcome?: BookingOutcome | BookingOutcome[];
  /** Custom fields - schema field name */
  customFieldsValues?: BookingCustomFieldValue[];
  /** Custom fields - alternative field name used in some API responses */
  customFields?: BookingCustomFieldValue[];
  // Legacy fields kept for backwards compatibility (may not be in API response)
  /** @deprecated Use customFieldsValues or customFields instead */
  name?: string;
  /** @deprecated Not in API response */
  locationId?: string;
  /** @deprecated Not in API response */
  contactId?: string;
  /** @deprecated Not in API response */
  contactName?: string;
  /** @deprecated Not in API response */
  notes?: string;
}

/**
 * Booking location type - matches Holded CRM API v1.0 response
 * Per holded_docs/list-locations.md
 */
export interface BookingLocation {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
  availableServices?: string[];
}

/**
 * Booking slot type for available time slots
 * Per holded_docs/get-available-slots-for-location.md
 */
export interface BookingSlot {
  dateTime: number;
  from: string;    // ISO 8601 format
  to: string;      // ISO 8601 format
  duration: number; // seconds
}

/**
 * Create booking API response type
 * Per holded_docs/create-booking.md
 */
export interface CreateBookingResponse {
  status: number;
  id: string;
}

/**
 * Cancel booking API response type
 * Per holded_docs/cancel-booking.md
 */
export interface CancelBookingResponse {
  status: number;
  info: string;
  id: string;
}

/**
 * Project list item nested type
 * Per Holded Projects API v1.2
 */
export interface ProjectList {
  listId?: string;
  id?: string;
  key: string;
  name: string;
  desc?: string;
}

/**
 * Project label nested type
 * Per Holded Projects API v1.2
 */
export interface ProjectLabel {
  id: string;
  name: string;
  color: string;
  /** @deprecated Use id instead */
  labelId?: string;
  /** @deprecated Use name instead */
  labelName?: string;
  /** @deprecated Use color instead */
  labelColor?: string;
}

/**
 * Project document reference nested type
 * Per Holded Projects API v1.2
 */
export interface ProjectDocumentRef {
  docId: string;
  type: string;
  subtotal: number;
  desc?: string;
  invoiceNum?: string;
  total: number;
  contactId?: string;
  contactName?: string;
  date: number;
  dueDate?: number;
}

/**
 * Project time tracking nested type
 * Per Holded Projects API v1.2
 */
export interface ProjectTimeTrackingRef {
  timeId: string;
  time: number;
  desc?: string;
  costHour: number;
  userId?: string;
  taskId?: string;
  total: number;
}

/**
 * Project type - matches Holded Projects API v1.2 response
 * 
 * Note: The API uses 'desc' not 'description', 'date' not 'startDate', 
 * 'dueDate' not 'endDate', 'price' not 'budget'
 */
export interface Project {
  id: string;
  name: string;
  desc?: string;
  tags?: string[];
  category?: number;
  contactId?: string;
  contactName?: string;
  date?: number;
  dueDate?: number;
  status?: number;
  lists?: ProjectList[];
  billable?: number;
  expenses?: ProjectDocumentRef | ProjectDocumentRef[];
  estimates?: ProjectDocumentRef[];
  sales?: ProjectDocumentRef[];
  timeTracking?: ProjectTimeTrackingRef | ProjectTimeTrackingRef[];
  price?: number;
  numberOfTasks?: number;
  completedTasks?: number;
  labels?: ProjectLabel[];
  // Legacy field names kept for backwards compatibility with existing code
  /** @deprecated Use desc instead */
  description?: string;
  /** @deprecated Use price instead */
  budget?: number;
  /** @deprecated Not in API response */
  currency?: string;
  /** @deprecated Use date instead */
  startDate?: number;
  /** @deprecated Use dueDate instead - this is the actual API field name */
  endDate?: number;
  /** @deprecated Not in API response */
  assignedTo?: string;
  customFields?: CustomField[];
}

export interface ProjectSummary {
  projectId: string;
  totalHours?: number;
  totalCost?: number;
  totalRevenue?: number;
  tasksCompleted?: number;
  tasksTotal?: number;
  [key: string]: unknown;
}

/**
 * Task comment nested type
 * Per Holded Projects API v1.2
 */
export interface TaskComment {
  commentId: string;
  createdAt: number;
  userId: string;
  message: string;
}

/**
 * Task type - matches Holded Projects API v1.2 response
 * 
 * Note: The API uses 'desc' not 'description', 'userId' not 'assignedTo'
 */
export interface Task {
  id: string;
  name: string;
  /** API field name */
  desc?: string;
  projectId?: string;
  listId?: string;
  /** Array of label IDs */
  labels?: string[];
  comments?: TaskComment[];
  /** Creation timestamp */
  date?: number;
  dueDate?: number;
  /** Assigned user ID */
  userId?: string;
  createdAt?: number;
  updatedAt?: number;
  /** 0 = not started, 1 = in progress, 2 = completed, etc. */
  status?: number;
  /** 0 = not billable, 1 = billable */
  billable?: number;
  /** 0 = not featured, 1 = featured */
  featured?: number;
  // Legacy field names kept for backwards compatibility
  /** @deprecated Use desc instead */
  description?: string;
  /** @deprecated Use userId instead */
  assignedTo?: string;
  /** @deprecated status is a number in API */
  priority?: string;
  /** @deprecated Not in API response */
  completed?: boolean;
  /** @deprecated Not in API response */
  estimatedHours?: number;
  /** @deprecated Not in API response */
  loggedHours?: number;
}

export interface DailyLedgerEntry {
  id: string;
  date: number;
  account: string;
  amount: number;
  description?: string;
  documentId?: string;
  documentType?: string;
  [key: string]: unknown;
}

/**
 * What the daily ledger API actually returns per entry line.
 * Unlike DailyLedgerEntry (which was typed from docs), this matches the real API response.
 */
export interface LedgerEntryLine {
  entryNumber: number;
  line: number;
  timestamp: number;
  type: string;
  description: string;
  docDescription: string;
  account: number;
  debit: number;
  credit: number;
  tags: string[];
  checked: string;
}

/**
 * Aggregated account balance computed from ledger entries.
 * Output of holded_accounting_list_account_balances tool.
 */
export interface AccountBalance {
  num: number;
  name: string;
  group: string;
  debit: number;
  credit: number;
  balance: number;
}

/**
 * Create accounting entry API response type
 * Per holded_docs/createentry.md
 */
export interface CreateEntryResponse {
  entryGroupId: string;
}

// Accounting types
export interface AccountingAccount {
  id: string;
  num: number;
  name: string;
  group: string;
  color?: string;
  debit?: number;
  credit?: number;
  balance?: number;
}

// Team types
export interface Employee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  hireDate?: number;
  status?: string;
  [key: string]: unknown;
}

export interface TimeTracking {
  id: string;
  employeeId: string;
  employeeName?: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskName?: string;
  date: number;
  hours: number;
  description?: string;
  billable?: boolean;
  [key: string]: unknown;
}

// API Response types
/**
 * Generic paginated response type.
 * Note: The Holded API returns arrays directly, not wrapped in a paginated object.
 * This type is provided for reference but is not used in the current implementation.
 * Pagination is handled via query parameters (page) and response array length.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  hasMore: boolean;
  nextPage?: number;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}
