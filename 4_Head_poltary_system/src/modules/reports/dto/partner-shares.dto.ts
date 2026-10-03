import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';

class PartnerShareDto {
  @IsUUID() userId: string;
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,3}(?:\.\d{1,4})?$/)
  percentage?: string;
}

export class PartnerSharesDto {
  @IsOptional()
  @IsIn(['equal', 'percentage'])
  allocationMode?: 'equal' | 'percentage';
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ArrayUnique((share: PartnerShareDto) => share.userId)
  @ValidateNested({ each: true })
  @Type(() => PartnerShareDto)
  shares: PartnerShareDto[];
}
