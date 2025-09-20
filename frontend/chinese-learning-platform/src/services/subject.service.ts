import { sqliteDatabase } from './sqliteDatabase';
import { Subject, ApiResponse } from '@/types';

export class SubjectService {
  static async getAllSubjects(): Promise<Subject[]> {
    return sqliteDatabase.getAllSubjects();
  }

  static async getSubjectById(id: number): Promise<Subject> {
    return sqliteDatabase.getSubject(id);
  }

  static async createSubject(subjectData: {
    name: string;
    nameChinese: string;
    description?: string;
    iconUrl?: string;
    colorCode?: string;
    sortOrder?: number;
  }): Promise<Subject> {
    const id = await sqliteDatabase.createSubject(subjectData);
    return { id, ...subjectData } as Subject;
  }

  static async updateSubject(
    id: number,
    subjectData: Partial<{
      name: string;
      nameChinese: string;
      description: string;
      iconUrl: string;
      colorCode: string;
      sortOrder: number;
      isActive: boolean;
    }>
  ): Promise<void> {
    await sqliteDatabase.updateSubject(id, subjectData);
  }

  static async deleteSubject(id: number): Promise<void> {
    await sqliteDatabase.deleteSubject(id);
  }
}