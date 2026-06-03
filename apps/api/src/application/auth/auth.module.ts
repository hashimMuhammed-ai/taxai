import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AppConfigService } from '../../infrastructure/config/app-config.service';
import { RegisterUserHandler } from './handlers/register-user.handler';
import { LoginUserHandler } from './handlers/login-user.handler';
import { AuthController } from '../../presentation/controllers/auth.controller';
import { JwtAccessStrategy } from '../../presentation/guards/jwt-access.strategy';
import { JwtRefreshStrategy } from '../../presentation/guards/jwt-refresh.strategy';

const CommandHandlers = [RegisterUserHandler, LoginUserHandler];

@Module({
  imports: [
    CqrsModule,
    PassportModule,
    DatabaseModule,
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        // Default secret for access tokens — refresh tokens use a different secret
        secret: config.jwtAccessSecret,
        signOptions: { expiresIn: config.jwtAccessExpiresIn },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [...CommandHandlers, JwtAccessStrategy, JwtRefreshStrategy],
  exports: [JwtModule],
})
export class AuthModule {}