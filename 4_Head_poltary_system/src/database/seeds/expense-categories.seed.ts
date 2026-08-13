import { DataSource } from 'typeorm';
import { ExpenseCategory } from '../../modules/expenses/entities/expense-category.entity';

export async function seedExpenseCategories(dataSource: DataSource) {
  const categoryRepo = dataSource.getRepository(ExpenseCategory);

  const categories: Partial<ExpenseCategory>[] = [
    {
      name: 'Rent',
      categoryType: 'administrative',
      isActive: true,
      isSystemGenerated: false,
    },
    {
      name: 'Utilities',
      categoryType: 'administrative',
      isActive: true,
      isSystemGenerated: false,
    },
    {
      name: 'Office Supplies',
      categoryType: 'administrative',
      isActive: true,
      isSystemGenerated: false,
    },
    {
      name: 'Vehicle Fuel',
      categoryType: 'transport',
      isActive: true,
      isSystemGenerated: true,
    },
    {
      name: 'Vehicle Maintenance',
      categoryType: 'maintenance',
      isActive: true,
      isSystemGenerated: true,
    },
    {
      name: 'Wastage Loss',
      categoryType: 'operational',
      isActive: true,
      isSystemGenerated: true,
    },
    {
      name: 'Processing Loss',
      description: 'Automatic live-to-dressed weight processing loss',
      categoryType: 'operational',
      isActive: true,
      isSystemGenerated: true,
    },
    {
      name: 'Miscellaneous',
      categoryType: 'miscellaneous',
      isActive: true,
      isSystemGenerated: false,
    },
  ];

  await categoryRepo.upsert(categories, ['name']);
}
