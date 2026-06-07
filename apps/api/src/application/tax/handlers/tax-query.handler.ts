import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetTaxEstimateQuery, GetTaxRecordByIdQuery } from '../commands/tax.commands';
import { ITaxRecordRepository, TAX_RECORD_REPOSITORY } from '../../../domain/repositories/tax-record.repository.interface';
import { TaxRecordEntity } from '../../../domain/entities/tax-record.entity';
import { ResourceNotFoundException } from '@taxai/shared';

@QueryHandler(GetTaxEstimateQuery)
export class GetTaxEstimateHandler
  implements IQueryHandler<GetTaxEstimateQuery, TaxRecordEntity | null>
{
  constructor(
    @Inject(TAX_RECORD_REPOSITORY) private readonly taxRepo: ITaxRecordRepository,
  ) {}

  async execute(query: GetTaxEstimateQuery): Promise<TaxRecordEntity | null> {
    const records = await this.taxRepo.findByUserId(
      query.userId,
      query.tenantId,
      query.assessmentYear,
    );
    return records[0] ?? null;
  }
}

@QueryHandler(GetTaxRecordByIdQuery)
export class GetTaxRecordByIdHandler
  implements IQueryHandler<GetTaxRecordByIdQuery, TaxRecordEntity>
{
  constructor(
    @Inject(TAX_RECORD_REPOSITORY) private readonly taxRepo: ITaxRecordRepository,
  ) {}

  async execute(query: GetTaxRecordByIdQuery): Promise<TaxRecordEntity> {
    const record = await this.taxRepo.findById(query.taxRecordId, query.tenantId);
    if (!record || record.userId !== query.userId) {
      throw new ResourceNotFoundException('TaxRecord', query.taxRecordId);
    }
    return record;
  }
}