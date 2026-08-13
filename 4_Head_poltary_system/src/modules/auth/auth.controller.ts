import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response, CookieOptions } from 'express';
import { randomUUID } from 'crypto';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import {
  RefreshTokenDto,
  PasswordResetDto,
  ResetPasswordDto,
} from './dto/refresh-token.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/controllers/base.controller';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() dto: RegisterDto) {
    return this.handleAsyncOperation(this.authService.register(dto));
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'login new users' })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: AuthCredentialsDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setSessionCookies(
      response,
      result.data.accessToken,
      result.data.refreshToken,
    );
    return {
      ...result,
      data: { user: result.data.user },
    };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'refresh the  access token' })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.readCookie(request, '4head_refresh_token');
    const result = await this.authService.refreshToken({
      refreshToken: refreshToken ?? dto.refreshToken,
    });
    this.setSessionCookies(
      response,
      result.data.accessToken,
      result.data.refreshToken,
    );
    return { success: result.success, message: result.message, data: null };
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'logout users' })
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      this.readCookie(request, '4head_refresh_token') ?? dto.refreshToken;
    try {
      return await this.authService.logout(refreshToken);
    } finally {
      response.clearCookie('4head_access_token', this.cookieOptions());
      response.clearCookie('4head_refresh_token', this.cookieOptions());
      response.clearCookie('4head_csrf_token', {
        ...this.cookieOptions(),
        httpOnly: false,
      });
    }
  }

  @Public()
  @Post('password-forgot')
  @ApiOperation({ summary: 'forgot password' })
  @HttpCode(HttpStatus.OK)
  requestPasswordReset(@Body() dto: PasswordResetDto) {
    return this.handleAsyncOperation(
      this.authService.requestPasswordReset(dto),
    );
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'reset password' })
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.handleAsyncOperation(this.authService.resetPassword(dto));
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    };
  }

  private setAccessCookie(response: Response, accessToken: string) {
    response.cookie('4head_access_token', accessToken, {
      ...this.cookieOptions(),
      maxAge: 15 * 60 * 1000,
    });
  }

  private setSessionCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    this.setAccessCookie(response, accessToken);
    response.cookie('4head_refresh_token', refreshToken, {
      ...this.cookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    response.cookie('4head_csrf_token', randomUUID(), {
      ...this.cookieOptions(),
      httpOnly: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private readCookie(request: Request, name: string): string | undefined {
    const header = request.headers.cookie;
    if (!header) return undefined;
    for (const item of header.split(';')) {
      const [key, ...value] = item.trim().split('=');
      if (key === name) return decodeURIComponent(value.join('='));
    }
    return undefined;
  }
}
