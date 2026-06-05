import { Types, FilterQuery } from 'mongoose';
import { SalesEntry, ISalesEntry } from '../models/SalesEntry';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { notFound } from '../utils/errors';
import * as audit from './audit.service';
import { diff } from './audit.service';
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
  // Manual value (including 0) is explicit user intent — always wins.
  // Only auto-calculate from qty*price when manualActual is not provided.
  if (input.manualActual !== undefined) {
    return input.manualActual;
  }
  if (input.quantity && input.unitPrice) {
    return Math.round((input.quantity * input.unitPrice) / 1_000_000 * 100) / 100;
  }
  return 0;
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

  // Load existing to merge with partial update (so we don't overwrite untouched fields).
  const existing = await SalesEntry.findOne({
    year: dto.year,
    month: dto.month,
    customerId: dto.customerId,
    productId: dto.productId,
  });

  const update: Record<string, unknown> = {
    updatedBy: userId,
  };

  // Defaults only when CREATING a new entry; otherwise leave untouched fields alone.
  if (!existing) {
    update.planAmount = 0;
    update.actualAmount = 0;
  }

  // Only set planAmount if explicitly provided.
  if (dto.planAmount !== undefined) {
    update.planAmount = dto.planAmount;
  }

  // unitPrice / quantity / note: explicit set only.
  if (dto.unitPrice !== undefined) update.unitPrice = dto.unitPrice;
  if (dto.quantity !== undefined) update.quantity = dto.quantity;
  if (dto.note !== undefined) update.note = dto.note;

  // Recalculate actualAmount only if user touched any of: actualAmount, quantity, unitPrice.
  // Merge with existing quantity/unitPrice so partial updates work (e.g. user changes only qty).
  const touchesActual =
    dto.actualAmount !== undefined ||
    dto.quantity !== undefined ||
    dto.unitPrice !== undefined;
  if (touchesActual) {
    update.actualAmount = calculateActualAmount({
      manualActual: dto.actualAmount,
      quantity: dto.quantity ?? existing?.quantity,
      unitPrice: dto.unitPrice ?? existing?.unitPrice,
    });
  }

  // Inline edit on the cell sends actualAmount alone (no qty/price). Treat as switching
  // into "manual mode" for this cell: clear stale qty/unitPrice so detail modal stays
  // consistent with the displayed value.
  const isInlineActualEdit =
    dto.actualAmount !== undefined &&
    dto.quantity === undefined &&
    dto.unitPrice === undefined;

  const updateOps: Record<string, unknown> = { $set: update };
  if (isInlineActualEdit && existing) {
    updateOps.$unset = { quantity: 1, unitPrice: 1 };
  }

  const entry = await SalesEntry.findOneAndUpdate(
    {
      year: dto.year,
      month: dto.month,
      customerId: dto.customerId,
      productId: dto.productId,
    },
    updateOps,
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  const label = `${customer.name} · ${product.name} · T${dto.month}/${dto.year}`;
  if (!existing) {
    await audit.record({
      userId,
      action: 'create',
      resource: 'sales-entry',
      resourceId: entry._id.toString(),
      resourceLabel: label,
      changes: [
        { field: 'planAmount', after: entry.planAmount },
        { field: 'actualAmount', after: entry.actualAmount },
        ...(entry.quantity !== undefined ? [{ field: 'quantity', after: entry.quantity }] : []),
        ...(entry.unitPrice !== undefined ? [{ field: 'unitPrice', after: entry.unitPrice }] : []),
      ],
    });
  } else {
    const changes = diff(
      {
        planAmount: existing.planAmount,
        actualAmount: existing.actualAmount,
        quantity: existing.quantity,
        unitPrice: existing.unitPrice,
        note: existing.note,
      },
      {
        planAmount: entry.planAmount,
        actualAmount: entry.actualAmount,
        quantity: entry.quantity,
        unitPrice: entry.unitPrice,
        note: entry.note,
      },
    );
    if (changes.length > 0) {
      await audit.record({
        userId,
        action: 'update',
        resource: 'sales-entry',
        resourceId: entry._id.toString(),
        resourceLabel: label,
        changes,
      });
    }
  }

  return entry;
}

export async function update(
  id: string,
  dto: UpdateEntryDto,
  userId: string,
): Promise<ISalesEntry> {
  const existing = await SalesEntry.findById(id);
  if (!existing) throw notFound('Không tìm thấy entry');

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
  if (!entry) throw notFound('Không tìm thấy entry');

  const changes = diff(
    {
      planAmount: existing.planAmount,
      actualAmount: existing.actualAmount,
      quantity: existing.quantity,
      unitPrice: existing.unitPrice,
      note: existing.note,
    },
    {
      planAmount: entry.planAmount,
      actualAmount: entry.actualAmount,
      quantity: entry.quantity,
      unitPrice: entry.unitPrice,
      note: entry.note,
    },
  );
  if (changes.length > 0) {
    const [customer, product] = await Promise.all([
      Customer.findById(entry.customerId).select('name').lean(),
      Product.findById(entry.productId).select('name').lean(),
    ]);
    const label = `${customer?.name ?? '?'} · ${product?.name ?? '?'} · T${entry.month}/${entry.year}`;
    await audit.record({
      userId,
      action: 'update',
      resource: 'sales-entry',
      resourceId: entry._id.toString(),
      resourceLabel: label,
      changes,
    });
  }

  return entry;
}

export async function remove(id: string, userId: string): Promise<void> {
  const entry = await SalesEntry.findById(id);
  if (!entry) throw notFound('Không tìm thấy entry');

  const [customer, product] = await Promise.all([
    Customer.findById(entry.customerId).select('name').lean(),
    Product.findById(entry.productId).select('name').lean(),
  ]);
  const label = `${customer?.name ?? '?'} · ${product?.name ?? '?'} · T${entry.month}/${entry.year}`;

  await SalesEntry.findByIdAndDelete(id);
  await audit.record({
    userId,
    action: 'delete',
    resource: 'sales-entry',
    resourceId: id,
    resourceLabel: label,
    changes: [
      { field: 'planAmount', before: entry.planAmount },
      { field: 'actualAmount', before: entry.actualAmount },
    ],
  });
}
