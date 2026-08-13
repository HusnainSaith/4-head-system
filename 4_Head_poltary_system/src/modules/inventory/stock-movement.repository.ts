import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockMovement } from './entities/stock-movement.entity';

@Injectable()
export class StockMovementRepository {
  constructor(
    @InjectRepository(StockMovement)
    private readonly repo: Repository<StockMovement>,
  ) {}

  create(data: Partial<StockMovement>) {
    return this.repo.create(data);
  }

  save(movement: Partial<StockMovement>) {
    return this.repo.save(movement);
  }

  find(options: Parameters<Repository<StockMovement>['find']>[0]) {
    return this.repo.find(options);
  }

  findOne(options: Parameters<Repository<StockMovement>['findOne']>[0]) {
    return this.repo.findOne(options);
  }
}
