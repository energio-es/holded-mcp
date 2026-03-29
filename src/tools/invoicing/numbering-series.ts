/**
 * Numbering Series tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { NumberingSeries } from "../../types.js";
import {
  GetNumberingSeriesInputSchema,
  CreateNumberingSeriesInputSchema,
  UpdateNumberingSeriesInputSchema,
  DeleteNumberingSeriesInputSchema,
  GetNumberingSeriesInput,
  CreateNumberingSeriesInput,
  UpdateNumberingSeriesInput,
  DeleteNumberingSeriesInput,
} from "../../schemas/invoicing/numbering-series.js";

/**
 * Register all numbering series-related tools
 */
export function registerNumberingSeriesTools(server: McpServer): void {
  // Get Numbering Series
  server.registerTool(
    "holded_invoicing_get_numbering_series",
    {
      title: "Get Holded Numbering Series",
      description: `Get numbering series for a document type in Holded.

Args:
  - doc_type (string): Document type (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of numbering series with id, name, prefix, suffix, and next number.`,
      inputSchema: GetNumberingSeriesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetNumberingSeriesInput) => {
      try {
        const series = await makeApiRequest<NumberingSeries[]>(
          "invoicing",
          `numberseries/${params.doc_type}`,
          "GET"
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (!series.length) {
            textContent = `No numbering series found for ${params.doc_type}.`;
          } else {
            const lines = [`# Numbering Series for ${params.doc_type}`, "", `Found ${series.length} series:`, ""];
            for (const s of series) {
              lines.push(`## ${s.name}`);
              lines.push(`- **ID**: ${s.id}`);
              if (s.prefix) lines.push(`- **Prefix**: ${s.prefix}`);
              if (s.suffix) lines.push(`- **Suffix**: ${s.suffix}`);
              lines.push(`- **Next Number**: ${s.nextNumber}`);
              lines.push("");
            }
            textContent = lines.join("\n");
          }
        } else {
          textContent = JSON.stringify(series, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { series, count: series.length, docType: params.doc_type },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Create Numbering Series
  server.registerTool(
    "holded_invoicing_create_numbering_serie",
    {
      title: "Create Holded Numbering Series",
      description: `Create a new numbering series for a document type in Holded.

Args:
  - doc_type (string): Document type (required)
  - name (string): Series name (required)
  - format (string): Format string for document numbers (e.g., 'F17%%%%')
  - last (integer): Last number used in the series
  - type (string): Document type (optional, already in path)

Returns:
  The created numbering series.`,
      inputSchema: CreateNumberingSeriesInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateNumberingSeriesInput) => {
      try {
        const { doc_type, ...seriesData } = params;
        const series = await makeApiRequest<NumberingSeries>(
          "invoicing",
          `numberseries/${doc_type}`,
          "POST",
          seriesData
        );

        return {
          content: [
            {
              type: "text",
              text: `Numbering series created successfully.\n\n${JSON.stringify(series, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(series),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Update Numbering Series
  server.registerTool(
    "holded_invoicing_update_numbering_serie",
    {
      title: "Update Holded Numbering Series",
      description: `Update an existing numbering series in Holded.

Args:
  - doc_type (string): Document type (required)
  - numbering_series_id (string): The numbering series ID to update (required)
  - name (string): Series name
  - format (string): Format string for document numbers
  - last (string): Last number used in the series (string format)

Returns:
  The updated numbering series.`,
      inputSchema: UpdateNumberingSeriesInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: UpdateNumberingSeriesInput) => {
      try {
        const { doc_type, numbering_series_id, ...updateData } = params;
        const series = await makeApiRequest<NumberingSeries>(
          "invoicing",
          `numberseries/${doc_type}/${numbering_series_id}`,
          "PUT",
          updateData
        );

        return {
          content: [
            {
              type: "text",
              text: `Numbering series updated successfully.\n\n${JSON.stringify(series, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(series),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Delete Numbering Series
  server.registerTool(
    "holded_invoicing_delete_numbering_serie",
    {
      title: "Delete Holded Numbering Series",
      description: `Delete a numbering series from Holded.

Args:
  - doc_type (string): Document type (required)
  - numbering_series_id (string): The numbering series ID to delete (required)

Returns:
  Confirmation of deletion.`,
      inputSchema: DeleteNumberingSeriesInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: DeleteNumberingSeriesInput) => {
      try {
        await makeApiRequest<void>(
          "invoicing",
          `numberseries/${params.doc_type}/${params.numbering_series_id}`,
          "DELETE"
        );

        return {
          content: [
            {
              type: "text",
              text: `Numbering series ${params.numbering_series_id} deleted successfully.`,
            },
          ],
          structuredContent: { deleted: true, id: params.numbering_series_id, docType: params.doc_type },
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
