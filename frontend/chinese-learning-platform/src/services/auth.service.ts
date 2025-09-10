import api from '@/lib/api';
import { User } from '@/types';

export class AuthService {
  static async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await api.post<{ user: User; token: string }>('/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  static async register(
    email: string,
    password: string,
    fullName: string,
    gradeLevel: '初中1' | '初中2' | '初中3'
  ): Promise<{ user: User; token: string }> {
    const response = await api.post<{ user: User; token: string }>('/auth/register', {
      email,
      password,
      fullName,
      gradeLevel,
    });
    return response.data;
  }

  static async getProfile(): Promise<User> {
    const response = await api.get<User>('/auth/profile');
    return response.data;
  }
}