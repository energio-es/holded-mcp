/**
 * Contact and Contact Group tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, makeMultipartApiRequest } from "../../services/api.js";
import { resolveAttachmentInput } from "../../services/files.js";
import { ResponseFormat } from "../../constants.js";
import { Contact, ContactGroup } from "../../types.js";
import {
  ListContactsInputSchema,
  GetContactInputSchema,
  CreateContactInputSchema,
  UpdateContactInputSchema,
  DeleteContactInputSchema,
  ListContactGroupsInputSchema,
  GetContactGroupInputSchema,
  CreateContactGroupInputSchema,
  UpdateContactGroupInputSchema,
  DeleteContactGroupInputSchema,
  ListContactAttachmentsInputSchema,
  GetContactAttachmentInputSchema,
  UploadContactAttachmentInputSchema,
  ListContactAttachmentsInput,
  GetContactAttachmentInput,
  UploadContactAttachmentInput,
} from "../../schemas/invoicing/contacts.js";
import { registerCrudTools } from "../factory.js";
import { withErrorHandling } from "../utilities.js";

/**
 * Format contacts as markdown
 */
export function formatContactsMarkdown(contacts: Contact[]): string {
  if (!contacts.length) {
    return "No contacts found.";
  }

  const lines = ["# Contacts", "", `Found ${contacts.length} contacts:`, ""];

  for (const contact of contacts) {
    lines.push(`## ${contact.name}`);
    lines.push(`- **ID**: ${contact.id}`);
    if (contact.email) lines.push(`- **Email**: ${contact.email}`);
    if (contact.phone) lines.push(`- **Phone**: ${contact.phone}`);
    if (contact.type) lines.push(`- **Type**: ${contact.type}`);
    if (contact.vatnumber) lines.push(`- **VAT**: ${contact.vatnumber}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single contact as markdown
 */
export function formatContactMarkdown(contact: Contact): string {
  const lines = [`# ${contact.name}`, "", `**ID**: ${contact.id}`, ""];

  if (contact.code) lines.push(`- **Code**: ${contact.code}`);
  if (contact.email) lines.push(`- **Email**: ${contact.email}`);
  if (contact.phone) lines.push(`- **Phone**: ${contact.phone}`);
  if (contact.mobile) lines.push(`- **Mobile**: ${contact.mobile}`);
  if (contact.type) lines.push(`- **Type**: ${contact.type}`);
  if (contact.vatnumber) lines.push(`- **VAT Number**: ${contact.vatnumber}`);
  if (contact.tradeName) lines.push(`- **Trade Name**: ${contact.tradeName}`);
  if (contact.currency) lines.push(`- **Currency**: ${contact.currency}`);

  if (contact.billAddress) {
    lines.push("", "### Billing Address");
    const addr = contact.billAddress;
    if (addr.address) lines.push(`- ${addr.address}`);
    if (addr.city) lines.push(`- ${addr.city}`);
    if (addr.postalCode) lines.push(`- ${addr.postalCode}`);
    if (addr.province) lines.push(`- ${addr.province}`);
    if (addr.country) lines.push(`- ${addr.country}`);
  }

  if (contact.notes && contact.notes.length > 0) {
    lines.push("", "### Notes", JSON.stringify(contact.notes));
  }

  return lines.join("\n");
}

/**
 * Format contact groups as markdown
 */
export function formatContactGroupsMarkdown(groups: ContactGroup[]): string {
  if (!groups.length) {
    return "No contact groups found.";
  }

  const lines = ["# Contact Groups", "", `Found ${groups.length} groups:`, ""];
  for (const group of groups) {
    lines.push(`- **${group.name}** (ID: ${group.id})`);
  }
  return lines.join("\n");
}

/**
 * Format a single contact group as markdown
 */
export function formatContactGroupMarkdown(group: ContactGroup): string {
  return `# ${group.name}\n\n**ID**: ${group.id}`;
}

/**
 * Register all contact-related tools
 */
export function registerContactTools(server: McpServer): void {
  // ── Contacts CRUD via factory ─────────────────────────
  registerCrudTools<Contact>(server, {
    module: "invoicing",
    toolPrefix: "holded_invoicing",
    resource: "contact",
    resourcePlural: "contacts",
    endpoint: "contacts",
    idParam: "contact_id",
    schemas: {
      list: ListContactsInputSchema,
      get: GetContactInputSchema,
      create: CreateContactInputSchema,
      update: UpdateContactInputSchema,
      delete: DeleteContactInputSchema,
    },
    titles: {
      list: "List Holded Contacts",
      get: "Get Holded Contact",
      create: "Create Holded Contact",
      update: "Update Holded Contact",
      delete: "Delete Holded Contact",
    },
    descriptions: {
      list: `List all contacts from Holded (clients, suppliers, etc.).

Returns paginated list of contacts (max 500 per page). Use page parameter to navigate through results.
Supports filtering by exact phone or mobile number.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - phone (string): Filter by exact phone number (include + prefix, e.g., +34612345678)
  - mobile (string): Filter by exact mobile number (include + prefix)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of contacts with id, name, email, phone, type, and other details.`,
      get: `Get a specific contact by ID from Holded.

Args:
  - contact_id (string): The contact ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Contact details including name, email, phone, addresses, and custom fields.`,
      create: `Create a new contact in Holded.

Args:
  - name (string): Contact name (required)
  - email (string): Email address
  - phone (string): Phone number
  - type ('client' | 'supplier' | 'lead' | 'debtor' | 'creditor'): Contact type
  - And other optional fields for address, social networks, defaults, etc.

Returns:
  The created contact with its assigned ID.`,
      update: `Update an existing contact in Holded. Only provided fields will be updated.

Args:
  - contact_id (string): The contact ID to update (required)
  - name (string): Contact name
  - email (string): Email address
  - phone (string): Phone number
  - And other optional fields to update

Returns:
  The updated contact.`,
      delete: `Delete a contact from Holded.

Args:
  - contact_id (string): The contact ID to delete (required)

Returns:
  Confirmation of deletion.`,
    },
    formatters: {
      list: formatContactsMarkdown,
      single: formatContactMarkdown,
    },
    listQueryParams: (params) => {
      const qp: Record<string, unknown> = {};
      if (params.phone) qp.phone = params.phone;
      if (params.mobile) qp.mobile = params.mobile;
      return qp;
    },
  });

  // ── Contact Groups CRUD via factory ───────────────────
  registerCrudTools<ContactGroup>(server, {
    module: "invoicing",
    toolPrefix: "holded_invoicing",
    resource: "contact_group",
    resourcePlural: "contact_groups",
    endpoint: "contacts/groups",
    idParam: "group_id",
    schemas: {
      list: ListContactGroupsInputSchema,
      get: GetContactGroupInputSchema,
      create: CreateContactGroupInputSchema,
      update: UpdateContactGroupInputSchema,
      delete: DeleteContactGroupInputSchema,
    },
    titles: {
      list: "List Holded Contact Groups",
      get: "Get Holded Contact Group",
      create: "Create Holded Contact Group",
      update: "Update Holded Contact Group",
      delete: "Delete Holded Contact Group",
    },
    descriptions: {
      list: `List all contact groups from Holded.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of contact groups with id and name.`,
      get: `Get a specific contact group by ID from Holded.

Args:
  - group_id (string): The contact group ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Contact group details.`,
      create: `Create a new contact group in Holded.

Args:
  - name (string): Contact group name (required)
  - pos (number): Position/order in the list

Returns:
  The created contact group with its assigned ID.`,
      update: `Update an existing contact group in Holded. Only provided fields will be updated.

Args:
  - group_id (string): The contact group ID to update (required)
  - name (string): Contact group name
  - pos (number): Position/order in the list

Returns:
  The updated contact group.`,
      delete: `Delete a contact group from Holded.

Args:
  - group_id (string): The contact group ID to delete (required)

Returns:
  Confirmation of deletion.`,
    },
    formatters: {
      list: formatContactGroupsMarkdown,
      single: formatContactGroupMarkdown,
    },
  });

  // ── Manual tools (attachment-specific endpoints) ──────

  // List Contact Attachments
  server.registerTool(
    "holded_invoicing_list_contact_attachments",
    {
      title: "List Holded Contact Attachments",
      description: `Get attachments list for a given contact from Holded.

Args:
  - contact_id (string): The contact ID to list attachments for (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of attachment file names.`,
      inputSchema: ListContactAttachmentsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const typedParams = params as unknown as ListContactAttachmentsInput;
      const attachments = await makeApiRequest<Array<string>>(
        "invoicing",
        `contacts/${typedParams.contact_id}/attachments/list`,
        "GET"
      );

      let textContent: string;
      if (typedParams.response_format === ResponseFormat.MARKDOWN) {
        if (!attachments.length) {
          textContent = `No attachments found for contact ${typedParams.contact_id}.`;
        } else {
          const lines = ["# Contact Attachments", "", `Found ${attachments.length} attachments:`, ""];
          for (const attachment of attachments) {
            lines.push(`- ${attachment}`);
          }
          textContent = lines.join("\n");
        }
      } else {
        textContent = JSON.stringify(attachments, null, 2);
      }

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: { attachments, count: attachments.length, contactId: typedParams.contact_id },
      };
    })
  );

  // Get Contact Attachment
  server.registerTool(
    "holded_invoicing_get_contact_attachment",
    {
      title: "Get Holded Contact Attachment",
      description: `Get a specific attachment for a contact from Holded.

Args:
  - contact_id (string): The contact ID (required)
  - filename (string): The attachment filename (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Attachment file data (binary format, base64 encoded or URL).`,
      inputSchema: GetContactAttachmentInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const typedParams = params as unknown as GetContactAttachmentInput;
      const result = await makeApiRequest<string | { url?: string; data?: string; [key: string]: unknown }>(
        "invoicing",
        `contacts/${typedParams.contact_id}/attachments/get`,
        "GET",
        undefined,
        { filename: typedParams.filename }
      );

      let textContent: string;
      if (typedParams.response_format === ResponseFormat.MARKDOWN) {
        if (typeof result === "string") {
          textContent = `# Contact Attachment\n\n**File**: ${typedParams.filename}\n**Data**: ${result.substring(0, 100)}...`;
        } else {
          textContent = result.url
            ? `# Contact Attachment\n\n**File**: ${typedParams.filename}\n**URL**: ${result.url}`
            : `# Contact Attachment\n\n**File**: ${typedParams.filename}\nAttachment data available.`;
        }
      } else {
        textContent = JSON.stringify(result, null, 2);
      }

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: { contactId: typedParams.contact_id, filename: typedParams.filename, data: result },
      };
    })
  );

  // Upload Contact Attachment
  server.registerTool(
    "holded_invoicing_upload_contact_attachment",
    {
      title: "Upload Holded Contact Attachment",
      description: `Upload an attachment to a contact in Holded.

Provide the file via either an absolute local file path (preferred) or a base64-encoded string.

Args:
  - contact_id (string): The contact ID to upload attachment to (required)
  - file_path (string): Absolute local path to the file, e.g. /Users/me/invoice.pdf or ~/Downloads/invoice.pdf. Preferred for large files — avoids base64 token overhead.
  - file_content (string): File content as base64-encoded string. Fallback when no local path is available.
  - file_name (string): File name. Required when file_content is used; with file_path, defaults to the path basename. Provide explicitly to rename on upload.

Exactly one of file_path or file_content must be provided.

Returns:
  Confirmation of attachment upload with status and info.`,
      inputSchema: UploadContactAttachmentInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const typedParams = params as unknown as UploadContactAttachmentInput;
      const { buffer, fileName } = await resolveAttachmentInput(typedParams);

      const result = await makeMultipartApiRequest<{ status: number; info: string; [key: string]: unknown }>(
        "invoicing",
        `contacts/${typedParams.contact_id}/attachments`,
        buffer,
        fileName
      );

      return {
        content: [
          {
            type: "text",
            text: `Contact attachment uploaded successfully.\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
        structuredContent: { uploaded: true, contactId: typedParams.contact_id, fileName, ...result },
      };
    })
  );
}
