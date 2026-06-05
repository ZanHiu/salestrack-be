import { Schema, model, Document, Types } from 'mongoose';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'deactivate'
  | 'bulk_import'
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'password_change'
  | 'profile_update';

export type AuditResource =
  | 'sales-entry'
  | 'customer'
  | 'product'
  | 'category'
  | 'user'
  | 'auth';

export interface IAuditChange {
  field: string;
  before?: unknown;
  after?: unknown;
}

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId; // optional for login_failed
  userFullName: string;
  userRole: 'admin' | 'staff' | 'unknown';
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  resourceLabel?: string;
  changes?: IAuditChange[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userFullName: { type: String, required: true },
    userRole: {
      type: String,
      enum: ['admin', 'staff', 'unknown'],
      default: 'unknown',
    },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: String },
    resourceLabel: { type: String },
    changes: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
