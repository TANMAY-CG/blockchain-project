import { Schema, model } from 'mongoose';

export type OtpTokenDoc = {
  normalizedEmail: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
};

const OtpTokenSchema = new Schema<OtpTokenDoc>(
  {
    normalizedEmail: { type: String, required: true, index: true, unique: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export const OtpToken = model<OtpTokenDoc>('OtpToken', OtpTokenSchema);

