import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeesRepository } from './employees.repository';
import { Employee } from './entities/employee.entity';
import { EmployeeAdvance } from './entities/employee-advance.entity';
import { EmployeeBonus } from './entities/employee-bonus.entity';
import { SalaryRun } from './entities/salary-run.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { SalaryWithdrawal } from './entities/salary-withdrawal.entity';
import { SalaryWithdrawalAllocation } from './entities/salary-withdrawal-allocation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      EmployeeAdvance,
      EmployeeBonus,
      SalaryRun,
      SalaryWithdrawal,
      SalaryWithdrawalAllocation,
    ]),
    LedgerModule,
    InvoicesModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeesRepository],
  exports: [EmployeesService],
})
export class EmployeesModule {}
