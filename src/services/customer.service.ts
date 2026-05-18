import { FilterQuery } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer';
import { SalesEntry } from '../models/SalesEntry';
import { notFound } from '../utils/errors';
import type {
  CreateCustomerDto,
  UpdateCustomerDto,
  ListCustomersQuery,
} from '../schemas/customer.schema';

interface ListResult {
  data: ICustomer[];
  meta: { total: number; page: number; pageSize: number };
}

export async function list(query: ListCustomersQuery): Promise<ListResult> {
  const filter: FilterQuery<ICustomer> = {};
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  if (query.search) filter.name = { $regex: query.search, $options: 'i' };

  const skip = (query.page - 1) * query.pageSize;
  const [data, total] = await Promise.all([
    Customer.find(filter).sort({ name: 1 }).skip(skip).limit(query.pageSize),
    Customer.countDocuments(filter),
  ]);

  return { data, meta: { total, page: query.page, pageSize: query.pageSize } };
}

export async function getById(id: string): Promise<ICustomer> {
  const customer = await Customer.findById(id);
  if (!customer) throw notFound('Khong tim thay khach hang');
  return customer;
}

export async function create(dto: CreateCustomerDto): Promise<ICustomer> {
  return Customer.create(dto);
}

export async function update(id: string, dto: UpdateCustomerDto): Promise<ICustomer> {
  const customer = await Customer.findByIdAndUpdate(id, dto, {
    new: true,
    runValidators: true,
  });
  if (!customer) throw notFound('Khong tim thay khach hang');
  return customer;
}

export async function remove(id: string): Promise<{ softDeleted: boolean }> {
  const refCount = await SalesEntry.countDocuments({ customerId: id });
  if (refCount > 0) {
    const updated = await Customer.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!updated) throw notFound('Khong tim thay khach hang');
    return { softDeleted: true };
  }

  const deleted = await Customer.findByIdAndDelete(id);
  if (!deleted) throw notFound('Khong tim thay khach hang');
  return { softDeleted: false };
}
