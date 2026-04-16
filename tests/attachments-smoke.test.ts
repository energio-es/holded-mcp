/**
 * Real-API smoke test for the file_path attachment flow.
 *
 * Skipped automatically unless HOLDED_TEST_API_KEY is set. Per CLAUDE.md,
 * always cleans up any resource it creates.
 */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeApiRequest, makeMultipartApiRequest, initializeApi } from "../src/services/api.js";
import { resolveAttachmentInput } from "../src/services/files.js";

const API_KEY = process.env.HOLDED_TEST_API_KEY;
const describeSmoke = API_KEY ? describe : describe.skip;

describeSmoke("Attachments smoke (file_path → multipart)", () => {
  let tmpDir: string;
  let contactId: string | null = null;

  beforeAll(() => {
    initializeApi(API_KEY!);
    tmpDir = mkdtempSync(join(tmpdir(), "holded-attach-smoke-"));
  });

  afterAll(async () => {
    if (contactId) {
      try {
        await makeApiRequest("invoicing", `contacts/${contactId}`, "DELETE");
      } catch {
        // best-effort cleanup
      }
    }
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("uploads a contact attachment from file_path", async () => {
    // 1. Create a throwaway contact.
    const created = await makeApiRequest<{ status: number; id: string }>(
      "invoicing",
      "contacts",
      "POST",
      { name: `attachment-smoke-${Date.now()}` }
    );
    expect(created.id).toBeTruthy();
    contactId = created.id;

    // 2. Write a tiny temp file.
    const filePath = join(tmpDir, "smoke.txt");
    writeFileSync(filePath, Buffer.from(`smoke ${new Date().toISOString()}`));

    // 3. Resolve via the same helper the tool uses.
    const { buffer, fileName } = await resolveAttachmentInput({ file_path: filePath });
    expect(fileName).toBe("smoke.txt");

    // 4. Upload via the same multipart layer the tool uses.
    const result = await makeMultipartApiRequest<{ status: number; info?: string }>(
      "invoicing",
      `contacts/${contactId}/attachments`,
      buffer,
      fileName
    );

    expect(result.status).toBe(1);
  });
}, 60000);
