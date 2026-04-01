/**
 * Product tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, makeMultipartApiRequest } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { Product, ProductStock } from "../../types.js";
import {
  ListProductsInputSchema,
  GetProductInputSchema,
  CreateProductInputSchema,
  UpdateProductInputSchema,
  DeleteProductInputSchema,
  ListProductsStockInputSchema,
  UpdateProductStockInputSchema,
  GetProductImageInputSchema,
  ListProductImagesInputSchema,
  GetProductSecondaryImageInputSchema,
  UploadProductImageInputSchema,
  ListProductsStockInput,
  UpdateProductStockInput,
  GetProductImageInput,
  ListProductImagesInput,
  GetProductSecondaryImageInput,
  UploadProductImageInput,
} from "../../schemas/invoicing/products.js";
import { registerCrudTools } from "../factory.js";
import { withErrorHandling } from "../utilities.js";

/**
 * Format products as markdown
 */
export function formatProductsMarkdown(products: Product[]): string {
  if (!products.length) {
    return "No products found.";
  }

  const lines = ["# Products", "", `Found ${products.length} products:`, ""];

  for (const product of products) {
    lines.push(`## ${product.name}`);
    lines.push(`- **ID**: ${product.id}`);
    if (product.sku) lines.push(`- **SKU**: ${product.sku}`);
    if (product.kind) lines.push(`- **Kind**: ${product.kind}`);
    if (product.price !== undefined) lines.push(`- **Price**: ${product.price}`);
    if (product.stock !== undefined) lines.push(`- **Stock**: ${product.stock}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single product as markdown
 */
export function formatProductMarkdown(product: Product): string {
  const lines = [`# ${product.name}`, "", `**ID**: ${product.id}`, ""];

  if (product.sku) lines.push(`- **SKU**: ${product.sku}`);
  if (product.kind) lines.push(`- **Kind**: ${product.kind}`);
  if (product.typeId) lines.push(`- **Type ID**: ${product.typeId}`);
  if (product.desc) lines.push(`- **Description**: ${product.desc}`);
  if (product.price !== undefined) lines.push(`- **Price**: ${product.price}`);
  if (product.cost !== undefined) lines.push(`- **Cost**: ${product.cost}`);
  if (product.tax) lines.push(`- **Tax**: ${product.tax}`);
  if (product.stock !== undefined) lines.push(`- **Stock**: ${product.stock}`);
  if (product.hasStock !== undefined) lines.push(`- **Has Stock**: ${product.hasStock}`);
  if (product.barcode) lines.push(`- **Barcode**: ${product.barcode}`);
  if (product.weight !== undefined) lines.push(`- **Weight**: ${product.weight}`);

  if (product.variants && product.variants.length > 0) {
    lines.push("", "### Variants");
    for (const variant of product.variants) {
      lines.push(`- **${variant.name}** (ID: ${variant.id})`);
      if (variant.sku) lines.push(`  - SKU: ${variant.sku}`);
      if (variant.price !== undefined) lines.push(`  - Price: ${variant.price}`);
      if (variant.stock !== undefined) lines.push(`  - Stock: ${variant.stock}`);
    }
  }

  if (product.tags && product.tags.length > 0) {
    lines.push("", `**Tags**: ${product.tags.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Register all product-related tools
 */
export function registerProductTools(server: McpServer): void {
  // ── Standard CRUD via factory ─────────────────────────
  registerCrudTools<Product>(server, {
    module: "invoicing",
    toolPrefix: "holded_invoicing",
    resource: "product",
    resourcePlural: "products",
    endpoint: "products",
    idParam: "product_id",
    schemas: {
      list: ListProductsInputSchema,
      get: GetProductInputSchema,
      create: CreateProductInputSchema,
      update: UpdateProductInputSchema,
      delete: DeleteProductInputSchema,
    },
    titles: {
      list: "List Holded Products",
      get: "Get Holded Product",
      create: "Create Holded Product",
      update: "Update Holded Product",
      delete: "Delete Holded Product",
    },
    descriptions: {
      list: `List all products from Holded.

Returns paginated list of products. Use page parameter to navigate through results.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of products with id, name, sku, price, stock, and other details.`,
      get: `Get a specific product by ID from Holded.

Args:
  - product_id (string): The product ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Product details including name, sku, price, stock, variants, and custom fields.`,
      create: `Create a new product in Holded.

Args:
  - name (string): Product name (required)
  - sku (string): Stock Keeping Unit
  - kind ('simple' | 'variants' | 'lots' | 'pack'): Product kind
  - price (number): Selling price
  - cost (number): Cost price
  - stock (number): Initial stock quantity
  - And other optional fields for variants, custom fields, etc.

Returns:
  The created product with its assigned ID.`,
      update: `Update an existing product in Holded. Only provided fields will be updated.

Args:
  - product_id (string): The product ID to update (required)
  - name (string): Product name
  - sku (string): Stock Keeping Unit
  - price (number): Selling price
  - And other optional fields to update

Returns:
  The updated product.`,
      delete: `Delete a product from Holded.

Args:
  - product_id (string): The product ID to delete (required)

Returns:
  Confirmation of deletion.`,
    },
    formatters: {
      list: formatProductsMarkdown,
      single: formatProductMarkdown,
    },
  });

  // ── Manual tools (non-standard endpoints) ─────────────

  // List Products Stock
  server.registerTool(
    "holded_invoicing_list_products_stock",
    {
      title: "List Holded Products Stock",
      description: `List stock levels for products in a specific warehouse in Holded.

Args:
  - warehouse_id (string): The warehouse ID to list stock for (required)
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of products with their stock levels for the specified warehouse.`,
      inputSchema: ListProductsStockInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const typedParams = params as unknown as ListProductsStockInput;
      const queryParams: Record<string, unknown> = {};
      if (typedParams.page > 1) {
        queryParams.page = typedParams.page;
      }

      const stocks = await makeApiRequest<ProductStock[]>(
        "invoicing",
        `warehouses/${typedParams.warehouse_id}/stock`,
        "GET",
        undefined,
        queryParams
      );

      let textContent: string;
      if (typedParams.response_format === ResponseFormat.MARKDOWN) {
        if (!stocks.length) {
          textContent = `No product stock information found for warehouse ${typedParams.warehouse_id}.`;
        } else {
          const lines = ["# Product Stock Levels", "", `**Warehouse ID**: ${typedParams.warehouse_id}`, "", `Found ${stocks.length} products:`, ""];
          for (const stock of stocks) {
            lines.push(`## ${stock.name || stock.productId}`);
            lines.push(`- **ID**: ${stock.productId}`);
            if (stock.sku) lines.push(`- **SKU**: ${stock.sku}`);
            lines.push(`- **Stock**: ${stock.stock}`);
            lines.push("");
          }
          textContent = lines.join("\n");
        }
      } else {
        textContent = JSON.stringify(stocks, null, 2);
      }

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: { stocks, count: stocks.length, page: typedParams.page, warehouseId: typedParams.warehouse_id },
      };
    })
  );

  // Update Product Stock
  server.registerTool(
    "holded_invoicing_update_product_stock",
    {
      title: "Update Holded Product Stock",
      description: `Update stock level for a product in Holded.

Args:
  - product_id (string): The product ID to update stock for (required, path parameter)
  - stock (object): Nested object structure: stock[warehouseId][productId/variantId] = quantity
    Example: { "warehouse1": { "product123": 10, "variant456": 5 } }

Returns:
  Confirmation of stock update.`,
      inputSchema: UpdateProductStockInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { product_id, stock } = params as unknown as UpdateProductStockInput;
      const result = await makeApiRequest<{ status: number; info: string; id: string }>(
        "invoicing",
        `products/${product_id}/stock`,
        "PUT",
        { stock }
      );

      return {
        content: [
          {
            type: "text",
            text: `Product stock updated successfully.\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
        structuredContent: { updated: true, productId: product_id, stock },
      };
    })
  );

  // Get Product Main Image
  server.registerTool(
    "holded_invoicing_get_product_image",
    {
      title: "Get Holded Product Main Image",
      description: `Get the main image of a specific product from Holded.

Args:
  - product_id (string): The product ID to get the main image for (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Product main image data (URL or base64 encoded).`,
      inputSchema: GetProductImageInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const typedParams = params as unknown as GetProductImageInput;
      const result = await makeApiRequest<{ url?: string; data?: string; [key: string]: unknown }>(
        "invoicing",
        `products/${typedParams.product_id}/image`,
        "GET"
      );

      const textContent =
        typedParams.response_format === ResponseFormat.MARKDOWN
          ? result.url
            ? `# Product Main Image\n\n**URL**: ${result.url}`
            : `# Product Main Image\n\nImage data available.`
          : JSON.stringify(result, null, 2);

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: { productId: typedParams.product_id, ...result },
      };
    })
  );

  // List Product Images
  server.registerTool(
    "holded_invoicing_list_product_images",
    {
      title: "List Holded Product Images",
      description: `List all secondary product images from Holded.

Args:
  - product_id (string): The product ID to list images for (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of product image file names or image data.`,
      inputSchema: ListProductImagesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const typedParams = params as unknown as ListProductImagesInput;
      const images = await makeApiRequest<Array<string> | Array<{ name: string; url?: string; [key: string]: unknown }>>(
        "invoicing",
        `products/${typedParams.product_id}/imagesList`,
        "GET"
      );

      let textContent: string;
      if (typedParams.response_format === ResponseFormat.MARKDOWN) {
        if (!images.length) {
          textContent = `No product images found for product ${typedParams.product_id}.`;
        } else {
          const lines = ["# Product Images", "", `Found ${images.length} images:`, ""];
          for (const image of images) {
            if (typeof image === "string") {
              lines.push(`- ${image}`);
            } else {
              lines.push(`- ${image.name || image.url || "Image"}`);
            }
          }
          textContent = lines.join("\n");
        }
      } else {
        textContent = JSON.stringify(images, null, 2);
      }

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: { images, count: images.length, productId: typedParams.product_id },
      };
    })
  );

  // Get Product Secondary Image
  server.registerTool(
    "holded_invoicing_get_product_secondary_image",
    {
      title: "Get Holded Product Secondary Image",
      description: `Get a specific secondary image of a product from Holded.

Args:
  - product_id (string): The product ID (required)
  - image_file_name (string): The image file name (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Product secondary image data (URL or base64 encoded).`,
      inputSchema: GetProductSecondaryImageInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const typedParams = params as unknown as GetProductSecondaryImageInput;
      const result = await makeApiRequest<{ url?: string; data?: string; [key: string]: unknown }>(
        "invoicing",
        `products/${typedParams.product_id}/image/${typedParams.image_file_name}`,
        "GET"
      );

      const textContent =
        typedParams.response_format === ResponseFormat.MARKDOWN
          ? result.url
            ? `# Product Secondary Image\n\n**File**: ${typedParams.image_file_name}\n**URL**: ${result.url}`
            : `# Product Secondary Image\n\n**File**: ${typedParams.image_file_name}\nImage data available.`
          : JSON.stringify(result, null, 2);

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: { productId: typedParams.product_id, imageFileName: typedParams.image_file_name, ...result },
      };
    })
  );

  // Upload Product Image
  server.registerTool(
    "holded_invoicing_upload_product_image",
    {
      title: "Upload Holded Product Image",
      description: `Upload an image to a product in Holded.

Args:
  - product_id (string): The product ID to upload image to (required)
  - file_content (string): Image file content as base64 encoded string (required)
  - file_name (string): Image file name (required)
  - set_main (boolean): Set this image as the main product image

Returns:
  Confirmation of image upload with status and info.`,
      inputSchema: UploadProductImageInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { product_id, file_content, file_name, set_main } = params as unknown as UploadProductImageInput;

      // Convert base64 to buffer
      const fileBuffer = Buffer.from(file_content, "base64");

      const result = await makeMultipartApiRequest<{ status: number; info: string; [key: string]: unknown }>(
        "invoicing",
        `products/${product_id}/image`,
        fileBuffer,
        file_name,
        set_main
      );

      return {
        content: [
          {
            type: "text",
            text: `Product image uploaded successfully.\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
        structuredContent: { uploaded: true, productId: product_id, fileName: file_name, ...result },
      };
    })
  );
}
