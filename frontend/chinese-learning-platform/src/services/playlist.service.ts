import api from '@/lib/api';
import { Video } from './video.service';

export interface Playlist {
  id: number;
  name: string;
  description: string;
  subject_id: number;
  subject_name?: string;
  grade_level: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_public: number;
  is_featured: number;
  video_count?: number;
  videos?: Video[];
}

export interface PlaylistProgress {
  id: number;
  user_id: string;
  playlist_id: number;
  current_video_index: number;
  is_completed: number;
  last_watched_at: string;
}

export interface PlaylistVideo {
  playlist_id: number;
  video_id: number;
  sort_order: number;
}

class PlaylistService {
  // Get all playlists (public ones for students, all for admins)
  async getPlaylists() {
    const response = await api.get('/playlists');
    return response.data;
  }

  // Get a specific playlist with its videos
  async getPlaylist(id: number) {
    const response = await api.get(`/playlists/${id}`);
    return response.data;
  }

  // Create a new playlist (admin only)
  async createPlaylist(playlist: Partial<Playlist>) {
    const response = await api.post('/playlists', playlist);
    return response.data;
  }

  // Update a playlist (admin only)
  async updatePlaylist(id: number, playlist: Partial<Playlist>) {
    const response = await api.put(`/playlists/${id}`, playlist);
    return response.data;
  }

  // Delete a playlist (admin only)
  async deletePlaylist(id: number) {
    const response = await api.delete(`/playlists/${id}`);
    return response.data;
  }

  // Add a video to a playlist (admin only)
  async addVideoToPlaylist(playlistId: number, videoId: number, sortOrder?: number) {
    const response = await api.post(`/playlists/${playlistId}/videos`, {
      video_id: videoId,
      sort_order: sortOrder
    });
    return response.data;
  }

  // Remove a video from a playlist (admin only)
  async removeVideoFromPlaylist(playlistId: number, videoId: number) {
    const response = await api.delete(`/playlists/${playlistId}/videos/${videoId}`);
    return response.data;
  }

  // Update video order in playlist (admin only)
  async updateVideoOrder(playlistId: number, videos: { video_id: number }[]) {
    const response = await api.put(`/playlists/${playlistId}/videos/order`, { videos });
    return response.data;
  }

  // Get user's progress for a playlist
  async getPlaylistProgress(playlistId: number) {
    const response = await api.get(`/playlists/${playlistId}/progress`);
    return response.data;
  }

  // Update user's progress for a playlist
  async updatePlaylistProgress(playlistId: number, progress: Partial<PlaylistProgress>) {
    const response = await api.put(`/playlists/${playlistId}/progress`, progress);
    return response.data;
  }
}

export default new PlaylistService();