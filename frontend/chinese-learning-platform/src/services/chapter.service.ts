import { sqliteDatabase } from './sqliteDatabase';

export interface Chapter {
  id: number;
  subject_id: number;
  grade_level: string;
  name: string;
  sort_order: number;
  subject_name?: string;
  subject_name_chinese?: string;
}

export class ChapterService {
  static async getChapters(params?: {
    subject_id?: number;
    grade_level?: '初中1' | '初中2' | '初中3';
  }): Promise<Chapter[]> {
    return await sqliteDatabase.getChapters(params || {});
  }

  static async createChapter(data: Partial<Chapter>): Promise<Chapter> {
    const id = await sqliteDatabase.createChapter(data);
    return { ...data, id } as Chapter; // Simplified, add query if needed
  }

  static async updateChapter(id: number, data: Partial<Chapter>): Promise<void> {
    await sqliteDatabase.updateChapter(id, data);
  }

  static async deleteChapter(id: number): Promise<void> {
    await sqliteDatabase.deleteChapter(id);
  }
}