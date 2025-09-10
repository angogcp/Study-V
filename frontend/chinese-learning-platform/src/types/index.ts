export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'student' | 'admin';
  gradeLevel: '初中1' | '初中2' | '初中3';
  avatarUrl?: string;
  totalWatchTime: number;
  videosCompleted: number;
  notesCount: number;
  createdAt: string;
}

export interface Subject {
  id: number;
  name: string;
  name_chinese: string;
  description?: string;
  icon_url?: string;
  color_code: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Video {
  id: number;
  title: string;
  title_chinese?: string;
  description?: string;
  youtube_url: string;
  youtube_id: string;
  thumbnail_url?: string;
  duration: number;
  subject_id: number;
  subject_name?: string;
  subject_name_chinese?: string;
  subject_color?: string;
  grade_level: '初中1' | '初中2' | '初中3';
  chapter?: string;
  topic?: string;
  difficulty_level: 'easy' | 'medium' | 'hard';
  sort_order: number;
  is_active: boolean;
  view_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface VideoProgress {
  id?: number;
  user_id: string;
  video_id: number;
  watch_time_seconds: number;
  total_duration: number;
  progress_percentage: number;
  is_completed: boolean;
  last_position: number;
  bookmark_notes?: string;
  first_watched_at?: string;
  last_watched_at?: string;
  completed_at?: string;
}

export interface UserNote {
  id: number;
  user_id: string;
  video_id: number;
  title: string;
  content: string;
  content_html?: string;
  timestamp_seconds: number;
  is_private: boolean;
  tags?: string[];
  video_title?: string;
  video_title_chinese?: string;
  video_thumbnail_url?: string;
  subject_name?: string;
  created_at: string;
  updated_at: string;
}

export interface LearningStats {
  overall: {
    total_videos_watched: number;
    total_completed: number;
    total_watch_time: number;
    average_progress: number;
  };
  bySubject: Array<{
    subject_name: string;
    color_code: string;
    videos_watched: number;
    completed_count: number;
    avg_progress: number;
  }>;
  recentActivity: Array<{
    title: string;
    title_chinese?: string;
    thumbnail_url?: string;
    subject_name: string;
    progress_percentage: number;
    is_completed: boolean;
    last_watched_at: string;
  }>;
}

export interface PaginatedResponse<T> {
  data?: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}