/**
 * Contact and Contact Group tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, makeMultipartApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
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
  ListContactsInput,
  GetContactInput,
  CreateContactInput,
  UpdateContactInput,
  DeleteContactInput,
  ListContactGroupsInput,
  GetContactGroupInput,
  CreateContactGroupInput,
  UpdateContactGroupInput,
  DeleteContactGroupInput,
  ListContactAttachmentsInputSchema,
  GetContactAttachmentInputSchema,
  UploadContactAttachmentInputSchema,
  ListContactAttachmentsInput,
  GetContactAttachmentInput,
  UploadContactAttachmentInput,
} from "../../schemas/invoicing/contacts.js";

/**
 * Format contacts as markdown
 */
function formatContactsMarkdown(contacts: Contact[]): string {
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
function formatContactMarkdown(contact: Contact): string {
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

  if (contact.notes) {
    lines.push("", "### Notes", contact.notes);
  }

  return lines.join("\n");
}

/**
 * Register all contact-related tools
 */
export function registerContactTools(server: McpServer): void {
  // List Contacts
  server.registerTool(
    "holded_invoicing_list_contacts",
    {
      title: "List Holded Contacts",
      description: `List all contacts from Holded (clients, suppliers, etc.).

Returns paginated list of contacts (max 500 per page). Use page parameter to navigate through results.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of contacts with id, name, email, phone, type, and other details.`,
      inputSchema: ListContactsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListContactsInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.page > 1) {
          queryParams.page = params.page;
        }

        const contacts = await makeApiRequest<Contact[]>(
          "invoicing",
          "contacts",
          "GET",
          undefined,
          queryParams
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatContactsMarkdown(contacts)
            : JSON.stringify(contacts, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { contacts, count: contacts.length, page: params.page },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Get Contact
  server.registerTool(
    "holded_invoicing_get_contact",
    {
      title: "Get Holded Contact",
      description: `Get a specific contact by ID from Holded.

Args:
  - contact_id (string): The contact ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Contact details including name, email, phone, addresses, and custom fields.`,
      inputSchema: GetContactInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetContactInput) => {
      try {
        const contact = await makeApiRequest<Contact>(
          "invoicing",
          `contacts/${params.contact_id}`,
          "GET"
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatContactMarkdown(contact)
            : JSON.stringify(contact, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: toStructuredContent(contact),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Create Contact
  server.registerTool(
    "holded_invoicing_create_contact",
    {
      title: "Create Holded Contact",
      description: `Create a new contact in Holded.

Args:
  - name (string): Contact name (required)
  - email (string): Email address
  - phone (string): Phone number
  - type ('client' | 'supplier' | 'lead' | 'debtor' | 'creditor'): Contact type
  - And other optional fields for address, social networks, defaults, etc.

Returns:
  The created contact with its assigned ID.`,
      inputSchema: CreateContactInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateContactInput) => {
      try {
        const contact = await makeApiRequest<Contact>(
          "invoicing",
          "contacts",
          "POST",
          params
        );

        return {
          content: [
            {
              type: "text",
              text: `Contact created successfully.\n\n${JSON.stringify(contact, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(contact),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Update Contact
  server.registerTool(
    "holded_invoicing_update_contact",
    {
      title: "Update Holded Contact",
      description: `Update an existing contact in Holded. Only provided fields will be updated.

Args:
  - contact_id (string): The contact ID to update (required)
  - name (string): Contact name
  - email (string): Email address
  - phone (string): Phone number
  - And other optional fields to update

Returns:
  The updated contact.`,
      inputSchema: UpdateContactInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: UpdateContactInput) => {
      try {
        const { contact_id, ...updateData } = params;
        const contact = await makeApiRequest<Contact>(
          "invoicing",
          `contacts/${contact_id}`,
          "PUT",
          updateData
        );

        return {
          content: [
            {
              type: "text",
              text: `Contact updated successfully.\n\n${JSON.stringify(contact, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(contact),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Delete Contact
  server.registerTool(
    "holded_invoicing_delete_contact",
    {
      title: "Delete Holded Contact",
      description: `Delete a contact from Holded.

Args:
  - contact_id (string): The contact ID to delete (required)

Returns:
  Confirmation of deletion.`,
      inputSchema: DeleteContactInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: DeleteContactInput) => {
      try {
        await makeApiRequest<void>(
          "invoicing",
          `contacts/${params.contact_id}`,
          "DELETE"
        );

        return {
          content: [
            {
              type: "text",
              text: `Contact ${params.contact_id} deleted successfully.`,
            },
          ],
          structuredContent: { deleted: true, id: params.contact_id },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // List Contact Groups
  server.registerTool(
    "holded_invoicing_list_contact_groups",
    {
      title: "List Holded Contact Groups",
      description: `List all contact groups from Holded.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of contact groups with id and name.`,
      inputSchema: ListContactGroupsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListContactGroupsInput) => {
      try {
        const groups = await makeApiRequest<ContactGroup[]>(
          "invoicing",
          "contactgroups",
          "GET"
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (!groups.length) {
            textContent = "No contact groups found.";
          } else {
            const lines = ["# Contact Groups", "", `Found ${groups.length} groups:`, ""];
            for (const group of groups) {
              lines.push(`- **${group.name}** (ID: ${group.id})`);
            }
            textContent = lines.join("\n");
          }
        } else {
          textContent = JSON.stringify(groups, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { groups, count: groups.length },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Get Contact Group
  server.registerTool(
    "holded_invoicing_get_contact_group",
    {
      title: "Get Holded Contact Group",
      description: `Get a specific contact group by ID from Holded.

Args:
  - group_id (string): The contact group ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Contact group details.`,
      inputSchema: GetContactGroupInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetContactGroupInput) => {
      try {
        const group = await makeApiRequest<ContactGroup>(
          "invoicing",
          `contactgroups/${params.group_id}`,
          "GET"
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? `# ${group.name}\n\n**ID**: ${group.id}`
            : JSON.stringify(group, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: toStructuredContent(group),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Create Contact Group
  server.registerTool(
    "holded_invoicing_create_contact_group",
    {
      title: "Create Holded Contact Group",
      description: `Create a new contact group in Holded.

Args:
  - name (string): Contact group name (required)
  - pos (number): Position/order in the list

Returns:
  The created contact group with its assigned ID.`,
      inputSchema: CreateContactGroupInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateContactGroupInput) => {
      try {
        const group = await makeApiRequest<ContactGroup>(
          "invoicing",
          "contactgroups",
          "POST",
          params
        );

        return {
          content: [
            {
              type: "text",
              text: `Contact group created successfully.\n\n${JSON.stringify(group, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(group),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Update Contact Group
  server.registerTool(
    "holded_invoicing_update_contact_group",
    {
      title: "Update Holded Contact Group",
      description: `Update an existing contact group in Holded. Only provided fields will be updated.

Args:
  - group_id (string): The contact group ID to update (required)
  - name (string): Contact group name
  - pos (number): Position/order in the list

Returns:
  The updated contact group.`,
      inputSchema: UpdateContactGroupInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: UpdateContactGroupInput) => {
      try {
        const { group_id, ...updateData } = params;
        const group = await makeApiRequest<ContactGroup>(
          "invoicing",
          `contactgroups/${group_id}`,
          "PUT",
          updateData
        );

        return {
          content: [
            {
              type: "text",
              text: `Contact group updated successfully.\n\n${JSON.stringify(group, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(group),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Delete Contact Group
  server.registerTool(
    "holded_invoicing_delete_contact_group",
    {
      title: "Delete Holded Contact Group",
      description: `Delete a contact group from Holded.

Args:
  - group_id (string): The contact group ID to delete (required)

Returns:
  Confirmation of deletion.`,
      inputSchema: DeleteContactGroupInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: DeleteContactGroupInput) => {
      try {
        await makeApiRequest<void>(
          "invoicing",
          `contactgroups/${params.group_id}`,
          "DELETE"
        );

        return {
          content: [
            {
              type: "text",
              text: `Contact group ${params.group_id} deleted successfully.`,
            },
          ],
          structuredContent: { deleted: true, id: params.group_id },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

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
    async (params: ListContactAttachmentsInput) => {
      try {
        const attachments = await makeApiRequest<Array<string>>(
          "invoicing",
          `contacts/${params.contact_id}/attachments/list`,
          "GET"
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (!attachments.length) {
            textContent = `No attachments found for contact ${params.contact_id}.`;
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
          structuredContent: { attachments, count: attachments.length, contactId: params.contact_id },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
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
    async (params: GetContactAttachmentInput) => {
      try {
        const result = await makeApiRequest<string | { url?: string; data?: string; [key: string]: unknown }>(
          "invoicing",
          `contacts/${params.contact_id}/attachments/get`,
          "GET",
          undefined,
          { filename: params.filename }
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (typeof result === "string") {
            textContent = `# Contact Attachment\n\n**File**: ${params.filename}\n**Data**: ${result.substring(0, 100)}...`;
          } else {
            textContent = result.url
              ? `# Contact Attachment\n\n**File**: ${params.filename}\n**URL**: ${result.url}`
              : `# Contact Attachment\n\n**File**: ${params.filename}\nAttachment data available.`;
          }
        } else {
          textContent = JSON.stringify(result, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { contactId: params.contact_id, filename: params.filename, data: result },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Upload Contact Attachment
  server.registerTool(
    "holded_invoicing_upload_contact_attachment",
    {
      title: "Upload Holded Contact Attachment",
      description: `Upload an attachment to a contact in Holded.

Args:
  - contact_id (string): The contact ID to upload attachment to (required)
  - file_content (string): File content as base64 encoded string (required)
  - file_name (string): File name (required)

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
    async (params: UploadContactAttachmentInput) => {
      try {
        const { contact_id, file_content, file_name } = params;

        // Convert base64 to buffer
        const fileBuffer = Buffer.from(file_content, "base64");

        const result = await makeMultipartApiRequest<{ status: number; info: string; [key: string]: unknown }>(
          "invoicing",
          `contacts/${contact_id}/attachments`,
          fileBuffer,
          file_name
        );

        return {
          content: [
            {
              type: "text",
              text: `Contact attachment uploaded successfully.\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
          structuredContent: { uploaded: true, contactId: contact_id, fileName: file_name, ...result },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );
}
