import api from '@/lib/api';

export class AuthService {
  static async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  }

  static async register(email: string, password: string, fullName: string, gradeLevel: string) {
    const response = await api.post('/auth/register', { email, password, full_name: fullName, grade_level: gradeLevel });
    return response.data;
  }

  static async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  }
}