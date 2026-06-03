import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { AppConfigService } from '../config/app-config.service';
import { multiTenantPlugin } from './plugins/multi-tenant.plugin';
import { UserSchemaClass, UserSchema } from './schemas/user.schema';
import { UserRepository } from './repositories/user.repository';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';

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
      // Day 2+ schemas registered here: DocumentSchema, TaxRecordSchema, etc.
    ]),
  ],
  providers: [
    {
      // Bind domain interface token → concrete Mongoose implementation
      // Services inject via USER_REPOSITORY token, never the class directly
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
  exports: [USER_REPOSITORY, MongooseModule],
})
export class DatabaseModule {}