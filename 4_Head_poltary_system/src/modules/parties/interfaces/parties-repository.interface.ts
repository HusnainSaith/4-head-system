import { Party } from '../entities/party.entity';

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface IPartiesRepository {
  findAll(filters?: {
    type?: string;
    departmentId?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResult<Party>>;
  findById(id: string): Promise<Party | null>;
  create(party: Partial<Party>): Promise<Party>;
  update(id: string, changes: Partial<Party>): Promise<Party>;
}
