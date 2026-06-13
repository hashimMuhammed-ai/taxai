import { UserEntity } from '../entities/user.entity';

// Symbol token prevents string collision when injecting
export const USER_REPOSITORY = Symbol('IUserRepository');

export interface IUserRepository {
  findById(id: string, tenantId: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  existsByEmail(email: string, tenantId: string): Promise<boolean>;
  save(user: UserEntity): Promise<UserEntity>;
  findCAs(): Promise<UserEntity[]>;
  updateProfile( userId: string,
    fields: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    },
  ): Promise<void>;
  updatePassword( userId: string, passwordHash: string ): Promise<void>;
  updateRefreshToken(userId: string, hash: string | null): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;
}