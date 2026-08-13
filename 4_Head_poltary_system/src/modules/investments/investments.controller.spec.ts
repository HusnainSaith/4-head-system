import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { InvestmentsController } from './investments.controller';

describe('InvestmentsController authorization', () => {
  it('restricts the entire workflow to owners and accountants', () => {
    expect(Reflect.getMetadata(ROLES_KEY, InvestmentsController)).toEqual([
      RoleEnum.OWNER,
      RoleEnum.ACCOUNTANT,
    ]);
  });
});
