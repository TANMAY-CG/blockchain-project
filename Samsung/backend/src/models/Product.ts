import { Schema, model } from 'mongoose';

export type ProductDoc = {
  productId: string;
  model: string;
  serialNumber: string;
  imei: string;
  createdAt: Date;
  updatedAt: Date;
};

const ProductSchema = new Schema<ProductDoc>(
  {
    productId: { type: String, required: true, unique: true, index: true },
    model: { type: String, required: true },
    serialNumber: { type: String, required: true },
    imei: { type: String, required: true },
  },
  { timestamps: true }
);

export const Product = model<ProductDoc>('Product', ProductSchema);

