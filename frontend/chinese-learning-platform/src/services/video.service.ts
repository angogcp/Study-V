import api from '@/lib/api';
import { Video, PaginatedResponse, ApiResponse } from '@/types';

export class VideoService {
  static async getAllVideos(params?: {
    subject_id?: number;
    grade_level?: '初中1' | '初中2' | '初中3';
    chapter?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Video> & { videos: Video[] }> {
    const response = await api.get<PaginatedResponse<Video> & { videos: Video[] }>('/videos', {
      params,
    });
    return response.data;
  }

  static async getVideoById(id: number): Promise<Video> {
    const response = await api.get<Video>(`/videos/${id}`);
    return response.data;
  }

  static async createVideo(videoData: {
    title: string;
    titleChinese?: string;
    description?: string;
    youtubeUrl: string;
    subjectId: number;
    gradeLevel: '初中1' | '初中2' | '初中3';
    chapter?: string;
    topic?: string;
    difficultyLevel?: 'easy' | 'medium' | 'hard';
    sortOrder?: number;
  }): Promise<{ id: number }> {
    const response = await api.post<ApiResponse<{ id: number }>>('/videos', videoData);
    return response.data.data!;
  }

  static async updateVideo(
    id: number,
    videoData: Partial<{
      title: string;
      titleChinese: string;
      description: string;
      youtubeUrl: string;
      subjectId: number;
      gradeLevel: '初中1' | '初中2' | '初中3';
      chapter: string;
      topic: string;
      difficultyLevel: 'easy' | 'medium' | 'hard';
      sortOrder: number;
      isActive: boolean;
    }>
  ): Promise<void> {
    await api.put(`/videos/${id}`, videoData);
  }

  static async deleteVideo(id: number): Promise<void> {
    await api.delete(`/videos/${id}`);
  }
}