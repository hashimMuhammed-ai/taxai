import { Schema } from 'mongoose';

/**
 * Applied globally to every Mongoose schema.
 * Ensures tenant isolation across reads, writes and deletes.
 */
export function multiTenantPlugin(schema: Schema): void {
  // ────────────────────────────────────────────────────────────
  // READ
  // ────────────────────────────────────────────────────────────

  function tenantReadHook(this: any) {
    const conditions = this._conditions ?? {};

    if (conditions.tenantId) {
      this.where({
        tenantId: conditions.tenantId,
      });
    }
  }

  schema.pre('find', tenantReadHook);
  schema.pre('findOne', tenantReadHook);
  schema.pre('findOneAndUpdate', tenantReadHook);
  schema.pre('countDocuments', tenantReadHook);


  // ────────────────────────────────────────────────────────────
  // CREATE
  // ────────────────────────────────────────────────────────────

schema.pre('save', function (this: any, next) {
  if (!this.get('tenantId')) {
    return next(
      new Error(
        `[MultiTenant] Cannot save document without tenantId on schema "${this.constructor.modelName}"`,
      ),
    );
  }

  next();
});

  // ────────────────────────────────────────────────────────────
  // DELETE
  // ────────────────────────────────────────────────────────────

  function tenantDeleteHook(this: any) {
    const conditions = this._conditions ?? {};

    if (!conditions.tenantId) {
      throw new Error(
        '[MultiTenant] Refusing cross-tenant delete — tenantId must be present in conditions',
      );
    }
  }

  schema.pre('deleteOne', tenantDeleteHook);
  schema.pre('deleteMany', tenantDeleteHook);
  schema.pre('findOneAndDelete', tenantDeleteHook);
}