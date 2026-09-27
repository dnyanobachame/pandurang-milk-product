import { z } from 'zod';

export const ProductFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Product name is required').max(200),
    shortDescription: z.string().trim().max(300).optional().nullable(),
    description: z.string().trim().max(4000).optional().nullable(),
    ingredients: z.string().trim().max(2000).optional().nullable(),
    categoryId: z.string().uuid('Please select a category'),
    sku: z.string().trim().max(50).optional().nullable(),
    unit: z.string().trim().min(1, 'Please select a unit'),
    netQuantity: z.coerce.number().positive().optional().nullable(),

    sellingPrice: z.coerce.number().positive('Price must be greater than 0'),
    mrp: z.coerce.number().positive().optional().nullable(),
    discountType: z.enum(['percentage', 'fixed']).optional().nullable(),
    discountValue: z.coerce.number().min(0, 'Discount cannot be negative').default(0),

    availableQuantity: z.coerce.number().min(0, 'Stock cannot be negative'),
    minStockLevel: z.coerce.number().min(0, 'Low stock threshold cannot be negative'),
    minOrderQuantity: z.coerce.number().min(1, 'Minimum order quantity must be at least 1'),
    maxOrderQuantity: z.coerce.number().positive().optional().nullable(),

    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    displayOrder: z.coerce.number().int().min(0).default(0),
    deliveryAvailable: z.boolean().default(true),
    pickupAvailable: z.boolean().default(false),
    deliveryDistricts: z.array(z.string()).default(['Latur']),

    imageUrl: z.string().url().optional().nullable(),
  })
  .refine((v) => !v.mrp || v.mrp >= v.sellingPrice, {
    message: 'MRP must be greater than or equal to the selling price',
    path: ['mrp'],
  })
  .refine(
    (v) => !v.maxOrderQuantity || v.maxOrderQuantity >= v.minOrderQuantity,
    {
      message: 'Maximum order quantity must be greater than or equal to minimum',
      path: ['maxOrderQuantity'],
    }
  );

export type ProductFormValues = z.infer<typeof ProductFormSchema>;
