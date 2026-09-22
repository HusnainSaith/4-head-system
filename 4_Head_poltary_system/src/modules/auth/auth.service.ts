import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import {
  RefreshTokenDto,
  PasswordResetDto,
  ResetPasswordDto,
} from './dto/refresh-token.dto';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RefreshTokenRepository } from './refresh-token.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';

import { SafeLogger } from '../../common/utils/logger.util';
import { ValidationUtil } from '../../common/utils/validation.util';

// Create a type for User without password hash
type UserWithoutPassword = Omit<User, 'passwordHash'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenRepo: RefreshTokenRepository,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  private get refreshTokenRepository() {
    return this.refreshTokenRepo;
  }

  async register(
    dto: RegisterDto,
  ): Promise<{ success: boolean; message: string; user: UserWithoutPassword }> {
    ValidationUtil.validateEmail(dto.email);
    // ValidationUtil.validateString(dto.firstName, 'firstName', 2, 50);
    // ValidationUtil.validateString(dto.lastName, 'lastName', 2, 50);
    ValidationUtil.validatePassword(dto.password);

    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const userResponse = await this.usersService.create({
      email: ValidationUtil.sanitizeString(dto.email.toLowerCase()),
      password: dto.password,
      fullName: ValidationUtil.sanitizeString(dto.fullName),

      roleId: dto.roleId,
    });

    SafeLogger.log(`User registered successfully: ${dto.email}`, 'AuthService');

    // Extract the actual user data from the service response
    const userData = userResponse.data || (userResponse as any);
    const { ...userWithoutPassword } = userData;

    return {
      success: true,
      message: 'User registered successfully',
      user: userWithoutPassword,
    };
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email, {
      includePassword: true,
      relations: ['role', 'department'],
    });
    if (user?.isActive && (await bcrypt.compare(password, user.passwordHash))) {
      return user;
    }
    return null;
  }

  async login(
    dto: AuthCredentialsDto,
  ): Promise<{ success: boolean; message: string; data: LoginResponseDto }> {
    ValidationUtil.validateEmail(dto.email);
    ValidationUtil.validateString(dto.password, 'password', 1);

    const user = await this.usersService.findByEmail(
      dto.email.toLowerCase().trim(),
      {
        includePassword: true,
        relations: ['role', 'department'],
      },
    );
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { passwordHash: _passwordHash, ...userSafe } = user as any;
    const payload = {
      sub: user.id,
      email: user.email,
      departmentCode: (user as any).department?.code ?? null,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });
    const refreshToken = await this.generateRefreshToken(user.id);

    SafeLogger.log(`User logged in successfully: ${dto.email}`, 'AuthService');
    return {
      success: true,
      message: 'Login successful',
      data: { accessToken, refreshToken: refreshToken.token, user: userSafe },
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<{
    success: boolean;
    message: string;
    data: { accessToken: string; refreshToken: string };
  }> {
    ValidationUtil.validateString(dto.refreshToken, 'refreshToken');

    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: dto.refreshToken, isRevoked: false },
      relations: ['user'],
    });

    if (!refreshToken || refreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const revoked = await this.refreshTokenRepository.update(
      { id: refreshToken.id, isRevoked: false },
      { isRevoked: true },
    );
    if (revoked.affected !== 1) {
      throw new UnauthorizedException('Refresh token has already been used');
    }

    const payload = {
      sub: refreshToken.user.id,
      email: refreshToken.user.email,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });
    const nextRefreshToken = await this.generateRefreshToken(
      refreshToken.user.id,
    );

    SafeLogger.log(
      `Token refreshed for user: ${refreshToken.user.email}`,
      'AuthService',
    );
    return {
      success: true,
      message: 'Token refreshed successfully',
      data: { accessToken, refreshToken: nextRefreshToken.token },
    };
  }

  async logout(
    refreshToken?: string,
  ): Promise<{ success: boolean; message: string }> {
    ValidationUtil.validateString(refreshToken, 'refreshToken');

    const result = await this.refreshTokenRepository.update(
      { token: refreshToken },
      { isRevoked: true },
    );

    if (result.affected === 0) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    SafeLogger.log('User logged out successfully', 'AuthService');
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async requestPasswordReset(
    dto: PasswordResetDto,
  ): Promise<{ success: boolean; message: string }> {
    ValidationUtil.validateEmail(dto.email);

    // Always return success to prevent email enumeration attacks
    const user = await this.usersService.findByEmail(
      dto.email.toLowerCase().trim(),
    );

    if (!user) {
      // Don't reveal whether email exists - return success anyway
      return {
        success: true,
        message:
          'If an account exists with this email, a password reset link has been sent.',
      };
    }

    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'password-reset' },
      { expiresIn: '1h' },
    );
    const frontendUrl = this.configService
      .get<string>('FRONTEND_URL', 'http://localhost:5173')
      .replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    await this.notificationsService.send({
      type: 'password_reset',
      title: 'Reset your 4Head ERP password',
      message: 'A password reset was requested for your account.',
      recipientEmail: user.email,
      recipientUserId: user.id,
      sourceType: 'password_reset',
      sourceId: user.id,
      context: { resetUrl, expiresIn: '1 hour' },
    });
    SafeLogger.log(
      `Password reset email queued for: ${dto.email}`,
      'AuthService',
    );
    return {
      success: true,
      message:
        'If an account exists with this email, a password reset link has been sent.',
    };
  }

  async resetPassword(
    dto: ResetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    ValidationUtil.validateString(dto.token, 'token');
    ValidationUtil.validatePassword(dto.password);

    try {
      const payload = await this.jwtService.verifyAsync(dto.token);
      if (payload.type !== 'password-reset') {
        throw new UnauthorizedException('Invalid token type');
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);
      await this.usersService.updatePassword(payload.sub, hashedPassword);

      // Revoke all refresh tokens for this user for security
      await this.refreshTokenRepository.update(
        { userId: payload.sub },
        { isRevoked: true },
      );

      SafeLogger.log(
        `Password reset successful for user ID: ${payload.sub}`,
        'AuthService',
      );
      return {
        success: true,
        message:
          'Password has been changed successfully. Please login with your new password.',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }

  async getCurrentUser(
    userId: string,
  ): Promise<{ success: boolean; message: string; data: any }> {
    const user = await this.usersService.findOne(userId);
    const { ...userWithoutPassword } = user as any;
    return {
      success: true,
      message: 'User details retrieved successfully',
      data: userWithoutPassword,
    };
  }

  async getCurrentUserByEmail(email: string): Promise<any> {
    const user = await this.usersService.findByEmail(email, {
      relations: ['role', 'department'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }

  private async generateRefreshToken(userId: string): Promise<RefreshToken> {
    const token = await this.jwtService.signAsync(
      { sub: userId, type: 'refresh' },
      { expiresIn: '7d' },
    );

    const refreshToken = this.refreshTokenRepository.create({
      token,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return this.refreshTokenRepository.save(refreshToken);
  }

  async getUserWithDetails(userId: string) {
    return this.usersService.findOneWithPermissions(userId);
  }
}
