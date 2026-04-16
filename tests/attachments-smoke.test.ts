/**
 * Real-API smoke test for the file_path attachment flow.
 *
 * Validates that file_path → resolveAttachmentInput → makeMultipartApiRequest
 * works end-to-end against the documented documents-attach endpoint
 * (`POST /documents/{docType}/{documentId}/attach`).
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

describeSmoke("Attachments smoke (file_path → documents attach)", () => {
  let tmpDir: string;

  beforeAll(() => {
    initializeApi(API_KEY!);
    tmpDir = mkdtempSync(join(tmpdir(), "holded-attach-smoke-"));
  });

  afterAll(async () => {
    // Defense-in-depth cleanup: the API client retries on slow POSTs, which
    // can produce duplicate contacts. Sweep by name pattern so we delete every
    // attachment-smoke-* resource regardless of which IDs we captured.
    try {
      const allContacts = await makeApiRequest<Array<{ id: string; name?: string }>>(
        "invoicing",
        "contacts",
        "GET"
      );
      const ours = allContacts.filter(c => c.name?.startsWith("attachment-smoke-"));

      // Delete each contact's estimates first (foreign-key-style cleanup).
      if (ours.length > 0) {
        try {
          const allEstimates = await makeApiRequest<Array<{ id: string; contact?: { id?: string } }>>(
            "invoicing",
            "documents/estimate",
            "GET"
          );
          const ourContactIds = new Set(ours.map(c => c.id));
          const ourEstimates = allEstimates.filter(e => e.contact?.id && ourContactIds.has(e.contact.id));
          for (const e of ourEstimates) {
            try {
              await makeApiRequest("invoicing", `documents/estimate/${e.id}`, "DELETE");
            } catch {
              // best-effort
            }
          }
        } catch {
          // best-effort
        }
      }

      for (const c of ours) {
        try {
          await makeApiRequest("invoicing", `contacts/${c.id}`, "DELETE");
        } catch {
          // best-effort
        }
      }
    } catch {
      // best-effort
    }

    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("attaches a file to a document via file_path", async () => {
    // 1. Create a throwaway contact (documents need one).
    const contact = await makeApiRequest<{ status: number; id: string }>(
      "invoicing",
      "contacts",
      "POST",
      { name: `attachment-smoke-${Date.now()}` }
    );
    expect(contact.id).toBeTruthy();
    const contactId = contact.id;

    // 2. Create a throwaway draft estimate (estimates avoid touching invoice numbering).
    const estimate = await makeApiRequest<{ status: number; id: string }>(
      "invoicing",
      "documents/estimate",
      "POST",
      {
        contactId,
        date: Math.floor(Date.now() / 1000),
        items: [{ name: "smoke test item", units: 1, subtotal: 1 }],
      }
    );
    expect(estimate.id).toBeTruthy();
    const documentId = estimate.id;

    // 3. Write a tiny temp file.
    const filePath = join(tmpDir, "smoke.txt");
    writeFileSync(filePath, Buffer.from(`smoke ${new Date().toISOString()}`));

    // 4. Resolve via the same helper the tool uses.
    const { buffer, fileName } = await resolveAttachmentInput({ file_path: filePath });
    expect(fileName).toBe("smoke.txt");

    // 5. Upload via the same multipart layer the tool uses.
    const result = await makeMultipartApiRequest<{ status: number; info?: string }>(
      "invoicing",
      `documents/estimate/${documentId}/attach`,
      buffer,
      fileName
    );

    expect(result.status).toBe(1);

    // 6. Verify the file actually landed (defense against silent HTML-200 false positives).
    //    GET /documents/{docType}/{documentId}/attachments/list returns
    //    `{ status: 1, attachments: ["<filename>", ...] }` (verified via probe 2026-04-16).
    const listing = await makeApiRequest<{ status: number; attachments: string[] }>(
      "invoicing",
      `documents/estimate/${documentId}/attachments/list`,
      "GET"
    );
    expect(listing.status).toBe(1);
    expect(Array.isArray(listing.attachments)).toBe(true);
    expect(listing.attachments).toContain("smoke.txt");
  });
}, 60000);
