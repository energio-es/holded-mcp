import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, chmodSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, basename } from "node:path";
import { readAttachmentFromPath, resolveAttachmentInput } from "../src/services/files.js";

describe("readAttachmentFromPath", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "holded-files-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("reads an absolute path and returns buffer + basename", async () => {
    const filePath = join(tmpDir, "invoice.pdf");
    writeFileSync(filePath, Buffer.from("hello pdf"));

    const result = await readAttachmentFromPath(filePath);

    expect(result.buffer.equals(Buffer.from("hello pdf"))).toBe(true);
    expect(result.basename).toBe("invoice.pdf");
  });

  it("expands a leading ~ to the user home directory", async () => {
    // Create the file inside homedir under a unique subdir so we can clean up.
    const homeSubdir = mkdtempSync(join(homedir(), ".holded-files-test-"));
    const fileName = "tilde-test.txt";
    const realPath = join(homeSubdir, fileName);
    writeFileSync(realPath, Buffer.from("tilde works"));

    try {
      const tildePath = `~/${basename(homeSubdir)}/${fileName}`;
      const result = await readAttachmentFromPath(tildePath);

      expect(result.buffer.toString()).toBe("tilde works");
      expect(result.basename).toBe(fileName);
    } finally {
      rmSync(homeSubdir, { recursive: true, force: true });
    }
  });

  it("rejects relative paths with a clear message", async () => {
    await expect(readAttachmentFromPath("relative/path.pdf")).rejects.toThrow(
      /file_path must be absolute/
    );
  });

  it("returns ENOENT-style error for missing file", async () => {
    const missing = join(tmpDir, "does-not-exist.pdf");
    await expect(readAttachmentFromPath(missing)).rejects.toThrow(
      new RegExp(`File not found at ${missing.replace(/[.+]/g, "\\$&")}`)
    );
  });

  it("rejects when path is a directory", async () => {
    const dirPath = join(tmpDir, "subdir");
    mkdirSync(dirPath);

    await expect(readAttachmentFromPath(dirPath)).rejects.toThrow(
      /Path is not a regular file/
    );
  });

  it("returns a permission-denied error when file is unreadable", async () => {
    // Skip on Windows-style filesystems where chmod has no effect.
    const filePath = join(tmpDir, "locked.pdf");
    writeFileSync(filePath, Buffer.from("locked"));
    chmodSync(filePath, 0o000);

    try {
      await expect(readAttachmentFromPath(filePath)).rejects.toThrow(
        /Permission denied/
      );
    } finally {
      chmodSync(filePath, 0o644); // restore so afterEach cleanup works
    }
  });
});

describe("resolveAttachmentInput", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "holded-resolve-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns buffer and inferred basename when only file_path is provided", async () => {
    const filePath = join(tmpDir, "report.pdf");
    writeFileSync(filePath, Buffer.from("payload"));

    const result = await resolveAttachmentInput({ file_path: filePath });

    expect(result.buffer.toString()).toBe("payload");
    expect(result.fileName).toBe("report.pdf");
  });

  it("uses explicit file_name to override the basename", async () => {
    const filePath = join(tmpDir, "report.pdf");
    writeFileSync(filePath, Buffer.from("payload"));

    const result = await resolveAttachmentInput({
      file_path: filePath,
      file_name: "renamed.pdf",
    });

    expect(result.fileName).toBe("renamed.pdf");
  });

  it("decodes base64 file_content and uses provided file_name", async () => {
    const original = Buffer.from("base64 payload");
    const result = await resolveAttachmentInput({
      file_content: original.toString("base64"),
      file_name: "uploaded.pdf",
    });

    expect(result.buffer.equals(original)).toBe(true);
    expect(result.fileName).toBe("uploaded.pdf");
  });
});
