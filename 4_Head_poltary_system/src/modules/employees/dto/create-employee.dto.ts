import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsUUID() userId: string;
  @IsString() fullName: string;
  @IsString() designation: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() cnicOrIdNumber?: string;
  @IsNumber() @IsPositive() baseSalary: number;
  @IsDateString() joiningDate: string;
  @IsUUID() departmentId: string;
}
