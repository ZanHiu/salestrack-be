import { FilterQuery } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer';
import { SalesEntry } from '../models/SalesEntry';
import { notFound } from '../utils/errors';
import * as audit from './audit.service';
import { diff } from './audit.service';
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
  if (!customer) throw notFound('Không tìm thấy khách hàng');
  return customer;
}

export async function create(dto: CreateCustomerDto, actorId: string): Promise<ICustomer> {
  const customer = await Customer.create(dto);
  await audit.record({
    userId: actorId,
    action: 'create',
    resource: 'customer',
    resourceId: customer._id.toString(),
    resourceLabel: customer.name,
    changes: [
      { field: 'name', after: customer.name },
      ...(customer.phone ? [{ field: 'phone', after: customer.phone }] : []),
      ...(customer.address ? [{ field: 'address', after: customer.address }] : []),
    ],
  });
  return customer;
}

export async function update(
  id: string,
  dto: UpdateCustomerDto,
  actorId: string,
): Promise<ICustomer> {
  const before = await Customer.findById(id).lean();
  if (!before) throw notFound('Không tìm thấy khách hàng');

  const customer = await Customer.findByIdAndUpdate(id, dto, {
    new: true,
    runValidators: true,
  });
  if (!customer) throw notFound('Không tìm thấy khách hàng');

  const changes = diff(
    { name: before.name, phone: before.phone, address: before.address, isActive: before.isActive },
    {
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      isActive: customer.isActive,
    },
  );
  if (changes.length > 0) {
    await audit.record({
      userId: actorId,
      action: 'update',
      resource: 'customer',
      resourceId: customer._id.toString(),
      resourceLabel: customer.name,
      changes,
    });
  }

  return customer;
}

export async function remove(
  id: string,
  actorId: string,
): Promise<{ softDeleted: boolean }> {
  const target = await Customer.findById(id);
  if (!target) throw notFound('Không tìm thấy khách hàng');
  const label = target.name;

  const refCount = await SalesEntry.countDocuments({ customerId: id });
  if (refCount > 0) {
    const updated = await Customer.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!updated) throw notFound('Không tìm thấy khách hàng');
    await audit.record({
      userId: actorId,
      action: 'deactivate',
      resource: 'customer',
      resourceId: id,
      resourceLabel: label,
      metadata: { reason: 'has_references', refCount },
    });
    return { softDeleted: true };
  }

  await Customer.findByIdAndDelete(id);
  await audit.record({
    userId: actorId,
    action: 'delete',
    resource: 'customer',
    resourceId: id,
    resourceLabel: label,
  });
  return { softDeleted: false };
}
