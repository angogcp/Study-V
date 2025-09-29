import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import LoadingSpinner from '@/components/LoadingSpinner';
import Cookies from 'js-cookie';

// Define interfaces
interface Playlist {
  id: number;
  name: string;
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
  video?: Video;
}

// API service functions
const fetchPlaylists = async (): Promise<Playlist[]> => {
  const token = Cookies.get('auth_token');
  const response = await fetch('/api/playlists', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch playlists');
  }
  return response.json();
};

const fetchVideos = async (): Promise<Video[]> => {
  const token = Cookies.get('auth_token');
  const response = await fetch('/api/videos', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch videos');
  }
  const data = await response.json();
  return data.videos || [];
};
const fetchPlaylistVideos = async (playlistId: number): Promise<PlaylistVideo[]> => {
  const token = Cookies.get('auth_token');
  const response = await fetch(`/api/playlists/${playlistId}/videos`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch playlist videos');
  }
  return response.json();
};

const createPlaylist = async (playlist: Omit<Playlist, 'id' | 'created_at'>): Promise<Playlist> => {
  const token = Cookies.get('auth_token');
  const response = await fetch('/api/playlists', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(playlist),
  });
  if (!response.ok) {
    throw new Error('Failed to create playlist');
  }
  return response.json();
};

const updatePlaylist = async (playlist: Partial<Playlist> & { id: number }): Promise<Playlist> => {
  const token = Cookies.get('auth_token');
  const response = await fetch(`/api/playlists/${playlist.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(playlist),
  });
  if (!response.ok) {
    throw new Error('Failed to update playlist');
  }
  return response.json();
};

const deletePlaylist = async (id: number): Promise<void> => {
  const token = Cookies.get('auth_token');
  const response = await fetch(`/api/playlists/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error('Failed to delete playlist');
  }
};

const addVideoToPlaylist = async (playlistId: number, videoId: number, order: number): Promise<void> => {
  const token = Cookies.get('auth_token');
  const response = await fetch(`/api/playlists/${playlistId}/videos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ video_id: videoId, order }),
  });
  if (!response.ok) {
    throw new Error('Failed to add video to playlist');
  }
};

const removeVideoFromPlaylist = async (playlistId: number, videoId: number): Promise<void> => {
  const token = Cookies.get('auth_token');
  const response = await fetch(`/api/playlists/${playlistId}/videos/${videoId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error('Failed to remove video from playlist');
  }
};

const updateVideoOrder = async (playlistId: number, videoId: number, newOrder: number): Promise<void> => {
  const token = Cookies.get('auth_token');
  const response = await fetch(`/api/playlists/${playlistId}/videos/${videoId}/order`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ order: newOrder }),
  });
  if (!response.ok) {
    throw new Error('Failed to update video order');
  }
};

const PlaylistManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [newPlaylist, setNewPlaylist] = useState({ name: '', description: '' });
  const [editPlaylist, setEditPlaylist] = useState<Playlist | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddVideoDialogOpen, setIsAddVideoDialogOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [videoOrder, setVideoOrder] = useState<number>(0);

  // Queries
  const { data: playlists, isLoading: isLoadingPlaylists } = useQuery({
    queryKey: ['playlists'],
    queryFn: fetchPlaylists,
  });

  const { data: videos, isLoading: isLoadingVideos } = useQuery({
    queryKey: ['videos'],
    queryFn: fetchVideos,
  });

  const { data: playlistVideos, isLoading: isLoadingPlaylistVideos } = useQuery({
    queryKey: ['playlistVideos', selectedPlaylist?.id],
    queryFn: () => (selectedPlaylist ? fetchPlaylistVideos(selectedPlaylist.id) : Promise.resolve([])),
    enabled: !!selectedPlaylist,
  });

  // Mutations
  const createPlaylistMutation = useMutation({
    mutationFn: createPlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setIsCreateDialogOpen(false);
      setNewPlaylist({ name: '', description: '' });
    },
  });

  const updatePlaylistMutation = useMutation({
    mutationFn: updatePlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setIsEditDialogOpen(false);
      setEditPlaylist(null);
    },
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: deletePlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      if (selectedPlaylist) {
        setSelectedPlaylist(null);
      }
    },
  });

  const addVideoMutation = useMutation({
    mutationFn: ({ playlistId, videoId, order }: { playlistId: number; videoId: number; order: number }) =>
      addVideoToPlaylist(playlistId, videoId, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlistVideos', selectedPlaylist?.id] });
      setIsAddVideoDialogOpen(false);
      setSelectedVideoId(null);
      setVideoOrder(0);
    },
  });

  const removeVideoMutation = useMutation({
    mutationFn: ({ playlistId, videoId }: { playlistId: number; videoId: number }) =>
      removeVideoFromPlaylist(playlistId, videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlistVideos', selectedPlaylist?.id] });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ playlistId, videoId, order }: { playlistId: number; videoId: number; order: number }) =>
      updateVideoOrder(playlistId, videoId, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlistVideos', selectedPlaylist?.id] });
    },
  });

  // Handlers
  const handleCreatePlaylist = () => {
    if (newPlaylist.name.trim()) {
      createPlaylistMutation.mutate(newPlaylist);
    }
  };

  const handleUpdatePlaylist = () => {
    if (editPlaylist && editPlaylist.name.trim()) {
      updatePlaylistMutation.mutate(editPlaylist);
    }
  };

  const handleDeletePlaylist = (id: number) => {
    if (window.confirm('Are you sure you want to delete this playlist?')) {
      deletePlaylistMutation.mutate(id);
    }
  };

  const handleAddVideo = () => {
    if (selectedPlaylist && selectedVideoId) {
      addVideoMutation.mutate({
        playlistId: selectedPlaylist.id,
        videoId: selectedVideoId,
        order: videoOrder,
      });
    }
  };

  const handleRemoveVideo = (videoId: number) => {
    if (selectedPlaylist) {
      removeVideoMutation.mutate({
        playlistId: selectedPlaylist.id,
        videoId,
      });
    }
  };

  const handleUpdateOrder = (videoId: number, newOrder: number) => {
    if (selectedPlaylist) {
      updateOrderMutation.mutate({
        playlistId: selectedPlaylist.id,
        videoId,
        order: newOrder,
      });
    }
  };

  // Calculate next order number for new videos
  useEffect(() => {
    if (playlistVideos && playlistVideos.length > 0) {
      const maxOrder = Math.max(...playlistVideos.map(pv => pv.order));
      setVideoOrder(maxOrder + 1);
    } else {
      setVideoOrder(1);
    }
  }, [playlistVideos]);

  if (isLoadingPlaylists) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Playlist Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Playlists List */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Playlists</span>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">Create New</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Playlist</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <label htmlFor="title" className="block text-sm font-medium mb-1">
                          Name
                        </label>
                        <Input
                          id="title"
                          value={newPlaylist.name}
                          onChange={e => setNewPlaylist({ ...newPlaylist, name: e.target.value })}
                          placeholder="Enter playlist name"
                        />
                      </div>
                      <div>
                        <label htmlFor="description" className="block text-sm font-medium mb-1">
                          Description
                        </label>
                        <Input
                          id="description"
                          value={newPlaylist.description}
                          onChange={e => setNewPlaylist({ ...newPlaylist, description: e.target.value })}
                          placeholder="Enter playlist description"
                        />
                      </div>
                      <Button onClick={handleCreatePlaylist} disabled={createPlaylistMutation.isPending}>
                        {createPlaylistMutation.isPending ? 'Creating...' : 'Create Playlist'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {playlists && playlists.length > 0 ? (
                <div className="space-y-2">
                  {playlists.map(playlist => (
                    <div
                      key={playlist.id}
                      className={`p-3 border rounded-md cursor-pointer flex justify-between items-center ${
                        selectedPlaylist?.id === playlist.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                      }`}
                      onClick={() => setSelectedPlaylist(playlist)}
                    >
                      <div>
                        <h3 className="font-medium">{playlist.name}</h3>
                        <p className="text-sm text-gray-500">{playlist.description}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={e => {
                            e.stopPropagation();
                            setEditPlaylist(playlist);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={e => {
                            e.stopPropagation();
                            handleDeletePlaylist(playlist.id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">No playlists found. Create one to get started.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Playlist Details */}
        <div className="md:col-span-2">
          {selectedPlaylist ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{selectedPlaylist.name}</span>
                  <Dialog open={isAddVideoDialogOpen} onOpenChange={setIsAddVideoDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">Add Video</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Video to Playlist</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <label htmlFor="video" className="block text-sm font-medium mb-1">
                            Select Video
                          </label>
                          <select
                            id="video"
                            className="w-full p-2 border rounded-md"
                            value={selectedVideoId || ''}
                            onChange={e => setSelectedVideoId(Number(e.target.value))}
                          >
                            <option value="">Select a video</option>
                            {videos &&
                              videos.map(video => (
                                <option key={video.id} value={video.id}>
                                  {video.title}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="order" className="block text-sm font-medium mb-1">
                            Order
                          </label>
                          <Input
                            id="order"
                            type="number"
                            min="1"
                            value={videoOrder}
                            onChange={e => setVideoOrder(Number(e.target.value))}
                          />
                        </div>
                        <Button onClick={handleAddVideo} disabled={addVideoMutation.isPending || !selectedVideoId}>
                          {addVideoMutation.isPending ? 'Adding...' : 'Add Video'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
                <p className="text-gray-500">{selectedPlaylist.description}</p>
              </CardHeader>
              <CardContent>
                {isLoadingPlaylistVideos ? (
                  <LoadingSpinner />
                ) : playlistVideos && playlistVideos.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Video Title</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {playlistVideos
                        .sort((a, b) => a.order - b.order)
                        .map(pv => {
                          const video = videos?.find(v => v.id === pv.video_id);
                          return (
                            <TableRow key={pv.id}>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Input
                                    type="number"
                                    min="1"
                                    className="w-16"
                                    value={pv.order}
                                    onChange={e => {
                                      const newOrder = Number(e.target.value);
                                      if (newOrder > 0) {
                                        handleUpdateOrder(pv.video_id, newOrder);
                                      }
                                    }}
                                  />
                                </div>
                              </TableCell>
                              <TableCell>{video?.title || `Video ID: ${pv.video_id}`}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRemoveVideo(pv.video_id)}
                                >
                                  Remove
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-4 text-gray-500">
                    No videos in this playlist. Add videos to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Select a playlist to view and manage its videos</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Playlist Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
          </DialogHeader>
          {editPlaylist && (
            <div className="space-y-4 mt-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium mb-1">
                  Name
                </label>
                <Input
                  id="edit-name"
                  value={editPlaylist.name}
                  onChange={e => setEditPlaylist({ ...editPlaylist, name: e.target.value })}
                  placeholder="Enter playlist name"
                />
              </div>
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium mb-1">
                  Description
                </label>
                <Input
                  id="edit-description"
                  value={editPlaylist.description}
                  onChange={e => setEditPlaylist({ ...editPlaylist, description: e.target.value })}
                  placeholder="Enter playlist description"
                />
              </div>
              <Button onClick={handleUpdatePlaylist} disabled={updatePlaylistMutation.isPending}>
                {updatePlaylistMutation.isPending ? 'Updating...' : 'Update Playlist'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlaylistManagement;