import { sqliteDatabase } from './sqliteDatabase';
import { VideoProgress, LearningStats, PaginatedResponse } from '@/types';

export class ProgressService {
  static async getVideoProgress(videoId: number): Promise<VideoProgress> {
    const userId = this.getUserId();
    return sqliteDatabase.getVideoProgress(videoId, userId);
  }

  static async getAllProgress(params?: {
    completed?: boolean;
    subject_id?: number;
    grade_level?: '初中1' | '初中2' | '初中3';
    page?: number;
    limit?: number;
  }): Promise<{ progress: VideoProgress[], total: number }> {
    const userId = this.getUserId();
    return sqliteDatabase.getAllProgress(userId, params);
  }

  static async updateProgress(progressData: {
    videoId: number;
    watchTimeSeconds: number;
    totalDuration?: number;
    lastPosition?: number;
    bookmarkNotes?: string;
  }): Promise<void> {
    const userId = this.getUserId();
    const completed = progressData.totalDuration ? progressData.watchTimeSeconds >= progressData.totalDuration * 0.9 : false;
    await sqliteDatabase.updateProgress({
      userId,
      videoId: progressData.videoId,
      watchTime: progressData.watchTimeSeconds,
      completed
    });
  }

  static async getLearningStats(): Promise<LearningStats> {
    const userId = this.getUserId();
    return sqliteDatabase.getLearningStats(userId);
  }

  private static getUserId(): number {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) throw new Error('User not logged in');
    return user.id;
  }
}