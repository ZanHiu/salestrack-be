import { Types, PipelineStage } from 'mongoose';
import { SalesEntry } from '../models/SalesEntry';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';

export interface MonthCell {
  month: number;
  plan: number;
  actual: number;
  completionPercent: number | null;
}

export interface ReportRowBase {
  months: MonthCell[];
  yearTotal: { plan: number; actual: number; completionPercent: number | null };
}

export interface ProductReportRow extends ReportRowBase {
  product: {
    id: string;
    name: string;
    categoryName: string;
    categoryOrder: number;
    unit?: string;
  };
}

export interface CustomerReportRow extends ReportRowBase {
  customer: { id: string; name: string };
}

export interface ReportResult<TRow> {
  year: number;
  rows: TRow[];
  grandTotal: { plan: number; actual: number; completionPercent: number | null };
}

function completion(plan: number, actual: number): number | null {
  if (plan === 0) return null;
  return Math.round((actual / plan) * 100);
}

function buildMonths(
  raw: Array<{ month: number; plan: number; actual: number }>,
): MonthCell[] {
  const map = new Map<number, { plan: number; actual: number }>();
  for (const r of raw) map.set(r.month, { plan: r.plan, actual: r.actual });

  const months: MonthCell[] = [];
  for (let m = 1; m <= 12; m += 1) {
    const cell = map.get(m) ?? { plan: 0, actual: 0 };
    months.push({
      month: m,
      plan: cell.plan,
      actual: cell.actual,
      completionPercent: completion(cell.plan, cell.actual),
    });
  }
  return months;
}

function sumGrandTotal(rows: ReportRowBase[]): ReportResult<unknown>['grandTotal'] {
  let plan = 0;
  let actual = 0;
  for (const r of rows) {
    plan += r.yearTotal.plan;
    actual += r.yearTotal.actual;
  }
  return { plan, actual, completionPercent: completion(plan, actual) };
}

export async function byProduct(
  year: number,
  categoryName?: string,
): Promise<ReportResult<ProductReportRow>> {
  const matchProducts = categoryName
    ? await Product.find({ categoryName }, '_id').lean()
    : null;

  const match: PipelineStage.Match['$match'] = { year };
  if (matchProducts) {
    match.productId = { $in: matchProducts.map((p) => p._id) };
  }

  const agg = await SalesEntry.aggregate<{
    _id: Types.ObjectId;
    months: Array<{ month: number; plan: number; actual: number }>;
    yearPlan: number;
    yearActual: number;
    product: {
      _id: Types.ObjectId;
      name: string;
      categoryName: string;
      categoryOrder: number;
      unit?: string;
    };
  }>([
    { $match: match },
    {
      $group: {
        _id: { productId: '$productId', month: '$month' },
        plan: { $sum: '$planAmount' },
        actual: { $sum: '$actualAmount' },
      },
    },
    {
      $group: {
        _id: '$_id.productId',
        months: {
          $push: { month: '$_id.month', plan: '$plan', actual: '$actual' },
        },
        yearPlan: { $sum: '$plan' },
        yearActual: { $sum: '$actual' },
      },
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    { $sort: { 'product.categoryOrder': 1, 'product.name': 1 } },
  ]);

  const rows: ProductReportRow[] = agg.map((r) => ({
    product: {
      id: r.product._id.toString(),
      name: r.product.name,
      categoryName: r.product.categoryName,
      categoryOrder: r.product.categoryOrder,
      unit: r.product.unit,
    },
    months: buildMonths(r.months),
    yearTotal: {
      plan: r.yearPlan,
      actual: r.yearActual,
      completionPercent: completion(r.yearPlan, r.yearActual),
    },
  }));

  return { year, rows, grandTotal: sumGrandTotal(rows) };
}

export interface RawExportEntry {
  customer: string;
  customerOrder: number;
  productName: string;
  categoryName: string;
  categoryOrder: number;
  unit?: string;
  months: number[]; // 12 elements
  total: number;
}

export interface LeanProduct {
  name: string;
  categoryName: string;
  categoryOrder: number;
  unit?: string;
  isActive: boolean;
}

export interface LeanCustomer {
  name: string;
  phone?: string;
  address?: string;
  isActive: boolean;
}

export async function getRawExportData(year: number): Promise<{
  rows: RawExportEntry[];
  products: LeanProduct[];
  customers: LeanCustomer[];
}> {
  const [products, customers, entries] = await Promise.all([
    Product.find({}).sort({ categoryOrder: 1, name: 1 }).lean(),
    Customer.find({}).sort({ name: 1 }).lean(),
    SalesEntry.find({ year }).lean(),
  ]);

  const productById = new Map(products.map((p) => [p._id.toString(), p]));
  const customerById = new Map(customers.map((c) => [c._id.toString(), c]));
  const customerOrderById = new Map(
    customers.map((c, i) => [c._id.toString(), i + 1]),
  );

  // group entries by customer+product
  const grouped = new Map<string, RawExportEntry>();
  for (const e of entries) {
    const cid = e.customerId.toString();
    const pid = e.productId.toString();
    const key = `${cid}::${pid}`;
    const c = customerById.get(cid);
    const p = productById.get(pid);
    if (!c || !p) continue;
    let row = grouped.get(key);
    if (!row) {
      row = {
        customer: c.name,
        customerOrder: customerOrderById.get(cid) ?? 99,
        productName: p.name,
        categoryName: p.categoryName,
        categoryOrder: p.categoryOrder,
        unit: p.unit,
        months: Array(12).fill(0),
        total: 0,
      };
      grouped.set(key, row);
    }
    row.months[e.month - 1] += e.actualAmount;
    row.total += e.actualAmount;
  }

  const rows = Array.from(grouped.values()).sort((a, b) => {
    if (a.customerOrder !== b.customerOrder) return a.customerOrder - b.customerOrder;
    if (a.categoryOrder !== b.categoryOrder) return a.categoryOrder - b.categoryOrder;
    return a.productName.localeCompare(b.productName);
  });

  return { rows, products, customers };
}

export async function byCustomer(
  year: number,
): Promise<ReportResult<CustomerReportRow>> {
  const agg = await SalesEntry.aggregate<{
    _id: Types.ObjectId;
    months: Array<{ month: number; plan: number; actual: number }>;
    yearPlan: number;
    yearActual: number;
    customer: { _id: Types.ObjectId; name: string };
  }>([
    { $match: { year } },
    {
      $group: {
        _id: { customerId: '$customerId', month: '$month' },
        plan: { $sum: '$planAmount' },
        actual: { $sum: '$actualAmount' },
      },
    },
    {
      $group: {
        _id: '$_id.customerId',
        months: {
          $push: { month: '$_id.month', plan: '$plan', actual: '$actual' },
        },
        yearPlan: { $sum: '$plan' },
        yearActual: { $sum: '$actual' },
      },
    },
    {
      $lookup: {
        from: 'customers',
        localField: '_id',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: '$customer' },
    { $sort: { yearActual: -1 } },
  ]);

  const rows: CustomerReportRow[] = agg.map((r) => ({
    customer: { id: r.customer._id.toString(), name: r.customer.name },
    months: buildMonths(r.months),
    yearTotal: {
      plan: r.yearPlan,
      actual: r.yearActual,
      completionPercent: completion(r.yearPlan, r.yearActual),
    },
  }));

  return { year, rows, grandTotal: sumGrandTotal(rows) };
}
