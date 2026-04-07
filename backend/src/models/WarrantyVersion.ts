import { Schema, model } from 'mongoose';

export type WarrantyVersionDoc = {
  warrantyRootId: string;
  warrantyId: string;
  versionNo: number;
  eventType: 'REGISTER' | 'RENEW';
  normalizedEmail: string;
  normalizedSerialNumber: string;
  startDate: string;
  endDate: string;
  payloadSnapshot: Record<string, unknown>;
  payloadHash: string;
  previousVersionHash?: string;
  onChainTxHash?: string;
  onChainStatus: 'PENDING' | 'ANCHORED' | 'FAILED';
  certificatePath?: string;
  createdAt: Date;
  updatedAt: Date;
};

const WarrantyVersionSchema = new Schema<WarrantyVersionDoc>(
  {
    warrantyRootId: { type: String, required: true, index: true },
    warrantyId: { type: String, required: true, unique: true, index: true },
    versionNo: { type: Number, required: true },
    eventType: { type: String, enum: ['REGISTER', 'RENEW'], required: true },
    normalizedEmail: { type: String, required: true, index: true },
    normalizedSerialNumber: { type: String, required: true, index: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    payloadSnapshot: { type: Object, required: true },
    payloadHash: { type: String, required: true },
    previousVersionHash: { type: String, required: false },
    onChainTxHash: { type: String, required: false },
    onChainStatus: { type: String, enum: ['PENDING', 'ANCHORED', 'FAILED'], required: true },
    certificatePath: { type: String, required: false },
  },
  { timestamps: true }
);

WarrantyVersionSchema.index({ warrantyRootId: 1, versionNo: 1 }, { unique: true });

export const WarrantyVersion = model<WarrantyVersionDoc>('WarrantyVersion', WarrantyVersionSchema);

