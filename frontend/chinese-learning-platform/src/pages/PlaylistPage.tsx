import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/LoadingSpinner';
import PlaylistService from '@/services/playlist.service';

const PlaylistPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPlaylist, setSelectedPlaylist] = useState<number | null>(null);

  const { data: playlists, isLoading } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => PlaylistService.getPlaylists()
  });

  const handlePlaylistSelect = (playlistId: number) => {
    setSelectedPlaylist(playlistId);
  };

  const handleStartPlaylist = () => {
    if (selectedPlaylist) {
      navigate(`/playlist/${selectedPlaylist}`);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">视频播放列表</h1>
          {selectedPlaylist && (
            <Button onClick={handleStartPlaylist}>开始学习</Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists && playlists.length > 0 ? (
            playlists.map((playlist: any) => (
              <Card 
                key={playlist.id} 
                className={`cursor-pointer transition-all ${
                  selectedPlaylist === playlist.id 
                    ? 'ring-2 ring-primary shadow-lg' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => handlePlaylistSelect(playlist.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{playlist.name}</CardTitle>
                    {playlist.is_featured === 1 && (
                      <Badge variant="secondary">推荐</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-2">
                    {playlist.description || '暂无描述'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {playlist.subject_name && (
                      <Badge variant="outline">{playlist.subject_name}</Badge>
                    )}
                    {playlist.grade_level && (
                      <Badge variant="outline">{playlist.grade_level}</Badge>
                    )}
                    <Badge variant="outline">{playlist.video_count || 0} 个视频</Badge>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 flex justify-between">
                  <span className="text-xs text-gray-400">
                    创建于 {new Date(playlist.created_at).toLocaleDateString()}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/playlist/${playlist.id}`);
                    }}
                  >
                    查看详情
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">暂无可用的播放列表</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaylistPage;