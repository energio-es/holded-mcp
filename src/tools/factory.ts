/**
 * CRUD tool factory — registerCrudTools
 *
 * Generates standard list / get / create / update / delete MCP tools
 * from a declarative CrudToolConfig, eliminating boilerplate.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodType } from "zod";
import { makeApiRequest, toStructuredContent } from "../services/api.js";
import { ResponseFormat } from "../constants.js";
import type { ApiModule } from "../services/api.js";
import { buildToolResponse, withErrorHandling } from "./utilities.js";

/**
 * Configuration for registering CRUD tools for a resource.
 */
export interface CrudToolConfig<T> {
  module: ApiModule;
  toolPrefix: string;
  resource: string;
  resourcePlural: string;
  endpoint: string;
  listEndpoint?: string;
  idParam: string;
  schemas: {
    list?: ZodType;
    get?: ZodType;
    create?: ZodType;
    update?: ZodType;
    delete?: ZodType;
  };
  titles: {
    list?: string;
    get?: string;
    create?: string;
    update?: string;
    delete?: string;
  };
  descriptions: {
    list?: string;
    get?: string;
    create?: string;
    update?: string;
    delete?: string;
  };
  formatters: {
    list: (items: T[]) => string;
    single: (item: T) => string;
  };
  listQueryParams?: (params: Record<string, unknown>) => Record<string, unknown>;
  bodyTransform?: (body: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Register CRUD tools for a resource on the given MCP server.
 *
 * Only tools whose schemas are provided in the config will be registered.
 */
export function registerCrudTools<T>(server: McpServer, config: CrudToolConfig<T>): void {
  const {
    module,
    toolPrefix,
    resource,
    resourcePlural,
    endpoint,
    listEndpoint,
    idParam,
    schemas,
    titles,
    descriptions,
    formatters,
    listQueryParams,
    bodyTransform,
  } = config;

  // ── List ───────────────────────────────────────────────
  if (schemas.list) {
    server.registerTool(
      `${toolPrefix}_list_${resourcePlural}`,
      {
        title: titles.list,
        description: descriptions.list,
        inputSchema: schemas.list,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      withErrorHandling(async (params) => {
        const queryParams: Record<string, unknown> = {};
        if ((params.page as number) > 1) {
          queryParams.page = params.page;
        }
        if (listQueryParams) {
          Object.assign(queryParams, listQueryParams(params));
        }

        const items = await makeApiRequest<T[]>(
          module,
          listEndpoint ?? endpoint,
          "GET",
          undefined,
          queryParams,
        );

        return buildToolResponse(items, params.response_format as ResponseFormat, formatters.list, {
          [resourcePlural]: items,
          count: items.length,
          page: params.page,
        });
      }),
    );
  }

  // ── Get ────────────────────────────────────────────────
  if (schemas.get) {
    server.registerTool(
      `${toolPrefix}_get_${resource}`,
      {
        title: titles.get,
        description: descriptions.get,
        inputSchema: schemas.get,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      withErrorHandling(async (params) => {
        const id = params[idParam] as string;
        const item = await makeApiRequest<T>(
          module,
          `${endpoint}/${id}`,
          "GET",
        );

        return buildToolResponse(item, params.response_format as ResponseFormat, formatters.single);
      }),
    );
  }

  const Resource = resource.charAt(0).toUpperCase() + resource.slice(1);

  // ── Create ─────────────────────────────────────────────
  if (schemas.create) {
    server.registerTool(
      `${toolPrefix}_create_${resource}`,
      {
        title: titles.create,
        description: descriptions.create,
        inputSchema: schemas.create,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      withErrorHandling(async (params) => {
        const { response_format: _response_format, ...body } = params;
        const requestBody = bodyTransform ? bodyTransform(body) : body;
        const item = await makeApiRequest<T>(
          module,
          endpoint,
          "POST",
          requestBody,
        );

        return {
          content: [
            {
              type: "text" as const,
              text: `${Resource} created successfully.\n\n${JSON.stringify(item, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(item) as Record<string, unknown>,
        };
      }),
    );
  }

  // ── Update ─────────────────────────────────────────────
  if (schemas.update) {
    server.registerTool(
      `${toolPrefix}_update_${resource}`,
      {
        title: titles.update,
        description: descriptions.update,
        inputSchema: schemas.update,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      withErrorHandling(async (params) => {
        const id = params[idParam] as string;
        const { [idParam]: _id, response_format: _rf, ...updateData } = params;
        const requestBody = bodyTransform ? bodyTransform(updateData) : updateData;
        const item = await makeApiRequest<T>(
          module,
          `${endpoint}/${id}`,
          "PUT",
          requestBody,
        );

        return {
          content: [
            {
              type: "text" as const,
              text: `${Resource} updated successfully.\n\n${JSON.stringify(item, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(item) as Record<string, unknown>,
        };
      }),
    );
  }

  // ── Delete ─────────────────────────────────────────────
  if (schemas.delete) {
    server.registerTool(
      `${toolPrefix}_delete_${resource}`,
      {
        title: titles.delete,
        description: descriptions.delete,
        inputSchema: schemas.delete,
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      withErrorHandling(async (params) => {
        const id = params[idParam] as string;
        await makeApiRequest<void>(
          module,
          `${endpoint}/${id}`,
          "DELETE",
        );

        return {
          content: [
            {
              type: "text" as const,
              text: `${Resource} ${id} deleted successfully.`,
            },
          ],
          structuredContent: { deleted: true, id },
        };
      }),
    );
  }
}
