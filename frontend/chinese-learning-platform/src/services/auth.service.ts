import { sqliteDatabase } from './sqliteDatabase';

export class AuthService {
  static async login(email: string, password: string) {
    const { user } = await sqliteDatabase.login(email, password);
    localStorage.setItem('currentUser', JSON.stringify(user));
    return { user };
  }

  static async register(email: string, password: string, fullName: string, gradeLevel: string) {
    const userId = await sqliteDatabase.registerUser(email, password, fullName, gradeLevel);
    const user = await sqliteDatabase.getProfile(userId);
    localStorage.setItem('currentUser', JSON.stringify(user));
    return { user };
  }

  static async getProfile() {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) throw new Error('Not logged in');
    return JSON.parse(userStr);
  }

  static logout() {
    localStorage.removeItem('currentUser');
  }
}