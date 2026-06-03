import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AppConfigService } from '../../infrastructure/config/app-config.service';
import { JwtPayload } from '@taxai/shared';

export const JWT_REFRESH_STRATEGY = 'jwt-refresh';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, JWT_REFRESH_STRATEGY) {
  constructor(config: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.jwtRefreshSecret,
      passReqToCallback: true, // We need the raw token for rotation verification
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<JwtPayload & { rawToken: string }> {
    const rawToken = req.body.refreshToken;
    return { ...payload, rawToken };
  }
}