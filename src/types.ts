/**
 * TypeScript type definitions for Holded API entities
 *
 * All types verified against the live Holded API via direct HTTP calls (2026-04-01).
 * See holded_api_specs/DRIFT.md for the full field inventory per endpoint.
 *
 * API Versions:
 * - Invoice API: v1.4
 * - CRM API: v1.0
 * - Projects API: v1.2
 * - Team API: v1.0.1
 * - Accounting API: v1.0.0
 */

// Contact types
export interface Contact {
  id: string;
  name: string;
  customId?: string | null;
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
  notes?: unknown[];
  contactPersons?: unknown[];
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
  createdAt?: number;
  updatedAt?: number;
  updatedHash?: string;
}

export interface Address {
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;
  countryCode?: string;
  info?: string;
}

export interface CustomField {
  field: string;
  value: string;
}

export interface ContactDefaults {
  salesChannel?: number;
  paymentMethod?: string;
  paymentDay?: number;
  dueDays?: number;
  expensesAccount?: number;
  discount?: number;
  language?: string;
  currency?: string;
  salesTax?: unknown[];
  purchasesTax?: unknown[];
  accumulateInForm347?: string;
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
  kind?: string;
  typeId?: string;
  desc?: string;
  price?: number;
  cost?: string | number;
  tax?: string;
  stock?: number;
  hasStock?: boolean;
  barcode?: string;
  weight?: number;
  packQuantity?: number;
  packProducts?: PackProduct[];
  tags?: string[];
  variants?: ProductVariant[];
  customFields?: CustomField[];
  contactId?: string;
  contactName?: string;
  total?: number;
  purchasePrice?: number;
  categoryId?: string;
  factoryCode?: string;
  forSale?: number;
  forPurchase?: number;
  salesChannelId?: string;
  expAccountId?: string;
  warehouseId?: string;
  translations?: unknown;
  taxes?: unknown[];
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
  cost?: string | number;
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
  default?: boolean;
  userId?: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  warehouseRecord?: string;
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
  docNumber?: string;
  contact?: string;
  contactName?: string;
  date?: number;
  dueDate?: number;
  status?: string;
  currency?: string;
  currencyChange?: number;
  subtotal?: number;
  tax?: number;
  total?: number;
  products?: DocumentItem[];
  notes?: string;
  tags?: string[];
  salesChannel?: string;
  customFields?: CustomField[];
  desc?: string;
  discount?: number;
  language?: string;
  paymentsTotal?: number;
  paymentsPending?: number;
  paymentsRefunds?: number;
  paymentsDetail?: unknown[];
  accountingDate?: number;
  approvedAt?: number;
  draft?: boolean;
  forecastDate?: number;
  multipledueDate?: unknown;
  shipping?: unknown;
  paymentMethodId?: string;
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
  price?: number;
  taxes?: string[];
  costPrice?: number;
  line_id?: string;
  account?: string;
  projectid?: string;
  retention?: number;
}

// Payment types
export interface Payment {
  id: string;
  documentId?: string;
  amount: number;
  date: number;
  bankId?: string;
  desc?: string;
  contactId?: string;
  contactName?: string;
  documentType?: string;
  change?: number;
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
  treasuryId?: string;
  treasuryName?: string;
}

// Numbering Series types
export interface NumberingSeries {
  id: string;
  name: string;
  format: string;
  last: number;
  type: string;
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
  status?: number;
  customFields?: CustomField[];
  value?: number;
  userId?: string;
  person?: string;
  personName?: string;
  dueDate?: number;
  createdAt?: number;
  updatedAt?: number;
  updatedHash?: string;
  events?: unknown[];
  tasks?: unknown[];
  files?: string[];
}

export interface LeadNote {
  id: string;
  title: string;
  desc?: string;
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
  won?: { num: number; value: number };
  leads?: { num: number; valueTotProbability?: number; value: number };
  lost?: { num: number; value: number };
  recentLeads?: { num: number; value: number };
  recentWon?: { num: number; value: number };
  recentLost?: { num: number; value: number };
  labels?: unknown[];
  preferences?: unknown[];
  customFields?: unknown[];
}

export interface FunnelStage {
  stageId: string;
  name: string;
  key: string;
  desc?: string;
  dealprobability?: number;
}

export interface CrmEvent {
  id: string;
  name: string;
  desc?: string;
  startDate: number;
  endDate?: number;
  leadId?: string;
  contactId?: string;
  contactName?: string;
  kind?: string;
  status?: number;
  tags?: string[];
  locationDesc?: string;
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
  id?: string;
  key: string;
  name: string;
  desc?: string;
  statuses?: unknown[];
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
  duration: number;
  desc?: string;
  costHour: number;
  userId?: string;
  taskId?: string;
  total: number;
  user?: string;
  date?: number;
  approved?: number;
  category?: string;
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
  customFields?: CustomField[];
  type?: string;
  icon?: string;
  color?: string;
  key?: string;
  scope?: string;
  users?: unknown;
  archived?: unknown;
  allow_notifications?: boolean;
  purchasesorders?: unknown[];
  salesorders?: unknown[];
}

export interface ProjectSummary {
  name: string;
  desc?: string;
  projectEvolution: {
    tasks: { total: number; completed: number };
    dueDate: number;
  };
  profitability: {
    sales: number;
    expenses: { documents: number; personnel: number; total: number };
    profit: number;
  };
  economicStatus: {
    sales: number;
    quoted: number;
    difference: number;
    estimatePrice: number;
    billed: number;
    collected: number;
    remaining: number;
  };
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
  /** Assigned user IDs */
  userId?: string[];
  createdAt?: number;
  updatedAt?: number;
  status?: string;
  /** 0 = not billable, 1 = billable */
  billable?: number | null;
  /** 0 = not featured, 1 = featured */
  featured?: number;
  priority?: string | null;
  index?: number;
  storypoints?: number | null;
  type?: string;
  reference?: string;
  archived?: unknown;
  archivedby?: string;
}

/**
 * What the daily ledger API actually returns per entry line.
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
  holdedUserId?: string;
  name: string;
  lastName?: string;
  dateOfBirth?: string | null;
  nationality?: string;
  socialSecurityNum?: string;
  academicLevel?: string;
  languages?: string[];
  mainLanguage?: string;
  code?: string;
  gender?: string;
  mainEmail?: string;
  email?: string;
  phone?: string | null;
  mobile?: string | null;
  address?: {
    address?: string;
    city?: string;
    postalCode?: string | number;
    province?: string;
    country?: string;
  };
  teamIds?: string[];
  workplace?: string;
  iban?: string;
  files?: unknown[];
  notes?: string;
  currentContract?: unknown[];
  reportingTo?: string;
  timeOffSupervisors?: string[];
  timeOffPolicyId?: string;
  terminated?: unknown;
  terminatedType?: unknown;
  terminatedReason?: string;
  fiscalResidence?: boolean | null;
  fiscalAddress?: {
    idNum?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    province?: string;
    country?: string;
    deadLine?: string;
    cityOfBirth?: string;
    countryOfBirth?: string;
  };
  title?: string;
  tags?: string[];
  companyPhone?: string;
  customFields?: unknown[];
  payrollAccounts?: unknown[];
  [key: string]: unknown;
}

export interface TimeTracking {
  id: string;
  employeeId: string;
  employeeName?: string;
  locationStart?: unknown;
  locationEnd?: unknown;
  date: { date: string; timezone_type: number; timezone: string };
  start: number;
  end: number;
  time: number;
  status?: string;
  approved?: number;
  approvedBy?: string;
  approvedAt?: number;
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
