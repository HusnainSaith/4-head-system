import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommonModule } from './modules/common/common.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { PartiesModule } from './modules/parties/parties.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BrokerageModule } from './modules/brokerage/brokerage.module';
import { SupplyModule } from './modules/supply/supply.module';
import { WastageModule } from './modules/wastage/wastage.module';
import { FreshChickenShopModule } from './modules/fresh-chicken-shop/fresh-chicken-shop.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RolesModule } from './modules/roles/roles.module';
import { CommitteesModule } from './modules/committees/committees.module';
import { ExpenseAllocationsModule } from './modules/expense-allocations/expense-allocations.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { InvestmentsModule } from './modules/investments/investments.module';
import { BrotherModule } from './modules/brother/brother.module';
import { InvestorManagementModule } from './modules/investor-management/investor-management.module';
import { ZakatFundsModule } from './modules/zakat-funds/zakat-funds.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import databaseConfig from './config/database.config';

// Global Guards and Interceptors

import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ResponseInterceptor } from './common/interceptor/response.interceptor';
import { AuditLoggingInterceptor } from './common/interceptor/audit-logging.interceptor';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
      expandVariables: true,
    }),

    // Database Configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: databaseConfig,
      inject: [ConfigService],
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60000), // 1 minute
            limit: config.get<number>('THROTTLE_LIMIT', 100), // 100 requests
          },
        ],
      }),
    }),
    // Infrastructure modules
    CommonModule,
    // Core modules
    UsersModule,
    AuthModule,
    DepartmentsModule,

    // Business modules
    VehiclesModule,
    EmployeesModule,
    InventoryModule,
    ExpensesModule,
    ReportsModule,
    BrokerageModule,
    SupplyModule,
    WastageModule,
    FreshChickenShopModule,
    LedgerModule,
    PartiesModule,
    InvoicesModule,
    NotificationsModule,
    RolesModule,
    CommitteesModule,
    ExpenseAllocationsModule,
    AccountsModule,
    InvestmentsModule,
    InvestorManagementModule,
    BrotherModule,
    ZakatFundsModule,
  ],
  controllers: [AppController],
  providers: [
    // Global Rate Limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // Global Authentication Guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    // Global Roles Guard
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },

    // Global Permissions Guard
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },

    // Global Response Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },

    // Global Audit Logging Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLoggingInterceptor,
    },

    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    AppService,
  ],
})
export class AppModule {}
