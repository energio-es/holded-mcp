/**
 * Zod schemas for Time Tracking operations
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
  OptionalStringSchema,
} from "../common.js";

/**
 * List all time-trackings input schema
 */
export const ListAllTimeTrackingsInputSchema = z.strictObject({
  page: PaginationSchema.shape.page,
  response_format: ResponseFormatSchema,
});

export type ListAllTimeTrackingsInput = z.infer<typeof ListAllTimeTrackingsInputSchema>;

/**
 * List employee time-trackings input schema
 */
export const ListEmployeeTimeTrackingsInputSchema = z.strictObject({
  employee_id: IdSchema.describe("The employee ID"),
  response_format: ResponseFormatSchema,
});

export type ListEmployeeTimeTrackingsInput = z.infer<typeof ListEmployeeTimeTrackingsInputSchema>;

/**
 * Get time-tracking input schema
 */
export const GetTimeTrackingInputSchema = z.strictObject({
  time_id: IdSchema.describe("The time-tracking ID to retrieve"),
  response_format: ResponseFormatSchema,
});

export type GetTimeTrackingInput = z.infer<typeof GetTimeTrackingInputSchema>;

/**
 * Create employee time-tracking input schema
 * 
 * According to Holded API documentation, the required parameters are:
 * - startTmp (string): Start timestamp as Unix timestamp string
 * - endTmp (string): End timestamp as Unix timestamp string
 */
export const CreateEmployeeTimeTrackingInputSchema = z.strictObject({
  employee_id: IdSchema.describe("The employee ID (required)"),
  startTmp: z.string().min(1, { message: "Start timestamp is required" }).describe("Start time as Unix timestamp string (required)"),
  endTmp: z.string().min(1, { message: "End timestamp is required" }).describe("End time as Unix timestamp string (required)"),
});

export type CreateEmployeeTimeTrackingInput = z.infer<typeof CreateEmployeeTimeTrackingInputSchema>;

/**
 * Update time-tracking input schema
 * 
 * According to Holded API documentation, the required parameters are:
 * - startTmp (string): Start timestamp as Unix timestamp string
 * - endTmp (string): End timestamp as Unix timestamp string
 */
export const UpdateTimeTrackingInputSchema = z.strictObject({
  time_id: IdSchema.describe("The time-tracking ID to update"),
  startTmp: z.string().min(1, { message: "Start timestamp is required" }).describe("Start time as Unix timestamp string (required)"),
  endTmp: z.string().min(1, { message: "End timestamp is required" }).describe("End time as Unix timestamp string (required)"),
});

export type UpdateTimeTrackingInput = z.infer<typeof UpdateTimeTrackingInputSchema>;

/**
 * Delete time-tracking input schema
 */
export const DeleteTimeTrackingInputSchema = z.strictObject({
  time_id: IdSchema.describe("The time-tracking ID to delete"),
});

export type DeleteTimeTrackingInput = z.infer<typeof DeleteTimeTrackingInputSchema>;

/**
 * Employee clock-in input schema
 */
export const EmployeeClockInInputSchema = z.strictObject({
  employee_id: IdSchema.describe("The employee ID to clock in"),
  location: OptionalStringSchema.describe("Location name"),
});

export type EmployeeClockInInput = z.infer<typeof EmployeeClockInInputSchema>;

/**
 * Employee clock-out input schema
 */
export const EmployeeClockOutInputSchema = z.strictObject({
  employee_id: IdSchema.describe("The employee ID to clock out"),
  latitude: OptionalStringSchema.describe("Latitude (e.g., -7.45556)"),
  longitude: OptionalStringSchema.describe("Longitude (e.g., 55.55765)"),
});

export type EmployeeClockOutInput = z.infer<typeof EmployeeClockOutInputSchema>;

/**
 * Employee pause input schema
 */
export const EmployeePauseInputSchema = z.strictObject({
  employee_id: IdSchema.describe("The employee ID to pause"),
  latitude: OptionalStringSchema.describe("Latitude (e.g., -7.45556)"),
  longitude: OptionalStringSchema.describe("Longitude (e.g., 55.55765)"),
});

export type EmployeePauseInput = z.infer<typeof EmployeePauseInputSchema>;

/**
 * Employee unpause input schema
 */
export const EmployeeUnpauseInputSchema = z.strictObject({
  employee_id: IdSchema.describe("The employee ID to unpause"),
  latitude: OptionalStringSchema.describe("Latitude (e.g., -7.45556)"),
  longitude: OptionalStringSchema.describe("Longitude (e.g., 55.55765)"),
});

export type EmployeeUnpauseInput = z.infer<typeof EmployeeUnpauseInputSchema>;
