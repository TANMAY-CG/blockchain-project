import { z } from 'zod';

export const IngestWarrantyEventSchema = z.object({
  eventType: z.enum(['REGISTER', 'RENEW']),
  warrantyRootId: z.string().min(1),
  warrantyId: z.string().min(1),
  versionNo: z.number().int().positive(),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
  }),
  product: z.object({
    model: z.string().min(1),
    serialNumber: z.string().min(1),
    imei: z.string().min(1),
    productId: z.string().optional(),
  }),
  purchase: z
    .object({
      storeLocation: z.string().optional(),
      proofOfPurchase: z
        .object({
          fileName: z.string(),
          url: z.string(),
          mimeType: z.string(),
          size: z.number(),
        })
        .optional(),
    })
    .optional(),
  warranty: z.object({
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    purchaseDate: z.string().optional(),
    planType: z.enum(['STANDARD', 'EXTENDED']),
    notes: z.string().optional(),
  }),
});

export type IngestWarrantyEventInput = z.infer<typeof IngestWarrantyEventSchema>;

