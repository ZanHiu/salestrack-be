import { Schema, model, Document, Types } from 'mongoose';

export interface ICustomer extends Document {
  _id: Types.ObjectId;
  name: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 200,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
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

customerSchema.index({ isActive: 1 });

export const Customer = model<ICustomer>('Customer', customerSchema);
