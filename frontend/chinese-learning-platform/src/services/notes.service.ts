import { sqliteDatabase } from './sqliteDatabase';

export class NotesService {
  static async getAllNotes(params?: {
    video_id?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ notes: UserNote[], total: number }> {
    const userId = this.getUserId();
    return sqliteDatabase.getAllNotes(userId, params);
  }

  static async getVideoNotes(videoId: number): Promise<UserNote[]> {
    const userId = this.getUserId();
    return sqliteDatabase.getVideoNotes(videoId, userId);
  }

  static async getNoteById(id: number): Promise<UserNote> {
    const userId = this.getUserId();
    return sqliteDatabase.getNoteById(id, userId);
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
    const userId = this.getUserId();
    const id = await sqliteDatabase.createNote({
      userId,
      videoId: noteData.videoId,
      title: noteData.title,
      content: noteData.content,
      contentHtml: noteData.contentHtml,
      timestampSeconds: noteData.timestampSeconds,
      isPrivate: noteData.isPrivate,
      tags: noteData.tags ? noteData.tags.join(',') : ''
    });
    return { id };
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
    const userId = this.getUserId();
    await sqliteDatabase.updateNote(id, userId, {
      ...noteData,
      tags: noteData.tags ? noteData.tags.join(',') : undefined
    });
  }

  static async deleteNote(id: number): Promise<void> {
    const userId = this.getUserId();
    await sqliteDatabase.deleteNote(id, userId);
  }

  // For exports, implement client-side generation
  static async exportNotesPDF(params: {
    noteIds?: number[];
    videoId?: number;
    format?: 'detailed' | 'summary';
  }): Promise<Blob> {
    // TODO: Implement PDF generation using jsPDF or similar
    const text = 'PDF export not implemented yet';
    return new Blob([text], { type: 'application/pdf' });
  }

  static async exportNotesMarkdown(params: {
    noteIds?: number[];
    videoId?: number;
    format?: 'detailed' | 'summary';
  }): Promise<Blob> {
    const userId = this.getUserId();
    let notes;
    if (params.noteIds) {
      // Get specific notes
      notes = await Promise.all(params.noteIds.map(id => this.getNoteById(id)));
    } else if (params.videoId) {
      notes = await this.getVideoNotes(params.videoId);
    } else {
      notes = (await this.getAllNotes()).notes;
    }
    let markdown = '';
    notes.forEach(note => {
      markdown += `# ${note.title || 'Note'}\n\n${note.content}\n\n`;
    });
    return new Blob([markdown], { type: 'text/markdown' });
  }

  private static getUserId(): number {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) throw new Error('User not logged in');
    return user.id;
  }
}