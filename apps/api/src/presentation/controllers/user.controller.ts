import {
  Controller, Get, Patch, Post, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  IsString, IsOptional, MinLength, MaxLength, Matches,
} from 'class-validator';
import { JwtAuthGuard } from '../../presentation/guards/guards';
import { CurrentUser } from '../../presentation/decorators/current-user.decorator';
import { JwtPayload } from '@taxai/shared';
import {
  UpdateUserProfileCommand,
  ChangePasswordCommand,
  GetUserProfileQuery,
  GetCAsQuery,
} from '../../application/user/commands/user.commands';

class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(50) firstName?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(50) lastName?: string;
  @IsOptional() @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number' })
  phone?: string;
}

class ChangePasswordDto {
  @IsString() @MinLength(1) currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'New password must contain uppercase, lowercase and a number',
  })
  newPassword!: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('cas')
  async getCAs() {
    return this.queryBus.execute(new GetCAsQuery());
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.queryBus.execute(new GetUserProfileQuery(user.sub, user.tenantId));
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Body() dto: UpdateProfileDto, @CurrentUser() user: JwtPayload) {
    return this.commandBus.execute(
      new UpdateUserProfileCommand(
        user.sub,
        user.tenantId,
        dto.firstName,
        dto.lastName,
        dto.phone,
      ),
    );
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: JwtPayload) {
    return this.commandBus.execute(
      new ChangePasswordCommand(
        user.sub,
        user.tenantId,
        dto.currentPassword,
        dto.newPassword,
      ),
    );
  }
}