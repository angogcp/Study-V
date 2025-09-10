import api from '@/lib/api';
import { UserNote, PaginatedResponse, ApiResponse } from '@/types';

export class NotesService {
  static async getAllNotes(params?: {
    video_id?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<UserNote> & { notes: UserNote[] }> {
    const response = await api.get<PaginatedResponse<UserNote> & { notes: UserNote[] }>('/notes', {
      params,
    });
    return response.data;
  }

  static async getVideoNotes(videoId: number): Promise<UserNote[]> {
    const response = await api.get<UserNote[]>(`/notes/video/${videoId}`);
    return response.data;
  }

  static async getNoteById(id: number): Promise<UserNote> {
    const response = await api.get<UserNote>(`/notes/${id}`);
    return response.data;
  }

  static async createNote(noteData: {
    videoId: number;
    title?: string;
    content: string;
    contentHtml?: string;
    timestampSeconds?: number;
    isPrivate?: boolean;
    tags?: string[];
  }): Promise<{ id: number }> {
    const response = await api.post<ApiResponse<{ id: number }>>('/notes', noteData);
    return response.data.data!;
  }

  static async updateNote(
    id: number,
    noteData: Partial<{
      title: string;
      content: string;
      contentHtml: string;
      timestampSeconds: number;
      isPrivate: boolean;
      tags: string[];
    }>
  ): Promise<void> {
    await api.put(`/notes/${id}`, noteData);
  }

  static async deleteNote(id: number): Promise<void> {
    await api.delete(`/notes/${id}`);
  }

  static async exportNotesPDF(params: {
    noteIds?: number[];
    videoId?: number;
    format?: 'detailed' | 'summary';
  }): Promise<Blob> {
    const response = await api.post('/notes/export/pdf', params, {
      responseType: 'blob',
    });
    return response.data;
  }
}