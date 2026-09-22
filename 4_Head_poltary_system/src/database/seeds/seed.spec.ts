jest.mock('../../config/data-source', () => ({
  AppDataSource: {
    initialize: jest.fn(),
    destroy: jest.fn(),
    query: jest.fn(),
  },
}));

import { AppDataSource } from '../../config/data-source';
import { dropStalePartyUniqueConstraints } from './seed';

describe('dropStalePartyUniqueConstraints', () => {
  it('drops stale party unique constraints and indexes before seeding', async () => {
    const query = AppDataSource.query as jest.Mock;

    query
      .mockResolvedValueOnce([
        { conname: 'UQ_parties_name' },
        { conname: 'UQ_parties_user_id' },
      ])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([
        { indexname: 'IDX_parties_user_id' },
        { indexname: 'IDX_parties_name' },
      ])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    await dropStalePartyUniqueConstraints();

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DROP CONSTRAINT IF EXISTS "UQ_parties_name"'),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DROP CONSTRAINT IF EXISTS "UQ_parties_user_id"'),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DROP INDEX IF EXISTS "IDX_parties_user_id"'),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DROP INDEX IF EXISTS "IDX_parties_name"'),
    );
  });
});
