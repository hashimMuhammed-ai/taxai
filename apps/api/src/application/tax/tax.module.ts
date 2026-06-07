import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { TaxController } from '../../presentation/controllers/tax.controller';
import { CalculateTaxHandler } from './handlers/calculate-tax.handler';
import { GetTaxEstimateHandler, GetTaxRecordByIdHandler } from './handlers/tax-query.handler';
import { TaxRuleRegistry } from '@taxai/tax-rules';

const CommandHandlers = [CalculateTaxHandler];
const QueryHandlers = [GetTaxEstimateHandler, GetTaxRecordByIdHandler];

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [TaxController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    TaxRuleRegistry,   // Singleton — loaded once at startup with all FY plugins
  ],
  exports: [TaxRuleRegistry],
})
export class TaxModule {}