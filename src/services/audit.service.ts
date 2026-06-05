import { FilterQuery } from 'mongoose';
import {
  AuditLog,
  IAuditLog,
  AuditAction,
  AuditResource,
  IAuditChange,
} from '../models/AuditLog';
import { User } from '../models/User';
import type { ListAuditQuery } from '../schemas/audit.schema';

export interface RecordArgs {
  userId?: string;
  userFullNameOverride?: string;
  userRoleOverride?: 'admin' | 'staff';
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  resourceLabel?: string;
  changes?: IAuditChange[];
  metadata?: Record<string, unknown>;
}

/**
 * Compute diff between two plain objects, returning only fields that differ.
 * Pass a `fields` list to limit scope (otherwise compares all keys present in either).
 */
export function diff<T extends Record<string, unknown>>(
  before: T | null | undefined,
  after: Partial<T>,
  fields?: (keyof T)[],
): IAuditChange[] {
  const keys = fields ?? Array.from(new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ])) as (keyof T)[];

  const out: IAuditChange[] = [];
  for (const k of keys) {
    const b = before?.[k];
    const a = after[k];
    if (a === undefined) continue;
    if (b === a) continue;
    // Handle ObjectId or Date by string compare
    if (b != null && a != null && String(b) === String(a)) continue;
    out.push({
      field: String(k),
      before: b ?? null,
      after: a ?? null,
    });
  }
  return out;
}

/**
 * Record an audit log entry. Best-effort — failures are logged, not thrown,
 * to avoid breaking the user's actual operation.
 */
export async function record(args: RecordArgs): Promise<void> {
  try {
    let fullName = args.userFullNameOverride ?? 'unknown';
    let role: 'admin' | 'staff' | 'unknown' = args.userRoleOverride ?? 'unknown';

    if (args.userId && !args.userFullNameOverride) {
      const user = await User.findById(args.userId).select('fullName role').lean();
      if (user) {
        fullName = user.fullName;
        role = user.role;
      }
    }

    await AuditLog.create({
      userId: args.userId,
      userFullName: fullName,
      userRole: role,
      action: args.action,
      resource: args.resource,
      resourceId: args.resourceId,
      resourceLabel: args.resourceLabel,
      changes: args.changes,
      metadata: args.metadata,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit] Failed to record:', err);
  }
}

export async function list(query: ListAuditQuery): Promise<{
  data: IAuditLog[];
  meta: { total: number; page: number; pageSize: number };
}> {
  const filter: FilterQuery<IAuditLog> = {};
  if (query.userId) filter.userId = query.userId;
  if (query.resource) filter.resource = query.resource;
  if (query.action) filter.action = query.action;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = query.from;
    if (query.to) filter.createdAt.$lte = query.to;
  }

  const skip = (query.page - 1) * query.pageSize;
  const [data, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.pageSize)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    data: data as unknown as IAuditLog[],
    meta: { total, page: query.page, pageSize: query.pageSize },
  };
}
