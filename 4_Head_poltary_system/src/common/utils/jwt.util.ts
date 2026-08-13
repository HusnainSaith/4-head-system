import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TokenUtil {
  constructor(private readonly jwtService: JwtService) {}

  extractUserIdFromToken(token: string): string {
    try {
      const cleanToken = token.replace(/^Bearer\s+/, '');
      const payload = this.jwtService.verify(cleanToken);
      const userId = payload.sub || payload.id || payload.userId;

      if (!userId) {
        throw new UnauthorizedException(
          'Invalid token: User ID not found in token payload',
        );
      }

      return userId;
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token format');
      }
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      throw new UnauthorizedException('Failed to extract user ID from token');
    }
  }

  extractUserIdFromRequest(request: any): string {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    return this.extractUserIdFromToken(authHeader);
  }

  getTokenPayload(token: string): any {
    try {
      const cleanToken = token.replace(/^Bearer\s+/, '');
      return this.jwtService.verify(cleanToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
