import { z } from 'zod';

export const RegisterWarrantySchema = z.object({
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().min(5),
    email: z.string().min(1).email(),
  }),
  product: z.object({
    productId: z.string().optional(),
    model: z.string().min(1),
    serialNumber: z.string().min(1),
    imei: z.string().min(1),
  }),
  purchase: z.object({
    storeLocation: z.string().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
    proofOfPurchase: z.object({
      fileName: z.string().min(1),
      url: z.string().min(1),
      mimeType: z.string().min(1),
      size: z.number().nonnegative(),
    }),
  }),
  warranty: z.object({
    purchaseDate: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    planType: z.enum(['STANDARD', 'EXTENDED']),
    notes: z.string().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  }),
});

export type RegisterWarrantyInput = z.infer<typeof RegisterWarrantySchema>;

