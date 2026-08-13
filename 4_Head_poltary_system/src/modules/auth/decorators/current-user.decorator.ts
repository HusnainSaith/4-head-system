import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.user) {
      throw new Error(
        'No user found in request. Ensure JwtAuthGuard is applied and successful.',
      );
    }

    if (typeof data === 'string') {
      return request.user[data as keyof User];
    }

    return request.user;
  },
);
