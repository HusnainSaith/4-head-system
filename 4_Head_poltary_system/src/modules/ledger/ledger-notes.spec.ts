import { LedgerRepository } from './ledger.repository';

describe('Statement transaction notes', () => {
  it.each(['sale', 'purchase', 'payment'])(
    'uses the source record note instead of the generated %s narration',
    async (sourceType) => {
      const query: any = {};
      for (const method of [
        'leftJoin',
        'addSelect',
        'where',
        'andWhere',
        'orderBy',
        'addOrderBy',
      ]) {
        query[method] = jest.fn().mockReturnValue(query);
      }
      const notes = ['Admin wrote this\nSecond line', null, ''];
      query.getRawAndEntities = jest.fn().mockResolvedValue({
        entities: notes.map((_, i) => ({
          id: `${i}`,
          sourceType,
          amount: '100.00',
          description: `Generated ${sourceType} narration`,
        })),
        raw: notes.map((note) => ({ transactionNotes: note })),
      });
      const repo = new LedgerRepository(
        { createQueryBuilder: () => query } as any,
        null as any,
      );
      const entries = await repo.findByParty(
        'party',
        new Date('2026-01-01'),
        new Date('2026-12-31'),
      );
      expect(entries.map((entry) => entry.description)).toEqual(notes);
      expect(entries.map((entry) => entry.amount)).toEqual([
        '100.00',
        '100.00',
        '100.00',
      ]);
      expect(query.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('partyPayment.notes'),
        'transactionNotes',
      );
      for (const table of [
        'supply_purchases',
        'supply_sales',
        'brokerage_purchases',
        'brokerage_sales',
        'wastage_purchases',
        'wastage_sales',
        'shop_sales',
        'party_payments',
      ]) {
        expect(query.leftJoin).toHaveBeenCalledWith(
          table,
          expect.any(String),
          expect.any(String),
        );
      }
    },
  );
});
