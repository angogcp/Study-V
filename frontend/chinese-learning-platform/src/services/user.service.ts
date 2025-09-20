import { sqliteDatabase } from './sqliteDatabase';
import { User } from '@/types';

export class UserService {
  private getUserId(): number {
    return parseInt(localStorage.getItem('userId') || '0', 10);
  }

  async getAllUsers(params: { search?: string; page?: number; limit?: number } = {}): Promise<{ users: User[], total: number }> {
    return await sqliteDatabase.getAllUsers(params);
  }

  async getUserById(id: number): Promise<User> {
    return await sqliteDatabase.getUser(id);
  }

  async updateUser(id: number, data: Partial<User>): Promise<void> {
    await sqliteDatabase.updateUser(id, data);
  }

  async deleteUser(id: number): Promise<void> {
    await sqliteDatabase.deleteUser(id);
  }
}