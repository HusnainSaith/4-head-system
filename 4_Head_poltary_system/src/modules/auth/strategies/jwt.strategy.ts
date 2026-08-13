import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: { headers?: { cookie?: string } }) => {
          const cookie = request?.headers?.cookie;
          if (!cookie) return null;
          for (const item of cookie.split(';')) {
            const [key, ...value] = item.trim().split('=');
            if (key === '4head_access_token') {
              return decodeURIComponent(value.join('='));
            }
          }
          return null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    try {
      // Use findById instead of findOneWithPermissions
      const user = await this.usersService.findById(payload.sub, [
        'role',
        'department',
      ]);

      if (!user) {
        throw new UnauthorizedException('Invalid token - user not found');
      }

      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        departmentType: user.department?.type ?? null,
        departmentId: user.departmentId ?? null,
        permissions: user.permissions || [],
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
