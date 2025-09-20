import { User } from '@/types';
import api from '@/lib/api';

export class UserService {
  static async getAllUsers(params: { search?: string; page?: number; limit?: number } = {}): Promise<{ users: User[], totalCount: number, totalPages: number }> {
    try {
      const response = await api.get('/users', {
        params: {
          search: params.search || '',
          page: params.page || 1,
          limit: params.limit || 10
        }
      });
      const data = response.data;
      return {
        users: data.users || [],
        totalCount: data.totalCount || 0,
        totalPages: data.totalPages || 1
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { users: [], totalCount: 0, totalPages: 1 };
    }
  }

  static async getUserById(id: number): Promise<User> {
    const response = await api.get(`/users/${id}`);
    return response.data;
  }

  static async updateUser(id: number, data: Partial<User>): Promise<void> {
    await api.put(`/users/${id}`, data);
  }

  static async deleteUser(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  }

  static async createUser(userData: {
    email: string;
    password: string;
    fullName: string;
    gradeLevel: string;
    role: string;
  }): Promise<User> {
    const response = await api.post('/users', userData);
    return response.data;
  }
}