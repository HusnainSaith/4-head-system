import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

@Injectable()
export class InvoiceNumberService {
  async next(manager: EntityManager, year = new Date().getUTCFullYear()) {
    await manager.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
      `invoice-number-${year}`,
    ]);
    const [row] = await manager.query(
      `SELECT COALESCE(MAX(CAST(RIGHT(invoice_number, 6) AS INTEGER)), 0) AS current
       FROM invoices
       WHERE invoice_number LIKE $1`,
      [`INV-${year}-%`],
    );
    const next = Number(row?.current ?? 0) + 1;
    return `INV-${year}-${String(next).padStart(6, '0')}`;
  }
}
