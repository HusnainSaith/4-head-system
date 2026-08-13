import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
  ) {}

  create(token: Partial<RefreshToken>) {
    return this.repo.create(token);
  }

  save(token: Partial<RefreshToken>) {
    return this.repo.save(token);
  }

  findOne(options: Parameters<Repository<RefreshToken>['findOne']>[0]) {
    return this.repo.findOne(options);
  }

  findByToken(token: string) {
    return this.repo.findOne({ where: { token } });
  }

  update(
    criteria: Parameters<Repository<RefreshToken>['update']>[0],
    partialEntity: Parameters<Repository<RefreshToken>['update']>[1],
  ) {
    return this.repo.update(criteria, partialEntity);
  }

  deleteByUserId(userId: string) {
    return this.repo.delete({ userId });
  }
}
