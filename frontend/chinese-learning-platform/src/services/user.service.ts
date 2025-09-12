import api from '@/lib/api';
import { User } from '@/types';

export class UserService {
  static async getAllUsers(params?: { search?: string; page?: number; limit?: number }): Promise<{ users: User[]; totalPages: number }> {
    const response = await api.get<{ users: User[]; totalPages: number }>('/users', { params });
    return response.data;
  }

  static async getUserById(id: string): Promise<User> {
    const response = await api.get<{ user: User }>(`/users/${id}`);
    return response.data.user;
  }

  static async createUser(userData: {
    email: string;
    password: string;
    fullName: string;
    gradeLevel: '初中1' | '初中2' | '初中3';
    role: 'student' | 'admin';
  }): Promise<{ userId: string }> {
    const response = await api.post<{ message: string; userId: string }>('/users', userData);
    return { userId: response.data.userId };
  }

  static async updateUser(
    id: string,
    userData: Partial<{
      email: string;
      password: string;
      fullName: string;
      gradeLevel: '初中1' | '初中2' | '初中3';
      role: 'student' | 'admin';
    }>
  ): Promise<void> {
    await api.put(`/users/${id}`, userData);
  }

  static async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  }
}