// Pure domain object — no Mongoose, no NestJS, no framework
export abstract class BaseEntity {
  readonly id: string;
  readonly tenantId: string;   // Multi-tenant isolation baked into every entity
  readonly createdAt: Date;
  readonly updatedAt: Date;

  protected constructor(params: {
    id: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = params.id;
    this.tenantId = params.tenantId;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }
}