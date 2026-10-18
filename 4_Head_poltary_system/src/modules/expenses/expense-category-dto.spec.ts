import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { ExpensesController } from './expenses.controller';
import { RoleEnum } from '../../common/enums/role.enum';

describe('Expense category API validation and authorization', () => {
  it('trims names and rejects blank or invalid types', async () => {
    expect(await validate(plainToInstance(CreateExpenseCategoryDto, { name: ' Rent ', categoryType: 'administrative' }))).toHaveLength(0);
    expect(await validate(plainToInstance(CreateExpenseCategoryDto, { name: ' ', categoryType: 'invalid' }))).toHaveLength(2);
  });
  it('rejects invalid activation flags and protects internal fields', async () => {
    expect(await validate(plainToInstance(UpdateExpenseCategoryDto, { isActive: 'false' }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(UpdateExpenseCategoryDto, { isSystemGenerated: true }), { whitelist: true, forbidNonWhitelisted: true })).not.toHaveLength(0);
  });
  it.each(['createCategory', 'updateCategory', 'deleteCategory'])('restricts %s to management roles', method => {
    const metadata = Reflect.getMetadata('roles', ExpensesController.prototype[method]);
    expect(metadata).toEqual([RoleEnum.OWNER, RoleEnum.ACCOUNTANT]);
  });
});
