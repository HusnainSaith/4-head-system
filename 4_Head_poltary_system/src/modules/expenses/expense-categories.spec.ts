import { ExpensesService } from './expenses.service';

describe('Expense category management', () => {
  let repo: any, service: ExpensesService;
  beforeEach(() => {
    repo = {
      findCategories: jest.fn().mockResolvedValue([]),
      findCategory: jest
        .fn()
        .mockResolvedValue({
          id: 'category',
          name: 'Rent',
          isActive: true,
          isSystemGenerated: false,
        }),
      findCategoryWithName: jest.fn().mockResolvedValue(null),
      saveCategory: jest.fn(async (value) => value),
      countCategoryExpenses: jest.fn().mockResolvedValue(0),
      deleteCategory: jest.fn(),
      createExpense: jest.fn(),
      saveExpense: jest.fn(),
    };
    service = new ExpensesService(repo, {} as any);
  });
  it('creates a trimmed category with a validated type', async () => {
    await expect(
      service.createCategory({
        name: ' Rent ',
        categoryType: 'administrative',
      }),
    ).resolves.toMatchObject({
      data: {
        name: 'Rent',
        categoryType: 'administrative',
        isActive: true,
        isSystemGenerated: false,
      },
    });
  });
  it('rejects a duplicate name without saving', async () => {
    repo.findCategoryWithName.mockResolvedValue({ id: 'existing' });
    await expect(service.createCategory({ name: 'Rent' })).rejects.toThrow(
      'already exists',
    );
    expect(repo.saveCategory).not.toHaveBeenCalled();
  });
  it('reads and updates a category', async () => {
    await expect(service.getCategory('category')).resolves.toMatchObject({
      data: { name: 'Rent' },
    });
    await expect(
      service.updateCategory('category', {
        name: ' Lease ',
        description: '',
        isActive: false,
      }),
    ).resolves.toMatchObject({
      data: { name: 'Lease', description: '', isActive: false },
    });
  });
  it('reports missing categories', async () => {
    repo.findCategory.mockResolvedValue(null);
    await expect(service.getCategory('missing')).rejects.toThrow('not found');
  });
  it('deletes an unused manual category', async () => {
    await service.deleteCategory('category');
    expect(repo.deleteCategory).toHaveBeenCalledWith('category');
  });
  it('preserves categories referenced by historical expenses', async () => {
    repo.countCategoryExpenses.mockResolvedValue(1);
    await expect(service.deleteCategory('category')).rejects.toThrow(
      'deactivate',
    );
    expect(repo.deleteCategory).not.toHaveBeenCalled();
  });
  it('protects system categories from edits and deletion', async () => {
    repo.findCategory.mockResolvedValue({ isSystemGenerated: true });
    await expect(
      service.updateCategory('category', { name: 'Rename' }),
    ).rejects.toThrow('cannot be edited');
    await expect(service.deleteCategory('category')).rejects.toThrow(
      'cannot be deleted',
    );
  });
  it('rejects inactive expense categories before saving any expense', async () => {
    repo.findCategory.mockResolvedValue({ isActive: false });
    await expect(service.create({ categoryId: 'category' })).rejects.toThrow(
      'inactive',
    );
    expect(repo.saveExpense).not.toHaveBeenCalled();
  });
});
