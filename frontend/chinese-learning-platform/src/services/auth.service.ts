import api from '@/lib/api';
export class AuthService {
  static async login(email: string, password: string) {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    
    const { user, token } = await response.json();
    return { user, token };
  }

  static async register(email: string, password: string, fullName: string, gradeLevel: string) {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName, grade_level: gradeLevel })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
    
    const { user, token } = await response.json();
    return { user, token };
  }

  static async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  }

  static logout() {
  }
}