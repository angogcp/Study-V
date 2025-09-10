import api from '@/lib/api';
import { PaginatedResponse } from '@/types';

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
    // 确保使用正确的API路径
    const response = await api.get<{ chapters: Chapter[] }>('/chapters', { params });
    return response.data.chapters;
  }

  static async createChapter(data: Partial<Chapter>): Promise<Chapter> {
    const response = await api.post<Chapter>('/chapters', data);
    return response.data;
  }

  static async updateChapter(id: number, data: Partial<Chapter>): Promise<void> {
    await api.put(`/chapters/${id}`, data);
  }

  static async deleteChapter(id: number): Promise<void> {
    await api.delete(`/chapters/${id}`);
  }
}