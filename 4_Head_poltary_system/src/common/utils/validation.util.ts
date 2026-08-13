import { BadRequestException } from '@nestjs/common';

export class ValidationUtil {
  static validateRequired(value: any, fieldName: string): void {
    if (value === undefined || value === null) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    if (typeof value === 'string' && value.trim() === '') {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }
  }

  static validateString(
    value: any,
    fieldName: string,
    minLength = 1,
    maxLength = 255,
  ): void {
    this.validateRequired(value, fieldName);
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }
    if (value.trim().length < minLength) {
      throw new BadRequestException(
        `${fieldName} must be at least ${minLength} characters long`,
      );
    }
    if (value.trim().length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${maxLength} characters`,
      );
    }
  }

  static validateEmail(email: any): void {
    this.validateRequired(email, 'email');
    if (typeof email !== 'string') {
      throw new BadRequestException('Email must be a string');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new BadRequestException('Invalid email format');
    }
  }

  static validateUUID(id: any, fieldName = 'id'): void {
    this.validateRequired(id, fieldName);
    if (typeof id !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException(`Invalid ${fieldName} format`);
    }
  }

  static validateNumber(
    value: any,
    fieldName: string,
    min?: number,
    max?: number,
  ): void {
    this.validateRequired(value, fieldName);
    if (typeof value !== 'number' || isNaN(value)) {
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }
    if (min !== undefined && value < min) {
      throw new BadRequestException(`${fieldName} must be at least ${min}`);
    }
    if (max !== undefined && value > max) {
      throw new BadRequestException(`${fieldName} must not exceed ${max}`);
    }
  }

  static validateBoolean(value: any, fieldName: string): void {
    this.validateRequired(value, fieldName);
    if (typeof value !== 'boolean') {
      throw new BadRequestException(`${fieldName} must be a boolean`);
    }
  }

  static validateDate(value: any, fieldName: string): void {
    this.validateRequired(value, fieldName);
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }
  }

  static validateEnum(value: any, enumObject: any, fieldName: string): void {
    this.validateRequired(value, fieldName);
    if (!Object.values(enumObject).includes(value)) {
      throw new BadRequestException(
        `${fieldName} must be one of: ${Object.values(enumObject).join(', ')}`,
      );
    }
  }

  static validateArray(value: any, fieldName: string, minLength = 0): void {
    this.validateRequired(value, fieldName);
    if (!Array.isArray(value)) {
      throw new BadRequestException(`${fieldName} must be an array`);
    }
    if (value.length < minLength) {
      throw new BadRequestException(
        `${fieldName} must contain at least ${minLength} items`,
      );
    }
  }

  static validatePassword(password: any): void {
    this.validateString(password, 'password', 8, 128);
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw new BadRequestException(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      );
    }
  }

  static sanitizeString(value: string): string {
    return value?.trim() || '';
  }

  static validateObjectId(value: any, fieldName = 'id'): void {
    this.validateRequired(value, fieldName);
    if (typeof value === 'string') {
      // Check if it's a UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(value)) return;

      // Check if it's a numeric string
      if (/^\d+$/.test(value)) return;
    }
    if (typeof value === 'number' && value > 0) return;

    throw new BadRequestException(`Invalid ${fieldName} format`);
  }

  static validatePhone(phone: any): void {
    if (!phone) return; // Optional field
    if (typeof phone !== 'string') {
      throw new BadRequestException('Phone must be a string');
    }
    const phoneRegex = /^[+]?[1-9]?[0-9]{7,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s-()]/g, ''))) {
      throw new BadRequestException('Invalid phone number format');
    }
  }

  static validateUrl(url: any, fieldName: string): void {
    if (!url) return; // Optional field
    if (typeof url !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }
    try {
      new URL(url);
    } catch {
      throw new BadRequestException(`Invalid ${fieldName} format`);
    }
  }

  static validateDecimal(value: any, fieldName: string, precision = 2): void {
    this.validateRequired(value, fieldName);
    if (typeof value !== 'number' || isNaN(value)) {
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }
    if (value < 0) {
      throw new BadRequestException(`${fieldName} must be a positive number`);
    }
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    if (decimalPlaces > precision) {
      throw new BadRequestException(
        `${fieldName} can have at most ${precision} decimal places`,
      );
    }
  }

  static createSuccessResponse(message: string, data?: any) {
    return {
      success: true,
      message,
      ...(data && { data }),
    };
  }

  static createErrorResponse(message: string, details?: any) {
    return {
      success: false,
      message,
      ...(details && { details }),
    };
  }

  static createPaginatedResponse(
    message: string,
    data: any[],
    total: number,
    page: number,
    limit: number,
  ) {
    return {
      success: true,
      message,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
