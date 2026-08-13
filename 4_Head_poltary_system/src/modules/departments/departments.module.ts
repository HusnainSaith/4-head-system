import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentsService } from './departments.service';
import { DepartmentsRepository } from './departments.repository';
import { Department } from './entities/department.entity';
import { DepartmentsController } from './departments.controller';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [TypeOrmModule.forFeature([Department]), LedgerModule],
  providers: [DepartmentsService, DepartmentsRepository],
  controllers: [DepartmentsController],
  exports: [DepartmentsService, DepartmentsRepository],
})
export class DepartmentsModule {}
