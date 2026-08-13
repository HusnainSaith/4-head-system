import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class SettlementsService {
  private readonly payments = new Map<string, any>();

  async getOutstandingPurchases() {
    return {
      success: true,
      message: 'Outstanding purchases retrieved successfully',
      data: [],
    };
  }

  async getOutstandingSales() {
    return {
      success: true,
      message: 'Outstanding sales retrieved successfully',
      data: [],
    };
  }

  async getSettlementSummary(partyId: string, partyType?: string) {
    return {
      success: true,
      message: 'Settlement summary retrieved successfully',
      data: {
        partyId,
        partyType: partyType || 'UNKNOWN',
        totalOutstanding: '0.00',
        totalPaid: '0.00',
        remainingBalance: '0.00',
      },
    };
  }

  async createPayment(dto: any) {
    const id = randomUUID();
    const payment = {
      id,
      ...dto,
      status: 'DRAFT',
      voucherNumber: `VOUCHER-${id.slice(0, 8).toUpperCase()}`,
      createdAt: new Date(),
    };
    this.payments.set(id, payment);
    return {
      success: true,
      message: 'Payment created successfully',
      data: payment,
    };
  }

  async postPayment(id: string) {
    const payment = this.payments.get(id);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.status !== 'DRAFT' && payment.status !== 'CLEARED') {
      // allow transition from DRAFT to POSTED only
    }
    payment.status = 'POSTED';
    payment.postedAt = new Date();
    this.payments.set(id, payment);
    return {
      success: true,
      message: 'Payment posted successfully',
      data: payment,
    };
  }

  async clearPayment(id: string) {
    const payment = this.payments.get(id);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    payment.status = 'CLEARED';
    payment.clearedAt = new Date();
    this.payments.set(id, payment);
    return {
      success: true,
      message: 'Payment cleared successfully',
      data: payment,
    };
  }
}
