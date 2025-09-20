import initSqlJs from 'sql.js';
import { Video, Chapter, VideoProgress, LearningStats, Note } from '@/types'; // Adjust imports as needed

class SqliteDatabaseService {
  private db: any = null;

  async initialize() {
    if (this.db) return;
    const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });
    const response = await fetch('/learning_platform.db');
    if (!response.ok) throw new Error('Failed to load database');
    const arrayBuffer = await response.arrayBuffer();
    this.db = new SQL.Database(new Uint8Array(arrayBuffer));
  }

  private async executeQuery(query: string, params: any[] = []): Promise<any[]> {
    await this.initialize();
    const stmt = this.db.prepare(query);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  private async executeNonQuery(query: string, params: any[] = []): Promise<void> {
    await this.initialize();
    const stmt = this.db.prepare(query);
    stmt.bind(params);
    stmt.run();
    stmt.free();
  }

  // Video methods
  async getAllVideos(params: any = {}): Promise<{ videos: Video[], total: number }> {
    let where = [];
    let queryParams = [];
    if (params.subject_id) {
      where.push('subject_id = ?');
      queryParams.push(params.subject_id);
    }
    if (params.grade_level) {
      where.push('grade_level = ?');
      queryParams.push(params.grade_level);
    }
    if (params.chapter) {
      where.push('chapter = ?');
      queryParams.push(params.chapter);
    }
    if (params.search) {
      where.push('(title LIKE ? OR title_chinese LIKE ? OR description LIKE ?)');
      const search = `%${params.search}%`;
      queryParams.push(search, search, search);
    }

    // Add filter to exclude empty records
    where.push('(title <> "" OR title_chinese <> "")');
    where.push('youtube_url <> ""');

    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const countQuery = `SELECT COUNT(*) as total FROM videos${whereClause}`;
    const countResult = await this.executeQuery(countQuery, queryParams);
    const total = countResult[0].total;

    let query = `SELECT * FROM videos${whereClause}`;
    if (params.page && params.limit) {
      query += ` LIMIT ? OFFSET ?`;
      queryParams.push(params.limit, (params.page - 1) * params.limit);
    }

    const videos = await this.executeQuery(query, queryParams);
    return { videos, total };
  }

  async getVideo(id: number): Promise<Video> {
    const results = await this.executeQuery('SELECT * FROM videos WHERE id = ?', [id]);
    return results[0] as Video;
  }

  // Chapter methods
  async getChapters(params: any = {}): Promise<Chapter[]> {
    let where = [];
    let queryParams = [];
    if (params.subject_id) {
      where.push('subject_id = ?');
      queryParams.push(params.subject_id);
    }
    if (params.grade_level) {
      where.push('grade_level = ?');
      queryParams.push(params.grade_level);
    }
    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';
    const query = `SELECT * FROM chapters${whereClause} ORDER BY sort_order`;
    return await this.executeQuery(query, queryParams) as Chapter[];
  }

  async createChapter(data: Partial<Chapter>): Promise<number> {
    const { subject_id, grade_level, name, sort_order } = data;
    await this.executeNonQuery(
      'INSERT INTO chapters (subject_id, grade_level, name, sort_order) VALUES (?, ?, ?, ?)',
      [subject_id, grade_level, name, sort_order || 0]
    );
    return this.db.getRowsModified();
  }

  async updateChapter(id: number, data: Partial<Chapter>): Promise<void> {
    let sets = [];
    let params = [];
    if (data.subject_id) {
      sets.push('subject_id = ?');
      params.push(data.subject_id);
    }
    if (data.grade_level) {
      sets.push('grade_level = ?');
      params.push(data.grade_level);
    }
    if (data.name) {
      sets.push('name = ?');
      params.push(data.name);
    }
    if (data.sort_order !== undefined) {
      sets.push('sort_order = ?');
      params.push(data.sort_order);
    }
    params.push(id);
    const query = `UPDATE chapters SET ${sets.join(', ')} WHERE id = ?`;
    await this.executeNonQuery(query, params);
  }

  async deleteChapter(id: number): Promise<void> {
    await this.executeNonQuery('DELETE FROM chapters WHERE id = ?', [id]);
  }

  // Progress methods
  async getVideoProgress(videoId: number, userId: number): Promise<VideoProgress> {
    const results = await this.executeQuery(
      'SELECT * FROM video_progress WHERE video_id = ? AND user_id = ?',
      [videoId, userId]
    );
    return results[0] as VideoProgress || { watch_time: 0, completed: false };
  }

  async getAllProgress(userId: number, params: any = {}): Promise<{ progress: VideoProgress[], total: number }> {
    let where = ['user_id = ?'];
    let queryParams = [userId];
    if (params.completed !== undefined) {
      where.push('completed = ?');
      queryParams.push(params.completed ? 1 : 0);
    }
    if (params.subject_id) {
      where.push('subject_id = ?'); // Assuming join with videos
      queryParams.push(params.subject_id);
    }
    if (params.grade_level) {
      where.push('grade_level = ?');
      queryParams.push(params.grade_level);
    }

    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

    // Need to join with videos for filters like subject_id, grade_level
    const countQuery = `SELECT COUNT(*) as total FROM video_progress vp LEFT JOIN videos v ON vp.video_id = v.id${whereClause}`;
    const countResult = await this.executeQuery(countQuery, queryParams);
    const total = countResult[0].total;

    let query = `SELECT vp.* FROM video_progress vp LEFT JOIN videos v ON vp.video_id = v.id${whereClause}`;
    if (params.page && params.limit) {
      query += ` LIMIT ? OFFSET ?`;
      queryParams.push(params.limit, (params.page - 1) * params.limit);
    }

    const progress = await this.executeQuery(query, queryParams);
    return { progress, total };
  }

  async updateProgress(data: { userId: number, videoId: number, watchTime: number, completed: boolean }): Promise<void> {
    const { userId, videoId, watchTime, completed } = data;
    await this.executeNonQuery(
      'INSERT OR REPLACE INTO video_progress (user_id, video_id, watch_time, completed, last_watched) VALUES (?, ?, ?, ?, datetime("now"))',
      [userId, videoId, watchTime, completed ? 1 : 0]
    );
  }

  async getLearningStats(userId: number): Promise<LearningStats> {
    const totalVideos = (await this.executeQuery('SELECT COUNT(*) as count FROM videos'))[0].count;
    const completed = (await this.executeQuery('SELECT COUNT(*) as count FROM video_progress WHERE user_id = ? AND completed = 1', [userId]))[0].count;
    const totalTime = (await this.executeQuery('SELECT SUM(watch_time) as total FROM video_progress WHERE user_id = ?', [userId]))[0].total || 0;
    return { totalVideos, completedVideos: completed, totalWatchTime: totalTime };
  }

  // Add more methods for notes, auth, etc. as needed
  async createVideo(data: {
    title: string;
    title_chinese?: string;
    description?: string;
    youtube_url: string;
    subject_id: number;
    grade_level: string;
    chapter?: string;
    topic?: string;
    difficulty_level?: string;
    sort_order?: number;
  }): Promise<number> {
    const { title, title_chinese, description, youtube_url, subject_id, grade_level, chapter, topic, difficulty_level, sort_order } = data;
    await this.executeNonQuery(
      'INSERT INTO videos (title, title_chinese, description, youtube_url, subject_id, grade_level, chapter, topic, difficulty_level, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, title_chinese || '', description || '', youtube_url, subject_id, grade_level, chapter || '', topic || '', difficulty_level || 'medium', sort_order || 0]
    );
    return this.db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  }

  async updateVideo(id: number, data: Partial<Video>): Promise<void> {
    let sets = [];
    let params = [];
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(data[key]);
      }
    });
    params.push(id);
    const query = `UPDATE videos SET ${sets.join(', ')} WHERE id = ?`;
    await this.executeNonQuery(query, params);
  }

  async deleteVideo(id: number): Promise<void> {
    await this.executeNonQuery('DELETE FROM videos WHERE id = ?', [id]);
  }

  // User methods
  async getAllUsers(params: { search?: string; page?: number; limit?: number } = {}): Promise<{ users: User[], total: number }> {
    let where = [];
    let queryParams = [];
    if (params.search) {
      where.push('(email LIKE ? OR full_name LIKE ?)');
      const search = `%${params.search}%`;
      queryParams.push(search, search);
    }
    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const countQuery = `SELECT COUNT(*) as total FROM user_profiles${whereClause}`;
    const countResult = await this.executeQuery(countQuery, queryParams);
    const total = countResult[0].total;

    let query = `SELECT * FROM user_profiles${whereClause}`;
    if (params.page && params.limit) {
      query += ` LIMIT ? OFFSET ?`;
      queryParams.push(params.limit, (params.page - 1) * params.limit);
    }

    const users = await this.executeQuery(query, queryParams);
    return { users, total };
  }

  async getUser(id: number): Promise<User> {
    const results = await this.executeQuery('SELECT * FROM user_profiles WHERE id = ?', [id]);
    return results[0] as User;
  }

  async updateUser(id: number, data: Partial<User>): Promise<void> {
    let sets = [];
    let params = [];
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        if (key === 'password') {
          // Handle password update
          const salt = crypto.getRandomValues(new Uint8Array(16)).toString();
          const hash = this.hashPassword(data[key], salt);
          sets.push('password_hash = ?, password_salt = ?');
          params.push(hash, salt);
        } else {
          sets.push(`${key} = ?`);
          params.push(data[key]);
        }
      }
    });
    params.push(id);
    const query = `UPDATE user_profiles SET ${sets.join(', ')} WHERE id = ?`;
    await this.executeNonQuery(query, params);
  }

  async deleteUser(id: number): Promise<void> {
    await this.executeNonQuery('DELETE FROM user_profiles WHERE id = ?', [id]);
  }

  async registerUser(email: string, password: string, full_name: string, grade_level: string): Promise<number> {
    const salt = crypto.getRandomValues(new Uint8Array(16)).toString();
    const hash = await this.hashPassword(password, salt);
    await this.executeNonQuery(
      'INSERT INTO user_profiles (email, password_hash, password_salt, full_name, grade_level) VALUES (?, ?, ?, ?, ?)',
      [email, hash, salt, full_name, grade_level]
    );
    return this.db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  }

  async login(email: string, password: string): Promise<any> {
    const users = await this.executeQuery('SELECT * FROM user_profiles WHERE email = ?', [email]);
    if (users.length === 0) throw new Error('User not found');
    const user = users[0];
    const hash = await this.hashPassword(password, user.password_salt);
    if (hash !== user.password_hash) throw new Error('Invalid password');
    // Create session or token, for client-side, perhaps store in localStorage
    return { user };
  }

  async getProfile(userId: number): Promise<any> {
    const users = await this.executeQuery('SELECT * FROM user_profiles WHERE id = ?', [userId]);
    return users[0];
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: 'SHA-256',
      },
      key,
      256
    );
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Notes methods
  async getAllNotes(userId: number, params: any = {}): Promise<{ notes: Note[], total: number }> {
    let where = ['user_id = ?'];
    let queryParams = [userId];
    if (params.video_id) {
      where.push('video_id = ?');
      queryParams.push(params.video_id);
    }
    if (params.search) {
      where.push('(title LIKE ? OR content LIKE ?)');
      const search = `%${params.search}%`;
      queryParams.push(search, search);
    }
    const whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const countQuery = `SELECT COUNT(*) as total FROM user_notes${whereClause}`;
    const countResult = await this.executeQuery(countQuery, queryParams);
    const total = countResult[0].total;

    let query = `SELECT * FROM user_notes${whereClause} ORDER BY created_at DESC`;
    if (params.page && params.limit) {
      query += ` LIMIT ? OFFSET ?`;
      queryParams.push(params.limit, (params.page - 1) * params.limit);
    }

    const notes = await this.executeQuery(query, queryParams);
    return { notes, total };
  }

  async getVideoNotes(videoId: number, userId: number): Promise<Note[]> {
    return await this.executeQuery(
      'SELECT * FROM user_notes WHERE video_id = ? AND user_id = ? ORDER BY timestamp_seconds',
      [videoId, userId]
    ) as Note[];
  }

  async getNoteById(id: number, userId: number): Promise<Note> {
    const results = await this.executeQuery(
      'SELECT * FROM user_notes WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return results[0] as Note;
  }

  async createNote(data: {
    userId: number;
    videoId: number;
    title?: string;
    content: string;
    contentHtml?: string;
    timestampSeconds?: number;
    isPrivate?: boolean;
    tags?: string;
  }): Promise<number> {
    const { userId, videoId, title, content, contentHtml, timestampSeconds, isPrivate, tags } = data;
    await this.executeNonQuery(
      'INSERT INTO user_notes (user_id, video_id, title, content, content_html, timestamp_seconds, is_private, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
      [userId, videoId, title || '', content, contentHtml || '', timestampSeconds || 0, isPrivate ? 1 : 0, tags || '']
    );
    return this.db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  }

  async updateNote(id: number, userId: number, data: Partial<Note>): Promise<void> {
    let sets = [];
    let params = [];
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && key !== 'id' && key !== 'user_id') {
        sets.push(`${key} = ?`);
        params.push(data[key]);
      }
    });
    params.push(id, userId);
    const query = `UPDATE user_notes SET ${sets.join(', ')}, updated_at = datetime("now") WHERE id = ? AND user_id = ?`;
    await this.executeNonQuery(query, params);
  }

  async deleteNote(id: number, userId: number): Promise<void> {
    await this.executeNonQuery('DELETE FROM user_notes WHERE id = ? AND user_id = ?', [id, userId]);
  }
  // Subject methods
  async getAllSubjects(): Promise<Subject[]> {
    return await this.executeQuery('SELECT * FROM subjects ORDER BY sort_order') as Subject[];
  }

  async getSubject(id: number): Promise<Subject> {
    const results = await this.executeQuery('SELECT * FROM subjects WHERE id = ?', [id]);
    return results[0] as Subject;
  }

  async createSubject(data: {
    name: string;
    name_chinese: string;
    description?: string;
    icon_url?: string;
    color_code?: string;
    sort_order?: number;
  }): Promise<number> {
    const { name, name_chinese, description, icon_url, color_code, sort_order } = data;
    await this.executeNonQuery(
      'INSERT INTO subjects (name, name_chinese, description, icon_url, color_code, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [name, name_chinese, description || '', icon_url || '', color_code || '', sort_order || 0]
    );
    return this.db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  }

  async updateSubject(id: number, data: Partial<Subject>): Promise<void> {
    let sets = [];
    let params = [];
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(data[key]);
      }
    });
    params.push(id);
    const query = `UPDATE subjects SET ${sets.join(', ')} WHERE id = ?`;
    await this.executeNonQuery(query, params);
  }

  async deleteSubject(id: number): Promise<void> {
    await this.executeNonQuery('DELETE FROM subjects WHERE id = ?', [id]);
  }
}

export const sqliteDatabase = new SqliteDatabaseService();