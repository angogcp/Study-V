import { sqliteDatabase } from './sqliteDatabase';
import { Video, PaginatedResponse } from '@/types';

export class VideoService {
  static async getAllVideos(params?: {
    subject_id?: number;
    grade_level?: '初中1' | '初中2' | '初中3';
    chapter?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Video> & { videos: Video[] }> {
    const result = await sqliteDatabase.getAllVideos(params || {});
    return { videos: result.videos, total: result.total };
  }

  static async getVideoById(id: number): Promise<Video> {
    return await sqliteDatabase.getVideo(id);
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
    const mappedData = {
      title: videoData.title,
      title_chinese: videoData.titleChinese,
      description: videoData.description,
      youtube_url: videoData.youtubeUrl,
      subject_id: videoData.subjectId,
      grade_level: videoData.gradeLevel,
      chapter: videoData.chapter,
      topic: videoData.topic,
      difficulty_level: videoData.difficultyLevel,
      sort_order: videoData.sortOrder,
    };
    const id = await sqliteDatabase.createVideo(mappedData);
    return { id };
  }

  static async updateVideo(
    id: number,
    videoData: Partial<Video>
  ): Promise<void> {
    await sqliteDatabase.updateVideo(id, videoData);
  }

  static async deleteVideo(id: number): Promise<void> {
    await sqliteDatabase.deleteVideo(id);
  }
}