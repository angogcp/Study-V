import api from '@/lib/api';

export class AuthService {
  static async login(email: string, password: string) {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
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
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
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