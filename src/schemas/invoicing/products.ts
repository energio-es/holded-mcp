/**
 * Zod schemas for Product-related operations
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
} from "../common.js";

/**
 * List products input schema
 */
export const ListProductsInputSchema = z.strictObject({
  page: PaginationSchema.shape.page,
  response_format: ResponseFormatSchema,
})

export type ListProductsInput = z.infer<typeof ListProductsInputSchema>;

/**
 * Get product input schema
 */
export const GetProductInputSchema = z.strictObject({
  product_id: IdSchema.describe("The product ID to retrieve"),
  response_format: ResponseFormatSchema,
})

export type GetProductInput = z.infer<typeof GetProductInputSchema>;

/**
 * Pack product schema
 */
export const PackProductSchema = z.strictObject({
  productId: z.string().describe("Product ID in the pack"),
  quantity: z.number().positive().describe("Quantity of this product in the pack"),
})

/**
 * Product variant schema
 */
export const ProductVariantSchema = z.strictObject({
  name: z.string().describe("Variant name"),
  sku: z.string().optional().describe("Variant SKU"),
  barcode: z.string().optional().describe("Variant barcode"),
  price: z.number().optional().describe("Variant price"),
  costPrice: z.number().optional().describe("Variant cost price"),
})

/**
 * Create product input schema
 */
export const CreateProductInputSchema = z.strictObject({
  name: z.string().min(1, { message: "Name is required" }).describe("Product name (required)"),
  sku: z.string().optional().describe("Stock Keeping Unit (SKU)"),
  kind: z
    .enum(["product", "service", "pack"])
    .optional()
    .describe("Product kind: product, service, or pack"),
  type: z.string().optional().describe("Product type/category"),
  desc: z.string().optional().describe("Product description"),
  price: z.number().min(0).optional().describe("Selling price"),
  costPrice: z.number().min(0).optional().describe("Cost price"),
  tax: z.string().optional().describe("Tax rate ID or percentage"),
  stock: z.number().optional().describe("Initial stock quantity"),
  stockControl: z.boolean().optional().describe("Enable stock control"),
  barcode: z.string().optional().describe("Product barcode"),
  weight: z.number().min(0).optional().describe("Product weight"),
  purchasePrice: z.number().min(0).optional().describe("Purchase/supplier price"),
  calculatecost: z.number().optional().describe("Calculated cost value"),
  tags: z.array(z.string()).optional().describe("Product tags"),
  packQuantity: z.number().int().positive().optional().describe("Pack quantity (for pack products)"),
  packProducts: z.array(PackProductSchema).optional().describe("Products in the pack"),
  variants: z.array(ProductVariantSchema).optional().describe("Product variants"),
})

export type CreateProductInput = z.infer<typeof CreateProductInputSchema>;

/**
 * Update product input schema
 */
export const UpdateProductInputSchema = z.strictObject({
  product_id: IdSchema.describe("The product ID to update"),
  name: z.string().min(1).optional().describe("Product name"),
  sku: z.string().optional().describe("Stock Keeping Unit (SKU)"),
  kind: z
    .enum(["product", "service", "pack"])
    .optional()
    .describe("Product kind: product, service, or pack"),
  type: z.string().optional().describe("Product type/category"),
  desc: z.string().optional().describe("Product description"),
  price: z.number().min(0).optional().describe("Selling price"),
  costPrice: z.number().min(0).optional().describe("Cost price"),
  tax: z.string().optional().describe("Tax rate ID or percentage"),
  stockControl: z.boolean().optional().describe("Enable stock control"),
  barcode: z.string().optional().describe("Product barcode"),
  weight: z.number().min(0).optional().describe("Product weight"),
  subtotal: z.number().optional().describe("Product subtotal amount"),
  purchasePrice: z.number().min(0).optional().describe("Purchase/supplier price"),
  tags: z.array(z.string()).optional().describe("Product tags"),
  packQuantity: z.number().int().positive().optional().describe("Pack quantity (for pack products)"),
  packProducts: z.array(PackProductSchema).optional().describe("Products in the pack"),
  variants: z.array(ProductVariantSchema).optional().describe("Product variants"),
})

export type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>;

/**
 * Delete product input schema
 */
export const DeleteProductInputSchema = z.strictObject({
  product_id: IdSchema.describe("The product ID to delete"),
})

export type DeleteProductInput = z.infer<typeof DeleteProductInputSchema>;

/**
 * List products stock input schema
 */
export const ListProductsStockInputSchema = z.strictObject({
  warehouse_id: IdSchema.describe("The warehouse ID to list stock for (required)"),
  page: PaginationSchema.shape.page,
  response_format: ResponseFormatSchema,
})

export type ListProductsStockInput = z.infer<typeof ListProductsStockInputSchema>;

/**
 * Stock update schema - nested structure: stock[warehouseId][productId/variantId] = quantity
 */
export const StockUpdateSchema = z.record(
  z.string(), // warehouseId
  z.record(
    z.string(), // productId or variantId
    z.number() // quantity
  )
);

/**
 * Update product stock input schema
 * Note: The API expects a nested object structure: stock[warehouseId][productId/variantId] = quantity
 */
export const UpdateProductStockInputSchema = z.strictObject({
  product_id: IdSchema.describe("The product ID to update stock for (path parameter)"),
  stock: StockUpdateSchema.describe("Nested object: stock[warehouseId][productId/variantId] = quantity"),
})

export type UpdateProductStockInput = z.infer<typeof UpdateProductStockInputSchema>;

/**
 * Get product main image input schema
 */
export const GetProductImageInputSchema = z.strictObject({
  product_id: IdSchema.describe("The product ID to get the main image for"),
  response_format: ResponseFormatSchema,
});

export type GetProductImageInput = z.infer<typeof GetProductImageInputSchema>;

/**
 * List product images input schema
 */
export const ListProductImagesInputSchema = z.strictObject({
  product_id: IdSchema.describe("The product ID to list images for"),
  response_format: ResponseFormatSchema,
});

export type ListProductImagesInput = z.infer<typeof ListProductImagesInputSchema>;

/**
 * Get product secondary image input schema
 */
export const GetProductSecondaryImageInputSchema = z.strictObject({
  product_id: IdSchema.describe("The product ID"),
  image_file_name: z.string().min(1, { message: "Image file name is required" }).describe("The image file name (required)"),
  response_format: ResponseFormatSchema,
});

export type GetProductSecondaryImageInput = z.infer<typeof GetProductSecondaryImageInputSchema>;

/**
 * Upload product image input schema
 */
export const UploadProductImageInputSchema = z.strictObject({
  product_id: IdSchema.describe("The product ID to upload image to"),
  file_content: z.string().min(1, { message: "File content is required" }).describe("Image file content as base64 encoded string (required)"),
  file_name: z.string().min(1, { message: "File name is required" }).describe("Image file name (required)"),
  set_main: z.boolean().optional().describe("Set this image as the main product image"),
});

export type UploadProductImageInput = z.infer<typeof UploadProductImageInputSchema>;
