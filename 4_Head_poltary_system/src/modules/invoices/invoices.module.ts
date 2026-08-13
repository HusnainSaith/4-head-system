import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesRepository } from './invoices.repository';
import { InvoicesService } from './invoices.service';
import { PdfService } from './pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice])],
  controllers: [InvoicesController],
  providers: [
    InvoicesRepository,
    InvoiceNumberService,
    PdfService,
    InvoicesService,
  ],
  exports: [InvoicesService, PdfService],
})
export class InvoicesModule {}
