import { Schema, model, Document, Types } from 'mongoose';

export interface ISalesEntry extends Document {
  _id: Types.ObjectId;
  year: number;
  month: number;
  customerId: Types.ObjectId;
  productId: Types.ObjectId;
  planAmount: number;
  actualAmount: number;
  unitPrice?: number;
  quantity?: number;
  note?: string;
  updatedBy: Types.ObjectId;
  updatedAt: Date;
}

const salesEntrySchema = new Schema<ISalesEntry>(
  {
    year: {
      type: Number,
      required: true,
      min: 2020,
      max: 2100,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    planAmount: {
      type: Number,
      default: 0,
      min: 0,
      max: 1_000_000,
    },
    actualAmount: {
      type: Number,
      default: 0,
      min: 0,
      max: 1_000_000,
    },
    unitPrice: {
      type: Number,
      min: 0,
      max: 1_000_000_000,
    },
    quantity: {
      type: Number,
      min: 0,
      max: 1_000_000,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  },
);

salesEntrySchema.index(
  { year: 1, customerId: 1, productId: 1, month: 1 },
  { unique: true },
);

salesEntrySchema.index({ year: 1, month: 1 });
salesEntrySchema.index({ year: 1, customerId: 1 });
salesEntrySchema.index({ year: 1, productId: 1 });

export const SalesEntry = model<ISalesEntry>('SalesEntry', salesEntrySchema);
