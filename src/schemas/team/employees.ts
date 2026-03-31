/**
 * Zod schemas for Employee-related operations
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
  OptionalStringSchema,
} from "../common.js";

/**
 * List employees input schema
 */
export const ListEmployeesInputSchema = z.strictObject({
  page: PaginationSchema.shape.page,
  response_format: ResponseFormatSchema,
});

export type ListEmployeesInput = z.infer<typeof ListEmployeesInputSchema>;

/**
 * Get employee input schema
 */
export const GetEmployeeInputSchema = z.strictObject({
  employee_id: IdSchema.describe("The employee ID to retrieve"),
  response_format: ResponseFormatSchema,
});

export type GetEmployeeInput = z.infer<typeof GetEmployeeInputSchema>;

/**
 * Create employee input schema
 * 
 * According to the official Holded Team API v1.0.1 documentation,
 * employee creation supports only these fields: name, lastName, email, sendInvite.
 * All other fields should be set via the Update Employee endpoint.
 * 
 * @see https://developers.holded.com/reference
 * @apiVersion Team API v1.0.1
 * @required name, lastName, email
 * @optional sendInvite
 * 
 * @example
 * ```typescript
 * const input = {
 *   name: "John",
 *   lastName: "Doe", 
 *   email: "john.doe@company.com",
 *   sendInvite: true
 * };
 * ```
 */
export const CreateEmployeeInputSchema = z.strictObject({
  name: z.string().min(1, { message: "Name is required" }).describe("Employee name (required)"),
  lastName: z.string().min(1, { message: "Last name is required" }).describe("Employee last name (required)"),
  email: z.string().email({ message: "Valid email is required" }).describe("Email address (required)"),
  sendInvite: z.boolean().optional().describe("Whether to send invitation email to the employee"),
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeInputSchema>;

/**
 * Address schema for employee
 */
const EmployeeAddressSchema = z.strictObject({
  address: z.string().optional().describe("Street address"),
  city: z.string().optional().describe("City name"),
  postalCode: z.string().optional().describe("Postal/ZIP code"),
  province: z.string().optional().describe("Province/State"),
  country: z.string().optional().describe("Country name"),
});

/**
 * Fiscal address schema for employee
 */
const EmployeeFiscalAddressSchema = z.strictObject({
  idNum: z.string().optional().describe("ID number"),
  address: z.string().optional().describe("Street address"),
  city: z.string().optional().describe("City name"),
  cityOfBirth: z.string().optional().describe("City of birth"),
  postalCode: z.string().optional().describe("Postal/ZIP code"),
  province: z.string().optional().describe("Province/State"),
  country: z.string().optional().describe("Country name"),
  countryOfBirth: z.string().optional().describe("Country of birth"),
  endSituationDate: z.string().optional().describe("End situation date"),
});

/**
 * Supported languages for employee main language
 * Per Holded Team API v1.0.1 documentation
 */
const EmployeeLanguageEnum = z.enum([
  "English",
  "English(UK)",
  "English(US)",
  "English(Canada)",
  "Spanish",
  "Spanish(Spain)",
  "Spanish(Mexico)",
  "Spanish(Argentina)",
  "Spanish(Colombia)",
  "Portuguese",
  "Portuguese(Portugal)",
  "Portuguese(Brazil)",
  "Catalan",
  "Galician",
  "Euskera",
  "French",
  "German(Deutsch)",
  "Italian",
  "Greek",
  "Swedish",
  "Dutch",
  "Finnish",
  "Irish",
  "Norwegian",
  "Danish",
  "Czech",
  "Croatian",
  "Russian",
  "Polish",
]);

/**
 * Update employee input schema
 */
export const UpdateEmployeeInputSchema = z.strictObject({
  employee_id: IdSchema.describe("The employee ID to update"),
  name: z.string().min(1).optional().describe("Employee name"),
  lastName: z.string().min(1).optional().describe("Employee last name"),
  mainEmail: z.string().email().optional().describe("Main email address"),
  email: z.string().email().optional().describe("Email address"),
  nationality: OptionalStringSchema.describe("Nationality"),
  phone: OptionalStringSchema.describe("Phone number"),
  mobile: OptionalStringSchema.describe("Mobile phone number"),
  dateOfBirth: z.string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, { message: "Date must be in dd/mm/yyyy format" })
    .optional()
    .describe("Date of birth (dd/mm/yyyy)"),
  gender: z.enum(["male", "female"]).optional().describe("Gender"),
  mainLanguage: EmployeeLanguageEnum.optional().describe("Main language"),
  iban: OptionalStringSchema.describe("Bank IBAN"),
  timeOffPolicyId: OptionalStringSchema.describe("Time off policy ID"),
  timeOffSupervisors: z.array(z.string()).optional().describe("Array of supervisor employee IDs"),
  reportingTo: OptionalStringSchema.describe("Reporting manager employee ID"),
  code: OptionalStringSchema.describe("NIF/tax identification number"),
  socialSecurityNum: OptionalStringSchema.describe("Social security number"),
  address: EmployeeAddressSchema.optional().describe("Address"),
  fiscalResidence: z.boolean().optional().describe("Fiscal residence (set to false to use fiscalAddress)"),
  fiscalAddress: EmployeeFiscalAddressSchema.optional().describe("Fiscal address (requires fiscalResidence to be false)"),
  workplace: OptionalStringSchema.describe("Workplace ID"),
  teams: z.array(z.string()).optional().describe("Array of team IDs"),
  holdedUserId: OptionalStringSchema.describe("Holded user ID"),
});

export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeInputSchema>;

/**
 * Delete employee input schema
 */
export const DeleteEmployeeInputSchema = z.strictObject({
  employee_id: IdSchema.describe("The employee ID to delete"),
});

export type DeleteEmployeeInput = z.infer<typeof DeleteEmployeeInputSchema>;
