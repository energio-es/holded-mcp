/**
 * Shared Zod fields and refinement for attachment-upload input schemas.
 *
 * Used by upload tools that accept either a local absolute file path
 * (`file_path`, preferred — avoids base64 token overhead) or a base64-encoded
 * string (`file_content`, legacy). Exactly one source must be provided. With
 * `file_path`, `file_name` is optional and defaults to the path basename at
 * resolution time.
 *
 * Spread the result of `attachmentInputFields(noun)` into a `z.strictObject`
 * alongside resource-specific fields, then attach `attachmentInputSuperRefine`
 * via `.superRefine()`.
 */

import { z } from "zod";

/**
 * Build the three shared attachment-input fields, parameterised by the noun
 * used in human-facing descriptions:
 *  - "file" (default): produces "Absolute local path to the file...", etc.
 *  - "image": produces "Absolute local path to the image..." with example
 *    paths using a .png extension.
 */
export function attachmentInputFields(noun: "file" | "image" = "file") {
  const exampleName = noun === "image" ? "photo.png" : "invoice.pdf";
  const Capital = noun === "image" ? "Image" : "File";
  const longContent = noun === "image" ? "Image file content" : "File content";
  const longName = noun === "image" ? "Image file name" : "File name";

  return {
    file_path: z
      .string()
      .min(1)
      .optional()
      .describe(
        `Absolute local path to the ${noun} (e.g., /Users/me/${exampleName} or ~/Downloads/${exampleName}). Preferred over file_content for large files.`
      ),
    file_content: z
      .string()
      .min(1)
      .optional()
      .describe(
        `${longContent} as base64-encoded string. Use file_path instead for large files to avoid token overhead.`
      ),
    file_name: z
      .string()
      .min(1)
      .optional()
      .describe(
        `${longName}. Required when file_content is used; with file_path, defaults to the path basename.`
      ),
  };
}

/**
 * `superRefine` body enforcing the cross-field invariants:
 *  - exactly one of `file_path` / `file_content` must be present
 *  - `file_name` is required when `file_content` is used
 *
 * Attach via `.superRefine(attachmentInputSuperRefine)` on the schema returned
 * by `z.strictObject({ ...attachmentInputFields(), otherFields })`.
 */
export function attachmentInputSuperRefine(
  val: { file_path?: string; file_content?: string; file_name?: string },
  ctx: z.RefinementCtx
): void {
  const hasPath = Boolean(val.file_path);
  const hasContent = Boolean(val.file_content);
  if (hasPath === hasContent) {
    ctx.addIssue({
      code: "custom",
      message: "Provide exactly one of file_path or file_content",
    });
  }
  if (hasContent && !val.file_name) {
    ctx.addIssue({
      code: "custom",
      message: "file_name is required when file_content is used",
      path: ["file_name"],
    });
  }
}
