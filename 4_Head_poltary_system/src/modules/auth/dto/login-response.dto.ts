import { User } from '../../users/entities/user.entity';

export class LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  user: Partial<User>;
}
