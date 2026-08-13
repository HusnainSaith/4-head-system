import { DataSource } from 'typeorm';
import { PartyTypeEnum } from '../../common/types/party-type.enum';
import { LedgerService } from '../ledger/ledger.service';
import { Party } from '../parties/entities/party.entity';
import { ReportsService } from '../reports/reports.service';
import {
  Investor,
  InvestorStatus,
  InvestorType,
} from './entities/investor.entity';
import { InvestorManagementService } from './investor-management.service';

describe('InvestorManagementService', () => {
  function setup(active: Partial<Investor>[] = []) {
    const party = {
      id: 'party-id',
      partyType: PartyTypeEnum.INVESTOR,
    } as Party;
    const manager = {
      query: jest.fn(),
      findOne: jest.fn(async (entity: unknown, options: any) => {
        if (entity === Party) return party;
        if (entity === Investor && options.where.partyId) return null;
        if (entity === Investor && options.where.investorType) return null;
        return null;
      }),
      find: jest.fn(async () => active),
      create: jest.fn((_entity: unknown, value: unknown) => value),
      save: jest.fn(async (_entity: unknown, value: any) => ({
        id: 'investor-id',
        ...value,
      })),
    };
    const dataSource = {
      transaction: jest.fn(
        async (_isolation: string, callback: (m: typeof manager) => unknown) =>
          callback(manager),
      ),
    } as unknown as DataSource;
    return new InvestorManagementService(
      dataSource,
      {} as LedgerService,
      {} as ReportsService,
    );
  }

  it('defaults the Brother investor to a separate 2% profit share', async () => {
    const investor = await setup().create(
      { partyId: 'party-id', investorType: InvestorType.BROTHER },
      'owner-id',
    );
    expect(investor).toMatchObject({
      investorType: InvestorType.BROTHER,
      profitSharePercentage: '2.0000',
      status: InvestorStatus.ACTIVE,
    });
  });

  it('rejects active percentages above 100%', async () => {
    const service = setup([
      {
        id: 'existing',
        status: InvestorStatus.ACTIVE,
        profitSharePercentage: '99.0000',
      },
    ]);
    await expect(
      service.create(
        {
          partyId: 'party-id',
          investorType: InvestorType.STANDARD,
          profitSharePercentage: '2.0000',
        },
        'owner-id',
      ),
    ).rejects.toThrow('cannot exceed 100%');
  });
});
