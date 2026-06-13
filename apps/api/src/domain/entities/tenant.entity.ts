import { BaseEntity } from './base.entity';

export interface CreateTenantProps {
  id: string;
  name: string;
  inviteCode: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TenantEntity extends BaseEntity {
  readonly name: string;
  readonly inviteCode: string;

  private constructor(props: CreateTenantProps) {
    super({
      id: props.id,
      tenantId: props.id, // Self-referencing tenantId
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
    this.name = props.name.trim();
    this.inviteCode = props.inviteCode.trim().toUpperCase();
  }

  static create(props: CreateTenantProps): TenantEntity {
    return new TenantEntity(props);
  }

  private toProps(): CreateTenantProps {
    return {
      id: this.id,
      name: this.name,
      inviteCode: this.inviteCode,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
