import {
  Injectable,
  NestMiddleware,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SecurityUtil } from '../utils/security.util';

@Injectable()
export class SecurityValidationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate URL parameters (IDs)
      if (req.params) {
        for (const [key, value] of Object.entries(req.params)) {
          if (key === 'id' || key.endsWith('Id')) {
            SecurityUtil.validateId(value as string);
          }
        }
      }

      // Validate request body
      if (req.body && typeof req.body === 'object') {
        SecurityUtil.validateObject(req.body);
      }

      // Validate query parameters
      if (req.query && typeof req.query === 'object') {
        SecurityUtil.validateObject(req.query);
      }

      next();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
