import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsArray,
  ArrayMinSize,
  ArrayUnique,
} from 'class-validator';
import { PartyTypeEnum } from '../../../common/types/party-type.enum';

export class CreatePartyDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsEnum(PartyTypeEnum)
  partyType: PartyTypeEnum;

  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsUUID()
  linkedDepartmentId?: string;

  @IsOptional()
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

  /**
   * Carried-in balance at go-live.
   * Positive = party owes the business (receivable/asset).
   * Negative = business owes the party (payable/liability).
   * Defaults to 0 when omitted.
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  openingBalance?: number;
}
