import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { VehicleTypeEnum } from '../entities/vehicle.entity';

export class CreateVehicleDto {
  @IsString() registrationNumber: string;
  @IsEnum(VehicleTypeEnum) vehicleType: VehicleTypeEnum;
  @IsOptional() @IsString() driverName?: string;
  @IsOptional() @IsUUID() driverUserId?: string;
  @IsUUID() departmentId: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsInt() @Min(1900) year?: number;
}
