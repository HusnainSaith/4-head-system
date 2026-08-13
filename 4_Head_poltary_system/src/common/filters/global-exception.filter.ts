import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface ErrorResponse {
  success: false;
  message: string;
  error: string;
  statusCode: number;
  timestamp: string;
  path: string;
  details?: string[] | Record<string, unknown>;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    this.logError(exception, request, errorResponse);
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;

    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, path, timestamp);
    }

    if (exception instanceof QueryFailedError) {
      return this.handleDatabaseError(exception, path, timestamp);
    }

    if (exception instanceof Error) {
      return this.handleGenericError(exception, path, timestamp);
    }

    return this.handleUnknownError(path, timestamp);
  }

  private handleHttpException(
    exception: HttpException,
    path: string,
    timestamp: string,
  ): ErrorResponse {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const baseResponse: ErrorResponse = {
      success: false,
      message: exception.message,
      error: HttpStatus[status] || 'Unknown Error',
      statusCode: status,
      timestamp,
      path,
    };

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as Record<string, unknown>;

      if ('message' in responseObj) {
        const messages = responseObj.message;
        if (Array.isArray(messages)) {
          baseResponse.message = 'Validation failed';
          baseResponse.details = messages;
        } else {
          baseResponse.message = String(messages);
        }
      }

      if ('error' in responseObj && typeof responseObj.error === 'string') {
        baseResponse.error = responseObj.error;
      }
    }

    return baseResponse;
  }

  private handleDatabaseError(
    exception: QueryFailedError,
    path: string,
    timestamp: string,
  ): ErrorResponse {
    const isDuplicateError =
      exception.message.includes('duplicate key') ||
      exception.message.includes('UNIQUE constraint');

    const isForeignKeyError =
      exception.message.includes('foreign key') ||
      exception.message.includes('FOREIGN KEY constraint');

    const isNotNullError =
      exception.message.includes('NOT NULL') ||
      exception.message.includes('null value');

    if (isDuplicateError) {
      return {
        success: false,
        message: 'Resource already exists',
        error: 'Conflict',
        statusCode: HttpStatus.CONFLICT,
        timestamp,
        path,
      };
    }

    if (isForeignKeyError) {
      return {
        success: false,
        message: 'Referenced resource not found',
        error: 'Bad Request',
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp,
        path,
      };
    }

    if (isNotNullError) {
      return {
        success: false,
        message: 'Required field is missing',
        error: 'Bad Request',
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp,
        path,
      };
    }

    return {
      success: false,
      message: 'Operation could not be completed',
      error: 'Bad Request',
      statusCode: HttpStatus.BAD_REQUEST,
      timestamp,
      path,
    };
  }

  private handleGenericError(
    exception: Error,
    path: string,
    timestamp: string,
  ): ErrorResponse {
    return {
      success: false,
      message: exception.message || 'An unexpected error occurred',
      error: 'Internal Server Error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
    };
  }

  private handleUnknownError(path: string, timestamp: string): ErrorResponse {
    return {
      success: false,
      message: 'An unexpected error occurred',
      error: 'Internal Server Error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
    };
  }

  private logError(
    exception: unknown,
    request: Request,
    errorResponse: ErrorResponse,
  ): void {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';

    const logContext = {
      method,
      url,
      ip,
      userAgent,
      statusCode: errorResponse.statusCode,
      timestamp: errorResponse.timestamp,
      originalError:
        exception instanceof Error ? exception.message : String(exception),
    };

    // Log all errors as warnings with full context for debugging
    this.logger.warn(
      `${method} ${url} - ${errorResponse.statusCode} - ${errorResponse.message}`,
      exception instanceof Error ? exception.stack : String(exception),
      JSON.stringify(logContext),
    );
  }
}
