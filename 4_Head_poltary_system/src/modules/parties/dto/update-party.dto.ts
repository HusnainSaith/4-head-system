import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsArray,
  ArrayMinSize,
  ArrayUnique,
} from 'class-validator';
import { PartyTypeEnum } from '../../../common/types/party-type.enum';

/** Coerce an empty string to undefined so @IsOptional() + @IsUUID() accepts it. */
const emptyToUndefined = () =>
  Transform(({ value }: { value: unknown }) =>
    value === '' ? undefined : value,
  );

export class UpdatePartyDto {
  @IsOptional()
  @emptyToUndefined()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEnum(PartyTypeEnum)
  partyType?: PartyTypeEnum;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @emptyToUndefined()
  @IsUUID()
  linkedDepartmentId?: string;

  @IsOptional()
  @emptyToUndefined()
  @IsUUID()
  primaryDepartmentId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  departmentIds?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
