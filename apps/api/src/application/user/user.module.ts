import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { UserController } from '../../presentation/controllers/user.controller';
import {
  UpdateUserProfileHandler,
  ChangePasswordHandler,
  GetUserProfileHandler,
  GetCAsHandler,
} from './handlers/user.handlers';

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [UserController],
  providers: [UpdateUserProfileHandler, ChangePasswordHandler, GetUserProfileHandler, GetCAsHandler],
})
export class UserModule {}