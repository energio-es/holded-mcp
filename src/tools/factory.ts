/**
 * CRUD tool factory — registerCrudTools
 *
 * Generates standard list / get / create / update / delete MCP tools
 * from a declarative CrudToolConfig, eliminating boilerplate.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../services/api.js";
import { ResponseFormat } from "../constants.js";
import type { ApiModule } from "../services/api.js";

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
    list?: unknown;
    get?: unknown;
    create?: unknown;
    update?: unknown;
    delete?: unknown;
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
      async (params: Record<string, unknown>) => {
        try {
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

          const text =
            params.response_format === ResponseFormat.MARKDOWN
              ? formatters.list(items)
              : JSON.stringify(items, null, 2);

          return {
            content: [{ type: "text", text }],
            structuredContent: {
              [resourcePlural]: items,
              count: items.length,
              page: params.page,
            },
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: handleApiError(error) }],
            isError: true,
          };
        }
      },
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
      async (params: Record<string, unknown>) => {
        try {
          const id = params[idParam] as string;
          const item = await makeApiRequest<T>(
            module,
            `${endpoint}/${id}`,
            "GET",
          );

          const text =
            params.response_format === ResponseFormat.MARKDOWN
              ? formatters.single(item)
              : JSON.stringify(item, null, 2);

          return {
            content: [{ type: "text", text }],
            structuredContent: toStructuredContent(item),
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: handleApiError(error) }],
            isError: true,
          };
        }
      },
    );
  }
}
