import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetTaxEstimateQuery, GetTaxRecordByIdQuery } from '../commands/tax.commands';
import { ITaxRecordRepository, TAX_RECORD_REPOSITORY } from '../../../domain/repositories/tax-record.repository.interface';
import { IFilingRepository, FILING_REPOSITORY } from '../../../domain/repositories/filing.repository.interface';
import { TaxRecordEntity } from '../../../domain/entities/tax-record.entity';
import { ResourceNotFoundException, ForbiddenOperationException } from '@taxai/shared';

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
    @Inject(FILING_REPOSITORY) private readonly filingRepo: IFilingRepository,
  ) {}

  async execute(query: GetTaxRecordByIdQuery): Promise<TaxRecordEntity> {
    const record = await this.taxRepo.findById(
      query.taxRecordId,
      query.requesterRole === 'user' ? query.tenantId : undefined,
    );
    if (!record) {
      throw new ResourceNotFoundException('TaxRecord', query.taxRecordId);
    }

    if (query.requesterRole === 'user') {
      if (record.userId !== query.userId) {
        throw new ForbiddenOperationException();
      }
    } else if (query.requesterRole === 'ca') {
      const filings = await this.filingRepo.findByCaId(query.userId);
      const isAssigned = filings.some(f => f.taxRecordId === query.taxRecordId);
      if (!isAssigned) {
        throw new ForbiddenOperationException();
      }
    } else {
      throw new ForbiddenOperationException();
    }

    return record;
  }
}