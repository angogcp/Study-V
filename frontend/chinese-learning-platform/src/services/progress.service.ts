import api from '@/lib/api';
import { VideoProgress, LearningStats, PaginatedResponse } from '@/types';

export class ProgressService {
  static async getVideoProgress(videoId: number): Promise<VideoProgress> {
    const response = await api.get<VideoProgress>(`/progress/video/${videoId}`);
    return response.data;
  }

  static async getAllProgress(params?: {
    completed?: boolean;
    subject_id?: number;
    grade_level?: '初中1' | '初中2' | '初中3';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<VideoProgress> & { progress: VideoProgress[] }> {
    const response = await api.get<PaginatedResponse<VideoProgress> & { progress: VideoProgress[] }>('/progress', {
      params,
    });
    return response.data;
  }

  static async updateProgress(progressData: {
    videoId: number;
    watchTimeSeconds: number;
    totalDuration?: number;
    lastPosition?: number;
    bookmarkNotes?: string;
  }): Promise<void> {
    await api.post('/progress/update', progressData);
  }

  static async getLearningStats(): Promise<LearningStats> {
    const response = await api.get<LearningStats>('/progress/stats');
    return response.data;
  }
}