import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductsService } from '../../../src/modules/inventory/products.service';
import { Product } from '../../../src/modules/inventory/entities/product.entity';
import { Repository, IsNull } from 'typeorm';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: jest.Mocked<Repository<Product>>;

  const mockProduct = {
    id: 'test-id',
    code: 'CHICK-001',
    name: 'Day Old Chicks',
    category: 'LIVESTOCK',
    unit: 'PIECE',
    isActive: true,
    minimumStockLevel: 100,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get(getRepositoryToken(Product));
  });

  describe('create', () => {
    it('should create a new product', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockProduct as any);
      repository.save.mockResolvedValue(mockProduct as any);

      const result = await service.create({
        name: 'Day Old Chicks',
        code: 'CHICK-001',
        category: 'LIVESTOCK' as any,
        unit: 'PIECE' as any,
        isActive: true,
      });

      expect(result).toEqual(mockProduct);
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if product code exists', async () => {
      repository.findOne.mockResolvedValue(mockProduct as any);

      await expect(
        service.create({
          code: 'CHICK-001',
          name: 'Duplicate Chicks',
          category: 'LIVESTOCK' as any,
          unit: 'PIECE' as any,
          isActive: true,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all active products', async () => {
      repository.find.mockResolvedValue([mockProduct] as any);

      const result = await service.findAll();

      expect(result).toEqual([mockProduct]);
    });

    it('should filter by category', async () => {
      repository.find.mockResolvedValue([mockProduct] as any);

      const result = await service.findAll(false, 'LIVESTOCK');

      expect(result).toEqual([mockProduct]);
    });
  });

  describe('checkStockAlert', () => {
    it('should return minimum stock alert', async () => {
      repository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.checkStockAlert('test-id', 50);

      expect(result.alert).toBe('MINIMUM_STOCK_ALERT');
      expect(result.product).toEqual(mockProduct);
    });

    it('should return no alert for normal stock', async () => {
      repository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.checkStockAlert('test-id', 150);

      expect(result.alert).toBeNull();
    });
  });

  describe('remove', () => {
    it('should soft delete product', async () => {
      repository.findOne.mockResolvedValue(mockProduct as any);
      repository.save.mockResolvedValue({
        ...mockProduct,
        deletedAt: new Date(),
      } as any);

      await service.remove('test-id');

      expect(repository.save).toHaveBeenCalled();
    });
  });
});
