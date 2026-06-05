import * as XLSX from 'xlsx';
import { Types } from 'mongoose';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { SalesEntry } from '../models/SalesEntry';
import * as audit from './audit.service';

export interface ImportError {
  row: number;
  reason: string;
}

export interface ImportResult {
  imported: number;
  failed: number;
  errors: ImportError[];
}

const SHEET_NAME = 'KHACH HANG';
const HEADER_ROW_COUNT = 5;
const COL = {
  CUSTOMER: 1,
  CATEGORY: 3,
  PRODUCT: 4,
  MONTH_START: 6,
  MONTH_END: 17,
};

function normName(s: unknown): string {
  return String(s ?? '').trim();
}

function matchKey(s: string): string {
  return s.toUpperCase().replace(/\s+/g, '');
}

function isSummaryRow(row: unknown[]): boolean {
  const c2 = normName(row[2]);
  const c4 = normName(row[4]);
  if (!c2 && !c4) return true;
  if (matchKey(c4).startsWith('TOTAL')) return true;
  if (c2 && Number.isNaN(Number(c2))) return true;
  return false;
}

export async function importFromBuffer(
  buffer: Buffer,
  year: number,
  userId: string,
  opts: { autoCreateCustomers?: boolean } = {},
): Promise<ImportResult> {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[SHEET_NAME];
  if (!sheet) {
    throw new Error(`Khong tim thay sheet "${SHEET_NAME}" trong file`);
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  const customers = await Customer.find({}).lean();
  const products = await Product.find({}).lean();
  const customerByName = new Map<string, Types.ObjectId>();
  for (const c of customers) customerByName.set(matchKey(c.name), c._id);
  const productByName = new Map<string, Types.ObjectId>();
  for (const p of products) productByName.set(matchKey(p.name), p._id);

  const errors: ImportError[] = [];
  const ops: Array<{
    updateOne: {
      filter: Record<string, unknown>;
      update: { $set: Record<string, unknown> };
      upsert: true;
    };
  }> = [];

  let currentCustomerName = '';

  for (let i = HEADER_ROW_COUNT; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawCustomer = normName(row[COL.CUSTOMER]);
    if (rawCustomer) currentCustomerName = rawCustomer;

    if (isSummaryRow(row)) continue;

    const productName = normName(row[COL.PRODUCT]);
    if (!productName || matchKey(productName) === 'SẢNPHẨM') continue;

    if (!currentCustomerName) {
      errors.push({ row: i + 1, reason: 'Khong xac dinh duoc khach hang' });
      continue;
    }

    let customerId = customerByName.get(matchKey(currentCustomerName));
    if (!customerId) {
      if (opts.autoCreateCustomers) {
        const created = await Customer.create({ name: currentCustomerName });
        customerId = created._id;
        customerByName.set(matchKey(currentCustomerName), customerId);
      } else {
        errors.push({
          row: i + 1,
          reason: `Khach hang "${currentCustomerName}" khong ton tai`,
        });
        continue;
      }
    }

    const productId = productByName.get(matchKey(productName));
    if (!productId) {
      errors.push({
        row: i + 1,
        reason: `San pham "${productName}" khong ton tai`,
      });
      continue;
    }

    for (let m = 1; m <= 12; m += 1) {
      const cellIdx = COL.MONTH_START + (m - 1);
      const raw = row[cellIdx];
      const value = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(value) || value <= 0) continue;

      ops.push({
        updateOne: {
          filter: { year, month: m, customerId, productId },
          update: {
            $set: {
              actualAmount: Math.round(value * 100) / 100,
              planAmount: 0,
              updatedBy: new Types.ObjectId(userId),
            },
          },
          upsert: true,
        },
      });
    }
  }

  let imported = 0;
  if (ops.length > 0) {
    try {
      const result = await SalesEntry.bulkWrite(ops, { ordered: false });
      imported = (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0);
    } catch (err: unknown) {
      const bulkErr = err as {
        writeErrors?: Array<{ index: number; errmsg: string }>;
        result?: { nUpserted?: number; nModified?: number };
      };
      if (bulkErr.writeErrors) {
        for (const we of bulkErr.writeErrors) {
          errors.push({ row: we.index, reason: we.errmsg });
        }
        imported =
          (bulkErr.result?.nUpserted ?? 0) + (bulkErr.result?.nModified ?? 0);
      } else {
        throw err;
      }
    }
  }

  await audit.record({
    userId,
    action: 'bulk_import',
    resource: 'sales-entry',
    resourceLabel: `Năm ${year}`,
    metadata: {
      year,
      imported,
      failed: errors.length,
      fileSize: buffer.length,
    },
  });

  return { imported, failed: errors.length, errors };
}
