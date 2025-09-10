import api from '@/lib/api';
import { Subject, ApiResponse } from '@/types';

export class SubjectService {
  static async getAllSubjects(): Promise<Subject[]> {
    const response = await api.get<Subject[]>('/subjects');
    return response.data;
  }

  static async getSubjectById(id: number): Promise<Subject> {
    const response = await api.get<Subject>(`/subjects/${id}`);
    return response.data;
  }

  static async createSubject(subjectData: {
    name: string;
    nameChinese: string;
    description?: string;
    iconUrl?: string;
    colorCode?: string;
    sortOrder?: number;
  }): Promise<Subject> {
    const response = await api.post<ApiResponse<Subject>>('/subjects', subjectData);
    return response.data.data!;
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
    await api.put(`/subjects/${id}`, subjectData);
  }

  static async deleteSubject(id: number): Promise<void> {
    await api.delete(`/subjects/${id}`);
  }

  static getSubjects = async () => {
    const response = await api.get<Subject[]>('/subjects');
    return response.data;
  }
}