import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import LoadingSpinner from '@/components/LoadingSpinner';
import api from '@/lib/api';

interface Playlist {
  id: number;
  title: string;
  description: string;
  created_at: string;
}

interface Video {
  id: number;
  title: string;
  url: string;
  chapter_id: number;
  chapter_name?: string;
}

interface PlaylistVideo {
  id: number;
  playlist_id: number;
  video_id: number;
  order: number;
  video: Video;
}

interface UserProgress {
  playlist_id: number;
  video_id: number;
  completed: boolean;
  last_watched: string;
}

// API service functions

const updateUserProgress = async ({
  playlistId,
  videoId,
  completed,
}) => {
  const response = await api.post(`/playlists/${playlistId}/progress`, { video_id: videoId, completed });
  return response.data;
};

const PlaylistDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number | null>(null);

  // Queries
  const { data: playlist, isLoading: isLoadingPlaylist } = useQuery({
    queryKey: ['playlist', id],
    queryFn: () => fetchPlaylist(id!),
    enabled: !!id,
  });

  const { data: playlistVideos, isLoading: isLoadingVideos } = useQuery({
    queryKey: ['playlistVideos', id],
    queryFn: () => fetchPlaylistVideos(id!),
    enabled: !!id,
  });

  const { data: userProgress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['userProgress', id],
    queryFn: () => fetchUserProgress(id!),
    enabled: !!id,
  });

  // Mutations
  const updateProgressMutation = useMutation({
    mutationFn: updateUserProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProgress', id] });
    },
  });

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!userProgress || !playlistVideos || playlistVideos.length === 0) return 0;
    
    const completedVideos = userProgress.filter(p => p.completed).length;
    return Math.round((completedVideos / playlistVideos.length) * 100);
  };

  // Find the next unwatched video
  useEffect(() => {
    if (playlistVideos && userProgress && currentVideoIndex === null) {
      // Sort videos by order
      const sortedVideos = [...playlistVideos].sort((a, b) => a.order - b.order);
      
      // Find first unwatched video
      const unwatchedIndex = sortedVideos.findIndex(video => {
        const progress = userProgress.find(p => p.video_id === video.video_id);
        return !progress || !progress.completed;
      });
      
      // If all videos are watched, start from the beginning
      setCurrentVideoIndex(unwatchedIndex >= 0 ? unwatchedIndex : 0);
    }
  }, [playlistVideos, userProgress, currentVideoIndex]);

  // Handle video completion
  const handleVideoComplete = (videoId: number) => {
    if (playlist) {
      updateProgressMutation.mutate({
        playlistId: playlist.id,
        videoId,
        completed: true,
      });
    }
  };

  // Navigate to video player
  const playVideo = (videoId: number) => {
    navigate(`/videos/${videoId}?playlist=${id}`);
  };
  // Handle next video
  const handleNextVideo = () => {
    if (playlistVideos && currentVideoIndex !== null) {
      const sortedVideos = [...playlistVideos].sort((a, b) => a.order - b.order);
      if (currentVideoIndex < sortedVideos.length - 1) {
        setCurrentVideoIndex(currentVideoIndex + 1);
        playVideo(sortedVideos[currentVideoIndex + 1].video_id);
      }
    }
  };

  // Handle previous video
  const handlePreviousVideo = () => {
    if (playlistVideos && currentVideoIndex !== null && currentVideoIndex > 0) {
      const sortedVideos = [...playlistVideos].sort((a, b) => a.order - b.order);
      setCurrentVideoIndex(currentVideoIndex - 1);
      playVideo(sortedVideos[currentVideoIndex - 1].video_id);
    }
  };

  if (isLoadingPlaylist || isLoadingVideos || isLoadingProgress) {
    return <LoadingSpinner />;
  }

  if (!playlist || !playlistVideos) {
    return <div className="container mx-auto p-4">Playlist not found</div>;
  }

  const sortedVideos = [...playlistVideos].sort((a, b) => a.order - b.order);
  const progressPercentage = calculateProgress();

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{playlist.title}</h1>
        <p className="text-gray-500">{playlist.description}</p>
        
        <div className="mt-4">
          <div className="flex items-center">
            <span className="mr-2">Progress:</span>
            <Progress value={progressPercentage} className="w-full" />
            <span className="ml-2">{progressPercentage}%</span>
          </div>
        </div>
      </div>

      {currentVideoIndex !== null && sortedVideos.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Video</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <h3 className="text-xl font-medium mb-4">
                  {sortedVideos[currentVideoIndex]?.title || 'Loading...'}
                </h3>
                <div className="flex space-x-4">
                  <Button 
                    onClick={() => handlePreviousVideo()} 
                    disabled={currentVideoIndex === 0}
                  >
                    Previous
                  </Button>
                  <Button 
                    onClick={() => playVideo(sortedVideos[currentVideoIndex].video_id)}
                  >
                    Play Video
                  </Button>
                  <Button 
                    onClick={() => handleNextVideo()} 
                    disabled={currentVideoIndex === sortedVideos.length - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold mb-4">Videos in this Playlist</h2>
        <div className="space-y-4">
          {sortedVideos.map((pv, index) => {
            const progress = userProgress?.find(p => p.video_id === pv.video_id);
            const isCompleted = progress?.completed || false;
            const isCurrentVideo = index === currentVideoIndex;

            return (
              <Card 
                key={pv.id} 
                className={`cursor-pointer ${isCurrentVideo ? 'border-2 border-primary' : ''} ${isCompleted ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
                onClick={() => {
                  setCurrentVideoIndex(index);
                  playVideo(pv.video_id);
                }}
              >
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <div className="flex items-center">
                      <span className="mr-2 font-medium">{pv.order}.</span>
                      <h3 className="font-medium">{pv.title || 'Untitled Video'}</h3>
                    </div>
                    {isCompleted && (
                      <span className="text-sm text-green-600 dark:text-green-400">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                  <Button size="sm" variant="outline">
                    {isCompleted ? 'Rewatch' : 'Watch'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlaylistDetail;

const fetchPlaylist = async (id: string) => {
  const response = await api.get(`/playlists/${id}`);
  return response.data;
};

const fetchPlaylistVideos = async (playlistId: string) => {
  const response = await api.get(`/playlists/${playlistId}/videos`);
  return response.data;
};

const fetchUserProgress = async (playlistId: string) => {
  const response = await api.get(`/playlists/${playlistId}/progress`);
  return response.data;
};