/**
 * Product tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, makeMultipartApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
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
  ListProductsInput,
  GetProductInput,
  CreateProductInput,
  UpdateProductInput,
  DeleteProductInput,
  ListProductsStockInput,
  UpdateProductStockInput,
  GetProductImageInput,
  ListProductImagesInput,
  GetProductSecondaryImageInput,
  UploadProductImageInput,
} from "../../schemas/invoicing/products.js";

/**
 * Format products as markdown
 */
function formatProductsMarkdown(products: Product[]): string {
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
function formatProductMarkdown(product: Product): string {
  const lines = [`# ${product.name}`, "", `**ID**: ${product.id}`, ""];

  if (product.sku) lines.push(`- **SKU**: ${product.sku}`);
  if (product.kind) lines.push(`- **Kind**: ${product.kind}`);
  if (product.type) lines.push(`- **Type**: ${product.type}`);
  if (product.desc) lines.push(`- **Description**: ${product.desc}`);
  if (product.price !== undefined) lines.push(`- **Price**: ${product.price}`);
  if (product.costPrice !== undefined) lines.push(`- **Cost Price**: ${product.costPrice}`);
  if (product.tax) lines.push(`- **Tax**: ${product.tax}`);
  if (product.stock !== undefined) lines.push(`- **Stock**: ${product.stock}`);
  if (product.stockControl !== undefined) lines.push(`- **Stock Control**: ${product.stockControl}`);
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
  // List Products
  server.registerTool(
    "holded_invoicing_list_products",
    {
      title: "List Holded Products",
      description: `List all products from Holded.

Returns paginated list of products. Use page parameter to navigate through results.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of products with id, name, sku, price, stock, and other details.`,
      inputSchema: ListProductsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListProductsInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.page > 1) {
          queryParams.page = params.page;
        }

        const products = await makeApiRequest<Product[]>(
          "invoicing",
          "products",
          "GET",
          undefined,
          queryParams
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatProductsMarkdown(products)
            : JSON.stringify(products, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { products, count: products.length, page: params.page },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Get Product
  server.registerTool(
    "holded_invoicing_get_product",
    {
      title: "Get Holded Product",
      description: `Get a specific product by ID from Holded.

Args:
  - product_id (string): The product ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Product details including name, sku, price, stock, variants, and custom fields.`,
      inputSchema: GetProductInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetProductInput) => {
      try {
        const product = await makeApiRequest<Product>(
          "invoicing",
          `products/${params.product_id}`,
          "GET"
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatProductMarkdown(product)
            : JSON.stringify(product, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: toStructuredContent(product),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Create Product
  server.registerTool(
    "holded_invoicing_create_product",
    {
      title: "Create Holded Product",
      description: `Create a new product in Holded.

Args:
  - name (string): Product name (required)
  - sku (string): Stock Keeping Unit
  - kind ('product' | 'service' | 'pack'): Product kind
  - price (number): Selling price
  - costPrice (number): Cost price
  - stock (number): Initial stock quantity
  - And other optional fields for variants, custom fields, etc.

Returns:
  The created product with its assigned ID.`,
      inputSchema: CreateProductInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateProductInput) => {
      try {
        const product = await makeApiRequest<Product>(
          "invoicing",
          "products",
          "POST",
          params
        );

        return {
          content: [
            {
              type: "text",
              text: `Product created successfully.\n\n${JSON.stringify(product, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(product),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Update Product
  server.registerTool(
    "holded_invoicing_update_product",
    {
      title: "Update Holded Product",
      description: `Update an existing product in Holded. Only provided fields will be updated.

Args:
  - product_id (string): The product ID to update (required)
  - name (string): Product name
  - sku (string): Stock Keeping Unit
  - price (number): Selling price
  - And other optional fields to update

Returns:
  The updated product.`,
      inputSchema: UpdateProductInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: UpdateProductInput) => {
      try {
        const { product_id, ...updateData } = params;
        const product = await makeApiRequest<Product>(
          "invoicing",
          `products/${product_id}`,
          "PUT",
          updateData
        );

        return {
          content: [
            {
              type: "text",
              text: `Product updated successfully.\n\n${JSON.stringify(product, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(product),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Delete Product
  server.registerTool(
    "holded_invoicing_delete_product",
    {
      title: "Delete Holded Product",
      description: `Delete a product from Holded.

Args:
  - product_id (string): The product ID to delete (required)

Returns:
  Confirmation of deletion.`,
      inputSchema: DeleteProductInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: DeleteProductInput) => {
      try {
        await makeApiRequest<void>(
          "invoicing",
          `products/${params.product_id}`,
          "DELETE"
        );

        return {
          content: [
            {
              type: "text",
              text: `Product ${params.product_id} deleted successfully.`,
            },
          ],
          structuredContent: { deleted: true, id: params.product_id },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

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
    async (params: ListProductsStockInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.page > 1) {
          queryParams.page = params.page;
        }

        const stocks = await makeApiRequest<ProductStock[]>(
          "invoicing",
          `warehouses/${params.warehouse_id}/stock`,
          "GET",
          undefined,
          queryParams
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (!stocks.length) {
            textContent = `No product stock information found for warehouse ${params.warehouse_id}.`;
          } else {
            const lines = ["# Product Stock Levels", "", `**Warehouse ID**: ${params.warehouse_id}`, "", `Found ${stocks.length} products:`, ""];
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
          structuredContent: { stocks, count: stocks.length, page: params.page, warehouseId: params.warehouse_id },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
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
    async (params: UpdateProductStockInput) => {
      try {
        const { product_id, stock } = params;
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
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
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
    async (params: GetProductImageInput) => {
      try {
        const result = await makeApiRequest<{ url?: string; data?: string; [key: string]: unknown }>(
          "invoicing",
          `products/${params.product_id}/image`,
          "GET"
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? result.url
              ? `# Product Main Image\n\n**URL**: ${result.url}`
              : `# Product Main Image\n\nImage data available.`
            : JSON.stringify(result, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { productId: params.product_id, ...result },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
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
    async (params: ListProductImagesInput) => {
      try {
        const images = await makeApiRequest<Array<string> | Array<{ name: string; url?: string; [key: string]: unknown }>>(
          "invoicing",
          `products/${params.product_id}/imagesList`,
          "GET"
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (!images.length) {
            textContent = `No product images found for product ${params.product_id}.`;
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
          structuredContent: { images, count: images.length, productId: params.product_id },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
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
    async (params: GetProductSecondaryImageInput) => {
      try {
        const result = await makeApiRequest<{ url?: string; data?: string; [key: string]: unknown }>(
          "invoicing",
          `products/${params.product_id}/image/${params.image_file_name}`,
          "GET"
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? result.url
              ? `# Product Secondary Image\n\n**File**: ${params.image_file_name}\n**URL**: ${result.url}`
              : `# Product Secondary Image\n\n**File**: ${params.image_file_name}\nImage data available.`
            : JSON.stringify(result, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { productId: params.product_id, imageFileName: params.image_file_name, ...result },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
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
    async (params: UploadProductImageInput) => {
      try {
        const { product_id, file_content, file_name, set_main } = params;

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
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );
}
