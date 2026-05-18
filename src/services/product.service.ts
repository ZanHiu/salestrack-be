import { FilterQuery } from 'mongoose';
import { Product, IProduct } from '../models/Product';
import { SalesEntry } from '../models/SalesEntry';
import { notFound } from '../utils/errors';
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
  if (!product) throw notFound('Khong tim thay san pham');
  return product;
}

export async function create(dto: CreateProductDto): Promise<IProduct> {
  return Product.create(dto);
}

export async function update(id: string, dto: UpdateProductDto): Promise<IProduct> {
  const product = await Product.findByIdAndUpdate(id, dto, {
    new: true,
    runValidators: true,
  });
  if (!product) throw notFound('Khong tim thay san pham');
  return product;
}

export async function remove(id: string): Promise<{ softDeleted: boolean }> {
  const refCount = await SalesEntry.countDocuments({ productId: id });
  if (refCount > 0) {
    const updated = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!updated) throw notFound('Khong tim thay san pham');
    return { softDeleted: true };
  }

  const deleted = await Product.findByIdAndDelete(id);
  if (!deleted) throw notFound('Khong tim thay san pham');
  return { softDeleted: false };
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
