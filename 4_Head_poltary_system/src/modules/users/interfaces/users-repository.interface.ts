import { User } from '../entities/user.entity';

export interface IUsersRepository {
  createUser(dto: Partial<User>): Promise<User>;
  findByEmail(
    email: string,
    includePassword?: boolean,
    relations?: string[],
  ): Promise<User | null>;
  findById(id: string, relations?: string[]): Promise<User | null>;
  updateUser(id: string, dto: Partial<User>): Promise<User>;
}
