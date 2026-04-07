import { Schema, model } from 'mongoose';

export type WarrantyDoc = {
  warrantyRootId: string;
  versionNo: number;
  eventType: 'REGISTER' | 'RENEW';
  previousWarrantyId?: string;
  normalizedEmail: string;
  normalizedSerialNumber: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  product: {
    productId?: string;
    model: string;
    serialNumber: string;
    imei: string;
  };
  // Explicit ID stored inside the Mongo document for easier downstream usage.
  warrantyId: string;
  purchase?: {
    storeLocation?: string;
    proofOfPurchase?: {
      fileName: string;
      url: string;
      mimeType: string;
      size: number;
    };
  };
  warranty: {
    startDate: string; // ISO date string
    endDate: string; // ISO date string
    purchaseDate: string; // ISO date string
    planType: 'STANDARD' | 'EXTENDED';
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

const WarrantySchema = new Schema<WarrantyDoc>(
  {
    warrantyRootId: { type: String, required: true, index: true },
    versionNo: { type: Number, required: true },
    eventType: { type: String, enum: ['REGISTER', 'RENEW'], required: true },
    previousWarrantyId: { type: String, required: false },
    normalizedEmail: { type: String, required: true, index: true },
    normalizedSerialNumber: { type: String, required: true, index: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
    },
    product: {
      productId: { type: String, required: false, index: true },
      model: { type: String, required: true },
      serialNumber: { type: String, required: true },
      imei: { type: String, required: true },
    },
    warrantyId: { type: String, required: true, unique: true, index: true },
    purchase: {
      storeLocation: { type: String, required: false },
      proofOfPurchase: {
        fileName: { type: String, required: true },
        url: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
      },
    },
    warranty: {
      startDate: { type: String, required: true },
      endDate: { type: String, required: true },
      purchaseDate: { type: String, required: true },
      planType: { type: String, enum: ['STANDARD', 'EXTENDED'], required: true },
      notes: { type: String, required: false },
    },
  },
  { timestamps: true }
);

WarrantySchema.index({ warrantyRootId: 1, versionNo: 1 }, { unique: true });

export const Warranty = model<WarrantyDoc>('Warranty', WarrantySchema);

