/**
 * Helpers for resolving attachment file inputs (path or base64) into a Buffer.
 */

import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute } from "node:path";

/**
 * Read an attachment from a local absolute path.
 *
 * Accepts paths starting with `~` or `~/`, expanding the leading `~` to the
 * user's home directory. After expansion the path must be absolute.
 */
export async function readAttachmentFromPath(
  filePath: string
): Promise<{ buffer: Buffer; basename: string }> {
  const expanded = expandTilde(filePath);

  if (!isAbsolute(expanded)) {
    throw new Error(
      "file_path must be absolute (e.g., /Users/me/invoice.pdf or ~/Downloads/invoice.pdf)"
    );
  }

  let stats;
  try {
    stats = await stat(expanded);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error(`File not found at ${expanded}`);
    }
    if (code === "EACCES" || code === "EPERM") {
      throw new Error(`Permission denied reading ${expanded}`);
    }
    throw err;
  }

  if (!stats.isFile()) {
    throw new Error(`Path is not a regular file: ${expanded}`);
  }

  let buffer;
  try {
    buffer = await readFile(expanded);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EACCES" || code === "EPERM") {
      throw new Error(`Permission denied reading ${expanded}`);
    }
    throw err;
  }

  return { buffer, basename: basename(expanded) };
}

function expandTilde(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return homedir() + p.slice(1);
  return p;
}

/**
 * Input shape for an attachment that may come from either a local file path
 * or a base64-encoded string. Schema refines guarantee that exactly one of
 * `file_path` / `file_content` is set, and that `file_name` is set when
 * `file_content` is used.
 */
export interface AttachmentInput {
  file_path?: string;
  file_content?: string;
  file_name?: string;
}

/**
 * Resolve a path/base64 attachment input into the buffer + fileName that the
 * multipart upload layer needs. Trusts the schema refine to have enforced the
 * input invariants.
 */
export async function resolveAttachmentInput(
  input: AttachmentInput
): Promise<{ buffer: Buffer; fileName: string }> {
  if (input.file_path) {
    const { buffer, basename } = await readAttachmentFromPath(input.file_path);
    return { buffer, fileName: input.file_name ?? basename };
  }

  return {
    buffer: Buffer.from(input.file_content!, "base64"),
    fileName: input.file_name!,
  };
}
