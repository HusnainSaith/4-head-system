import { PATH_METADATA } from '@nestjs/common/constants';
import { SupplyController } from '../supply/supply.controller';
import { FreshChickenShopController } from './fresh-chicken-shop.controller';
import { BrokerageService } from '../brokerage/brokerage.service';

describe('external-only department routes', () => {
  it.each([SupplyController, FreshChickenShopController])(
    'does not expose internal transfer routes on %p',
    (controller) => {
      const paths = Object.getOwnPropertyNames(controller.prototype)
        .filter((name) => name !== 'constructor')
        .map((name) =>
          Reflect.getMetadata(PATH_METADATA, controller.prototype[name]),
        );
      expect(paths.some((path) => /transfer/.test(String(path)))).toBe(false);
    },
  );
  it('rejects an automatic Brokerage transfer before starting a transaction', async () => {
    await expect(
      BrokerageService.prototype.createSale.call(
        {} as any,
        { destinationType: 'supply' } as any,
        'actor',
      ),
    ).rejects.toThrow('Internal transfers are no longer supported');
  });
});
