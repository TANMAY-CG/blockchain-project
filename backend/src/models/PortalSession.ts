import { Schema, model } from 'mongoose';

export type PortalSessionDoc = {
  token: string;
  normalizedEmail: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const PortalSessionSchema = new Schema<PortalSessionDoc>(
  {
    token: { type: String, required: true, unique: true, index: true },
    normalizedEmail: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const PortalSession = model<PortalSessionDoc>('PortalSession', PortalSessionSchema);

