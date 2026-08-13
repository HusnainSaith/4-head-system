import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from './entities/bank-account.entity';
import { CashAccount } from './entities/cash-account.entity';

@Injectable()
export class AccountsRepository {
  constructor(
    @InjectRepository(CashAccount)
    private readonly cashRepo: Repository<CashAccount>,
    @InjectRepository(BankAccount)
    private readonly bankRepo: Repository<BankAccount>,
  ) {}

  findCashByDepartment(departmentId: string): Promise<CashAccount> {
    return this.cashRepo.findOneOrFail({
      where: { departmentId, isActive: true },
      relations: { department: true },
    });
  }

  findAllCashAccounts(): Promise<CashAccount[]> {
    return this.cashRepo.find({
      where: { isActive: true },
      relations: { department: true },
      order: { accountName: 'ASC' },
    });
  }

  saveCashAccount(data: Partial<CashAccount>): Promise<CashAccount> {
    return this.cashRepo.save(this.cashRepo.create(data));
  }

  findBankById(id: string): Promise<BankAccount> {
    return this.bankRepo.findOneOrFail({ where: { id, isActive: true } });
  }

  findAllBankAccounts(): Promise<BankAccount[]> {
    return this.bankRepo.find({
      where: { isActive: true },
      order: { bankName: 'ASC', accountTitle: 'ASC' },
    });
  }

  saveBankAccount(data: Partial<BankAccount>): Promise<BankAccount> {
    return this.bankRepo.save(this.bankRepo.create(data));
  }

  async updateBankAccount(
    id: string,
    data: Partial<BankAccount>,
  ): Promise<void> {
    await this.bankRepo.update({ id, isActive: true }, data);
  }

  async deactivateBankAccount(id: string, updatedBy: string): Promise<void> {
    await this.bankRepo.update(
      { id, isActive: true },
      { isActive: false, updatedBy },
    );
  }
}
