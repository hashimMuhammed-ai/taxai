import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { AppConfigService } from '../config/app-config.service';
import { multiTenantPlugin } from './plugins/multi-tenant.plugin';

import { UserSchemaClass, UserSchema } from './schemas/user.schema';
import { DocumentSchemaClass, DocumentSchema} from './schemas/document.schema';
import { TaxRecordSchemaClass, TaxRecordSchema} from './schemas/tax-record.schema';
import {GstRecordSchemaClass, GstRecordSchema} from './schemas/gst-record.schema';
import { FilingSchemaClass, FilingSchema } from './schemas/filing.schema';
import { AuditLogSchemaClass, AuditLogSchema } from './schemas/audit-log.schema';
import { TenantSchemaClass, TenantSchema } from './schemas/tenant.schema';

import { UserRepository } from './repositories/user.repository';
import { DocumentRepository } from './repositories/document.repository';
import { TaxRecordRepository } from './repositories/tax-record.repository';
import { GstRecordRepository } from './repositories/gst-record.repository';
import { FilingRepository } from './repositories/filing.repository';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { TenantRepository } from './repositories/tenant.repository';

import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { DOCUMENT_REPOSITORY } from '../../domain/repositories/document.repository.interface';
import { TAX_RECORD_REPOSITORY } from '../../domain/repositories/tax-record.repository.interface';
import { GST_RECORD_REPOSITORY } from '../../domain/repositories/gst-record.repository.interface';
import { FILING_REPOSITORY } from '../../domain/repositories/filing.repository.interface';
import { AUDIT_LOG_REPOSITORY } from '../../domain/repositories/audit-log.repository.interface';
import { TENANT_REPOSITORY } from '../../domain/repositories/tenant.repository.interface';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        // Apply multi-tenant plugin to ALL schemas globally before any schema registers
        mongoose.plugin(multiTenantPlugin);

        return {
          uri: config.mongoUri,
          dbName: 'taxai',
          maxPoolSize: config.isProduction ? 20 : 5,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          heartbeatFrequencyMS: 10000,
        };
      },
    }),
    MongooseModule.forFeature([
      { name: UserSchemaClass.name, schema: UserSchema },
      { name: DocumentSchemaClass.name, schema: DocumentSchema },
      { name: TaxRecordSchemaClass.name, schema: TaxRecordSchema },
      { name: GstRecordSchemaClass.name, schema: GstRecordSchema },
      { name: FilingSchemaClass.name,    schema: FilingSchema    },
      { name: AuditLogSchemaClass.name,  schema: AuditLogSchema  },
      { name: TenantSchemaClass.name,    schema: TenantSchema    },
    ]),
  ],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    {
      provide: DOCUMENT_REPOSITORY,
      useClass: DocumentRepository,
    },
    {
      provide: TAX_RECORD_REPOSITORY,
      useClass: TaxRecordRepository,
    },
    {
      provide: GST_RECORD_REPOSITORY,
      useClass: GstRecordRepository,
    },
    {
      provide: FILING_REPOSITORY,
      useClass: FilingRepository,
    },
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: AuditLogRepository,
    },
    {
      provide: TENANT_REPOSITORY,
      useClass: TenantRepository,
    },
  ],
  exports: [USER_REPOSITORY, DOCUMENT_REPOSITORY, TAX_RECORD_REPOSITORY, GST_RECORD_REPOSITORY, 
    FILING_REPOSITORY, AUDIT_LOG_REPOSITORY, TENANT_REPOSITORY, MongooseModule],
})
export class DatabaseModule {}