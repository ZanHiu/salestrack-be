import { FilterQuery } from 'mongoose';
import { Product, IProduct } from '../models/Product';
import { SalesEntry } from '../models/SalesEntry';
import { notFound } from '../utils/errors';
import * as audit from './audit.service';
import { diff } from './audit.service';
import type {
  CreateProductDto,
  UpdateProductDto,
  ListProductsQuery,
} from '../schemas/product.schema';

interface ListResult {
  data: IProduct[];
  meta: { total: number; page: number; pageSize: number };
}

export interface CategorySummary {
  order: number;
  name: string;
  productCount: number;
}

export async function list(query: ListProductsQuery): Promise<ListResult> {
  const filter: FilterQuery<IProduct> = {};
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  if (query.categoryName) filter.categoryName = query.categoryName;
  if (query.search) filter.name = { $regex: query.search, $options: 'i' };

  const skip = (query.page - 1) * query.pageSize;
  const [data, total] = await Promise.all([
    Product.find(filter)
      .sort({ categoryOrder: 1, name: 1 })
      .skip(skip)
      .limit(query.pageSize),
    Product.countDocuments(filter),
  ]);

  return { data, meta: { total, page: query.page, pageSize: query.pageSize } };
}

export async function getById(id: string): Promise<IProduct> {
  const product = await Product.findById(id);
  if (!product) throw notFound('Không tìm thấy sản phẩm');
  return product;
}

export async function create(dto: CreateProductDto, actorId: string): Promise<IProduct> {
  const product = await Product.create(dto);
  await audit.record({
    userId: actorId,
    action: 'create',
    resource: 'product',
    resourceId: product._id.toString(),
    resourceLabel: `${product.categoryName} · ${product.name}`,
    changes: [
      { field: 'name', after: product.name },
      { field: 'categoryName', after: product.categoryName },
      { field: 'categoryOrder', after: product.categoryOrder },
      ...(product.unit ? [{ field: 'unit', after: product.unit }] : []),
    ],
  });
  return product;
}

export async function update(
  id: string,
  dto: UpdateProductDto,
  actorId: string,
): Promise<IProduct> {
  const before = await Product.findById(id).lean();
  if (!before) throw notFound('Không tìm thấy sản phẩm');

  const product = await Product.findByIdAndUpdate(id, dto, {
    new: true,
    runValidators: true,
  });
  if (!product) throw notFound('Không tìm thấy sản phẩm');

  const changes = diff(
    {
      name: before.name,
      categoryName: before.categoryName,
      categoryOrder: before.categoryOrder,
      unit: before.unit,
      isActive: before.isActive,
    },
    {
      name: product.name,
      categoryName: product.categoryName,
      categoryOrder: product.categoryOrder,
      unit: product.unit,
      isActive: product.isActive,
    },
  );
  if (changes.length > 0) {
    await audit.record({
      userId: actorId,
      action: 'update',
      resource: 'product',
      resourceId: product._id.toString(),
      resourceLabel: `${product.categoryName} · ${product.name}`,
      changes,
    });
  }

  return product;
}

export async function remove(
  id: string,
  actorId: string,
): Promise<{ softDeleted: boolean }> {
  const target = await Product.findById(id);
  if (!target) throw notFound('Không tìm thấy sản phẩm');
  const label = `${target.categoryName} · ${target.name}`;

  const refCount = await SalesEntry.countDocuments({ productId: id });
  if (refCount > 0) {
    const updated = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!updated) throw notFound('Không tìm thấy sản phẩm');
    await audit.record({
      userId: actorId,
      action: 'deactivate',
      resource: 'product',
      resourceId: id,
      resourceLabel: label,
      metadata: { reason: 'has_references', refCount },
    });
    return { softDeleted: true };
  }

  await Product.findByIdAndDelete(id);
  await audit.record({
    userId: actorId,
    action: 'delete',
    resource: 'product',
    resourceId: id,
    resourceLabel: label,
  });
  return { softDeleted: false };
}

export async function renameCategory(
  oldName: string,
  newName: string,
  newOrder: number,
  actorId: string,
): Promise<{ updated: number }> {
  const trimmedNew = newName.trim();
  if (!trimmedNew) {
    throw new Error('Tên nhóm mới không được rỗng');
  }
  if (oldName !== trimmedNew) {
    const conflict = await Product.exists({ categoryName: trimmedNew });
    if (conflict) {
      throw new Error('Nhóm với tên này đã tồn tại');
    }
  }
  const result = await Product.updateMany(
    { categoryName: oldName },
    { $set: { categoryName: trimmedNew, categoryOrder: newOrder } },
  );

  await audit.record({
    userId: actorId,
    action: 'update',
    resource: 'category',
    resourceLabel: trimmedNew,
    changes: [
      { field: 'name', before: oldName, after: trimmedNew },
      { field: 'order', after: newOrder },
    ],
    metadata: { affectedProducts: result.modifiedCount },
  });

  return { updated: result.modifiedCount };
}

export async function deleteCategory(
  name: string,
  actorId: string,
): Promise<{ deleted: number }> {
  const count = await Product.countDocuments({ categoryName: name });
  if (count > 0) {
    throw new Error(`Nhóm còn ${count} sản phẩm. Xóa sản phẩm trước khi xóa nhóm.`);
  }
  await audit.record({
    userId: actorId,
    action: 'delete',
    resource: 'category',
    resourceLabel: name,
  });
  return { deleted: 0 };
}

export async function listCategories(): Promise<CategorySummary[]> {
  const result = await Product.aggregate<{
    _id: { order: number; name: string };
    productCount: number;
  }>([
    {
      $group: {
        _id: { order: '$categoryOrder', name: '$categoryName' },
        productCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.order': 1 } },
  ]);

  return result.map((r) => ({
    order: r._id.order,
    name: r._id.name,
    productCount: r.productCount,
  }));
}
