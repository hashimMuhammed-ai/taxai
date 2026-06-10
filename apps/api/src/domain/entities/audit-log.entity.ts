import { AuditAction } from '@taxai/shared';

// AuditLog is NOT a BaseEntity — it has no tenantId-scoped updates
// It is append-only: created once, never modified, never deleted
export interface AuditLogProps {
  id: string;
  tenantId: string;
  userId: string;
  action: AuditAction;
  resourceType: string;     // e.g. 'Filing', 'Document', 'TaxRecord'
  resourceId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
}

export class AuditLogEntity {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly action: AuditAction;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly metadata?: Record<string, unknown>;
  readonly occurredAt: Date;

  constructor(props: AuditLogProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.userId = props.userId;
    this.action = props.action;
    this.resourceType = props.resourceType;
    this.resourceId = props.resourceId;
    this.ipAddress = props.ipAddress;
    this.userAgent = props.userAgent;
    this.metadata = props.metadata;
    this.occurredAt = props.occurredAt;
  }
}