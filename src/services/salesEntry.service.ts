import { Types, FilterQuery } from 'mongoose';
import { SalesEntry, ISalesEntry } from '../models/SalesEntry';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { notFound } from '../utils/errors';
import type {
  UpsertEntryDto,
  UpdateEntryDto,
  ListEntriesQuery,
} from '../schemas/salesEntry.schema';

export function calculateActualAmount(input: {
  manualActual?: number;
  quantity?: number;
  unitPrice?: number;
}): number {
  if (input.manualActual !== undefined && input.manualActual > 0) {
    return input.manualActual;
  }
  if (input.quantity && input.unitPrice) {
    return Math.round((input.quantity * input.unitPrice) / 1_000_000 * 100) / 100;
  }
  return input.manualActual ?? 0;
}

export async function list(query: ListEntriesQuery) {
  const filter: FilterQuery<ISalesEntry> = { year: query.year };
  if (query.customerId) filter.customerId = new Types.ObjectId(query.customerId);
  if (query.productId) filter.productId = new Types.ObjectId(query.productId);
  if (query.month) filter.month = query.month;

  if (query.categoryName) {
    const products = await Product.find({ categoryName: query.categoryName }, '_id').lean();
    filter.productId = { $in: products.map((p) => p._id) };
  }

  const entries = await SalesEntry.find(filter)
    .populate('customerId', 'name')
    .populate('productId', 'name categoryName categoryOrder unit')
    .sort({ month: 1 })
    .lean();

  return entries.map((e) => {
    const customer = e.customerId as unknown as { _id: Types.ObjectId; name: string };
    const product = e.productId as unknown as {
      _id: Types.ObjectId;
      name: string;
      categoryName: string;
      categoryOrder: number;
      unit?: string;
    };
    return {
      id: e._id.toString(),
      year: e.year,
      month: e.month,
      customerId: customer._id.toString(),
      productId: product._id.toString(),
      customer: { id: customer._id.toString(), name: customer.name },
      product: {
        id: product._id.toString(),
        name: product.name,
        categoryName: product.categoryName,
        categoryOrder: product.categoryOrder,
        unit: product.unit,
      },
      planAmount: e.planAmount,
      actualAmount: e.actualAmount,
      unitPrice: e.unitPrice,
      quantity: e.quantity,
      note: e.note,
      updatedAt: e.updatedAt,
    };
  });
}

export async function upsert(dto: UpsertEntryDto, userId: string): Promise<ISalesEntry> {
  const [customer, product] = await Promise.all([
    Customer.findById(dto.customerId),
    Product.findById(dto.productId),
  ]);
  if (!customer) throw notFound('Khong tim thay khach hang');
  if (!product) throw notFound('Khong tim thay san pham');

  const finalActual = calculateActualAmount({
    manualActual: dto.actualAmount,
    quantity: dto.quantity,
    unitPrice: dto.unitPrice,
  });

  const update: Record<string, unknown> = {
    planAmount: dto.planAmount ?? 0,
    actualAmount: finalActual,
    updatedBy: userId,
  };

  if (dto.unitPrice !== undefined) update.unitPrice = dto.unitPrice;
  if (dto.quantity !== undefined) update.quantity = dto.quantity;
  if (dto.note !== undefined) update.note = dto.note;

  const entry = await SalesEntry.findOneAndUpdate(
    {
      year: dto.year,
      month: dto.month,
      customerId: dto.customerId,
      productId: dto.productId,
    },
    { $set: update },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  return entry;
}

export async function update(
  id: string,
  dto: UpdateEntryDto,
  userId: string,
): Promise<ISalesEntry> {
  const existing = await SalesEntry.findById(id);
  if (!existing) throw notFound('Khong tim thay entry');

  if (
    dto.quantity !== undefined ||
    dto.unitPrice !== undefined ||
    dto.actualAmount !== undefined
  ) {
    const q = dto.quantity ?? existing.quantity;
    const p = dto.unitPrice ?? existing.unitPrice;
    const manual = dto.actualAmount;
    dto.actualAmount = calculateActualAmount({
      manualActual: manual,
      quantity: q,
      unitPrice: p,
    });
  }

  const entry = await SalesEntry.findByIdAndUpdate(
    id,
    { $set: { ...dto, updatedBy: userId } },
    { new: true, runValidators: true },
  );
  if (!entry) throw notFound('Khong tim thay entry');
  return entry;
}

export async function remove(id: string): Promise<void> {
  const entry = await SalesEntry.findByIdAndDelete(id);
  if (!entry) throw notFound('Khong tim thay entry');
}
