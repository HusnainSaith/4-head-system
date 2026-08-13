import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { validate as uuidValidate } from 'uuid';

@Injectable()
export class UuidValidationPipe implements PipeTransform<string> {
  transform(value: string): string {
    if (!uuidValidate(value)) {
      throw new BadRequestException('ID is not match or found');
    }
    return value;
  }
}
