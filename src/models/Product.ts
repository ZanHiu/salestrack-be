import { Schema, model, Document, Types } from 'mongoose';

export interface IProduct extends Document {
  _id: Types.ObjectId;
  name: string;
  categoryName: string;
  categoryOrder: number;
  unit?: string;
  isActive: boolean;
  createdAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 200,
    },
    categoryName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    categoryOrder: {
      type: Number,
      required: true,
      min: 1,
      max: 99,
    },
    unit: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

productSchema.index({ categoryOrder: 1, name: 1 });
productSchema.index({ isActive: 1 });

export const Product = model<IProduct>('Product', productSchema);

export const PRODUCT_CATEGORIES = [
  { order: 1, name: '1. TOBA XANH' },
  { order: 2, name: '2. HC' },
  { order: 3, name: '3. SPRAY' },
  { order: 4, name: '4. DƯỠNG RỄ' },
  { order: 5, name: '5. TRUYỀN THỐNG' },
  { order: 6, name: '6. BVTV' },
  { order: 7, name: '7. KHÁC' },
] as const;
