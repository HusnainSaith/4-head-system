import { WASTAGE_SHOP_OWNERS } from './wastage-shop-owners.seed';

describe('wastage shop-owner opening balances', () => {
  it('contains every numbered source row with the required sign convention', () => {
    expect(WASTAGE_SHOP_OWNERS).toHaveLength(204);
    expect(WASTAGE_SHOP_OWNERS.filter((x) => x.amount < 0)).toHaveLength(102);
    expect(WASTAGE_SHOP_OWNERS.filter((x) => x.amount > 0)).toHaveLength(101);
    expect(WASTAGE_SHOP_OWNERS.filter((x) => x.amount === 0)).toHaveLength(1);
    expect(WASTAGE_SHOP_OWNERS.find((x) => x.name === 'شکیل')?.amount).toBe(-42256);
    expect(WASTAGE_SHOP_OWNERS.find((x) => x.name === 'قریش چکن')?.amount).toBe(3856988);
    expect(WASTAGE_SHOP_OWNERS.at(-1)).toMatchObject({ number: 204, name: 'نثار احمد', amount: -26848 });
  });

  it('matches the normalized source totals exactly', () => {
    const receivable = WASTAGE_SHOP_OWNERS.filter((x) => x.amount < 0)
      .reduce((sum, x) => sum + Math.abs(x.amount), 0);
    const payable = WASTAGE_SHOP_OWNERS.filter((x) => x.amount > 0)
      .reduce((sum, x) => sum + x.amount, 0);
    expect(receivable).toBe(12936610);
    expect(payable).toBe(13078022.5);
  });
});
