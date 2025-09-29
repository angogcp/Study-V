import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { Playlist } from '@/services/playlist.service';
import PlaylistService from '@/services/playlist.service';
import SubjectService from '@/services/subject.service';
import VideoService from '@/services/video.service';
import LoadingSpinner from '@/components/LoadingSpinner';

const PlaylistManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject_id: '',
    grade_level: '',
    is_public: true,
    is_featured: false
  });
  const [selectedVideoId, setSelectedVideoId] = useState('');

  // Fetch playlists
  const { data: playlists, isLoading: isLoadingPlaylists } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => PlaylistService.getPlaylists()
  });

  // Fetch subjects for dropdown
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => SubjectService.getSubjects()
  });

  // Fetch videos for dropdown
  const { data: videos, isLoading: isLoadingVideos } = useQuery({
    queryKey: ['videos'],
    queryFn: () => VideoService.getVideos({ limit: 100 })
  });

  // Create playlist mutation
  const createPlaylistMutation = useMutation({
    mutationFn: (data: any) => PlaylistService.createPlaylist(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success('播放列表创建成功');
    },
    onError: (error: any) => {
      toast.error(`创建失败: ${error.message}`);
    }
  });

  // Update playlist mutation
  const updatePlaylistMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => PlaylistService.updatePlaylist(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setIsEditDialogOpen(false);
      toast.success('播放列表更新成功');
    },
    onError: (error: any) => {
      toast.error(`更新失败: ${error.message}`);
    }
  });

  // Delete playlist mutation
  const deletePlaylistMutation = useMutation({
    mutationFn: (id: number) => PlaylistService.deletePlaylist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('播放列表删除成功');
    },
    onError: (error: any) => {
      toast.error(`删除失败: ${error.message}`);
    }
  });

  // Add video to playlist mutation
  const addVideoMutation = useMutation({
    mutationFn: ({ playlistId, videoId }: { playlistId: number; videoId: number }) => 
      PlaylistService.addVideoToPlaylist(playlistId, videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setIsVideoDialogOpen(false);
      setSelectedVideoId('');
      toast.success('视频添加成功');
    },
    onError: (error: any) => {
      toast.error(`添加视频失败: ${error.message}`);
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      subject_id: '',
      grade_level: '',
      is_public: true,
      is_featured: false
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPlaylistMutation.mutate({
      ...formData,
      subject_id: formData.subject_id ? parseInt(formData.subject_id) : null
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPlaylist) {
      updatePlaylistMutation.mutate({
        id: currentPlaylist.id,
        data: {
          ...formData,
          subject_id: formData.subject_id ? parseInt(formData.subject_id) : null
        }
      });
    }
  };

  const handleDelete = (playlist: Playlist) => {
    if (window.confirm(`确定要删除播放列表 "${playlist.name}" 吗？`)) {
      deletePlaylistMutation.mutate(playlist.id);
    }
  };

  const openEditDialog = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    setFormData({
      name: playlist.name,
      description: playlist.description || '',
      subject_id: playlist.subject_id ? playlist.subject_id.toString() : '',
      grade_level: playlist.grade_level || '',
      is_public: playlist.is_public === 1,
      is_featured: playlist.is_featured === 1
    });
    setIsEditDialogOpen(true);
  };

  const openVideoDialog = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    setIsVideoDialogOpen(true);
  };

  const handleAddVideo = () => {
    if (currentPlaylist && selectedVideoId) {
      addVideoMutation.mutate({
        playlistId: currentPlaylist.id,
        videoId: parseInt(selectedVideoId)
      });
    }
  };

  if (isLoadingPlaylists) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">播放列表管理</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>创建播放列表</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>所有播放列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>学科</TableHead>
                <TableHead>年级</TableHead>
                <TableHead>视频数量</TableHead>
                <TableHead>公开</TableHead>
                <TableHead>推荐</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {playlists && playlists.length > 0 ? (
                playlists.map((playlist: Playlist) => (
                  <TableRow key={playlist.id}>
                    <TableCell className="font-medium">{playlist.name}</TableCell>
                    <TableCell>{playlist.subject_name || '无'}</TableCell>
                    <TableCell>{playlist.grade_level || '无'}</TableCell>
                    <TableCell>{playlist.video_count || 0}</TableCell>
                    <TableCell>{playlist.is_public ? '是' : '否'}</TableCell>
                    <TableCell>{playlist.is_featured ? '是' : '否'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(playlist)}>
                          编辑
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openVideoDialog(playlist)}>
                          添加视频
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(playlist)}>
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    暂无播放列表
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Playlist Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>创建新播放列表</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">名称</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subject_id">学科</Label>
                <Select
                  value={formData.subject_id}
                  onValueChange={(value) => handleSelectChange('subject_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择学科" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">无</SelectItem>
                    {subjects?.map((subject: any) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name_chinese}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="grade_level">年级</Label>
                <Select
                  value={formData.grade_level}
                  onValueChange={(value) => handleSelectChange('grade_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择年级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">无</SelectItem>
                    <SelectItem value="小学1">小学1年级</SelectItem>
                    <SelectItem value="小学2">小学2年级</SelectItem>
                    <SelectItem value="小学3">小学3年级</SelectItem>
                    <SelectItem value="小学4">小学4年级</SelectItem>
                    <SelectItem value="小学5">小学5年级</SelectItem>
                    <SelectItem value="小学6">小学6年级</SelectItem>
                    <SelectItem value="初中1">初中1年级</SelectItem>
                    <SelectItem value="初中2">初中2年级</SelectItem>
                    <SelectItem value="初中3">初中3年级</SelectItem>
                    <SelectItem value="高中1">高中1年级</SelectItem>
                    <SelectItem value="高中2">高中2年级</SelectItem>
                    <SelectItem value="高中3">高中3年级</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => handleSwitchChange('is_public', checked)}
                />
                <Label htmlFor="is_public">公开</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => handleSwitchChange('is_featured', checked)}
                />
                <Label htmlFor="is_featured">推荐</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createPlaylistMutation.isPending}>
                {createPlaylistMutation.isPending ? '创建中...' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Playlist Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑播放列表</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">名称</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">描述</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-subject_id">学科</Label>
                <Select
                  value={formData.subject_id}
                  onValueChange={(value) => handleSelectChange('subject_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择学科" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">无</SelectItem>
                    {subjects?.map((subject: any) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name_chinese}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-grade_level">年级</Label>
                <Select
                  value={formData.grade_level}
                  onValueChange={(value) => handleSelectChange('grade_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择年级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">无</SelectItem>
                    <SelectItem value="小学1">小学1年级</SelectItem>
                    <SelectItem value="小学2">小学2年级</SelectItem>
                    <SelectItem value="小学3">小学3年级</SelectItem>
                    <SelectItem value="小学4">小学4年级</SelectItem>
                    <SelectItem value="小学5">小学5年级</SelectItem>
                    <SelectItem value="小学6">小学6年级</SelectItem>
                    <SelectItem value="初中1">初中1年级</SelectItem>
                    <SelectItem value="初中2">初中2年级</SelectItem>
                    <SelectItem value="初中3">初中3年级</SelectItem>
                    <SelectItem value="高中1">高中1年级</SelectItem>
                    <SelectItem value="高中2">高中2年级</SelectItem>
                    <SelectItem value="高中3">高中3年级</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => handleSwitchChange('is_public', checked)}
                />
                <Label htmlFor="edit-is_public">公开</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => handleSwitchChange('is_featured', checked)}
                />
                <Label htmlFor="edit-is_featured">推荐</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updatePlaylistMutation.isPending}>
                {updatePlaylistMutation.isPending ? '更新中...' : '更新'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Video Dialog */}
      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>添加视频到播放列表</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="video_id">选择视频</Label>
              {isLoadingVideos ? (
                <LoadingSpinner />
              ) : (
                <Select
                  value={selectedVideoId}
                  onValueChange={(value) => setSelectedVideoId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择视频" />
                  </SelectTrigger>
                  <SelectContent>
                    {videos?.videos?.map((video: any) => (
                      <SelectItem key={video.id} value={video.id.toString()}>
                        {video.title_chinese || video.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddVideo} disabled={!selectedVideoId || addVideoMutation.isPending}>
              {addVideoMutation.isPending ? '添加中...' : '添加视频'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlaylistManagement;