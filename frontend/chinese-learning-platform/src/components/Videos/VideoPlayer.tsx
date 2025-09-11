import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import YouTube, { YouTubeProps } from 'react-youtube';
import { VideoService } from '@/services/video.service';
import { ProgressService } from '@/services/progress.service';
import { NotesService } from '@/services/notes.service';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  BookOpen, 
  FileText, 
  Clock,
  CheckCircle,
  Plus,
  Save,
  Edit,
  Trash2
} from 'lucide-react';
import { VideoProgress, UserNote } from '@/types';
import { motion } from 'framer-motion';

interface YouTubePlayer {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  pauseVideo(): void;
  playVideo(): void;
  seekTo(seconds: number): void;
}


const VideoPlayer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTimestamp, setNoteTimestamp] = useState(0);
  const [editingNote, setEditingNote] = useState<UserNote | null>(null);
  
  const progressUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressUpdateRef = useRef(0);

  // Fetch video details
  const { data: video, isLoading: videoLoading } = useQuery({
    queryKey: ['video', id],
    queryFn: () => VideoService.getVideoById(parseInt(id!)),
    enabled: !!id,
  });

  // Fetch video progress
  const { data: progress } = useQuery({
    queryKey: ['video-progress', id],
    queryFn: () => ProgressService.getVideoProgress(parseInt(id!)),
    enabled: !!id && !!user,
  });

  // Fetch video notes
  const { data: notes } = useQuery({
    queryKey: ['video-notes', id],
    queryFn: () => NotesService.getVideoNotes(parseInt(id!)),
    enabled: !!id && !!user,
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: ProgressService.updateProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-progress', id] });
      queryClient.invalidateQueries({ queryKey: ['learning-stats'] });
    },
    onError: (error) => {
      console.error('Failed to update progress:', error);
      toast.error('进度保存失败');
    },
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: NotesService.createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-notes', id] });
      queryClient.invalidateQueries({ queryKey: ['learning-stats'] });
      toast.success('笔记保存成功');
      setShowNoteForm(false);
      setNoteTitle('');
      setNoteContent('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '保存笔记失败');
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UserNote> }) => NotesService.updateNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-notes', id] });
      queryClient.invalidateQueries({ queryKey: ['learning-stats'] });
      toast.success('笔记更新成功');
      setShowNoteForm(false);
      setEditingNote(null);
      setNoteTitle('');
      setNoteContent('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '更新笔记失败');
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: NotesService.deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-notes', id] });
      queryClient.invalidateQueries({ queryKey: ['learning-stats'] });
      toast.success('笔记删除成功');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '删除笔记失败');
    },
  });

  // YouTube player event handlers
  const onReady: YouTubeProps['onReady'] = (event) => {
    const playerInstance = event.target as YouTubePlayer;
    setPlayer(playerInstance);
    const videoDuration = playerInstance.getDuration();
    setDuration(videoDuration);
    
    // Resume from last position if available
    if (progress && progress.last_position > 0) {
      playerInstance.seekTo(progress.last_position);
      toast.success(`从 ${formatTime(progress.last_position)} 处继续观看`);
    }
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    const playerState = event.data;
    const isCurrentlyPlaying = playerState === 1; // 1 = playing
    setIsPlaying(isCurrentlyPlaying);
    
    // Start progress tracking when playing
    if (isCurrentlyPlaying) {
      startProgressTracking();
    } else {
      stopProgressTracking();
    }
    
    // Handle video ended state
    if (playerState === 0) { // 0 = ended
      toast.success('视频学习完成！');
      if (player) {
        updateProgress(player.getDuration()); // Mark as fully watched
      }
    }
  };

  const handleAddNote = () => {
    setNoteTimestamp(Math.floor(currentTime));
    setShowNoteForm(true);
  };

  const handleSaveNote = () => {
    if (!video || !noteContent.trim()) {
      toast.error('请输入笔记内容');
      return;
    }

    const noteData = {
      title: noteTitle.trim() || `笔记 - ${formatTime(noteTimestamp)}`,
      content: noteContent.trim(),
      timestampSeconds: noteTimestamp,
    };

    if (editingNote) {
      updateNoteMutation.mutate({ id: editingNote.id, data: noteData });
    } else {
      createNoteMutation.mutate({
        videoId: video.id,
        ...noteData,
      });
    }
  };

  const handleNoteClick = (note: UserNote) => {
    if (player) {
      player.seekTo(note.timestamp_seconds);
      setCurrentTime(note.timestamp_seconds);
      toast.success(`跳转到 ${formatTime(note.timestamp_seconds)}`);
    } else {
      toast.error('视频播放器未准备就绪');
    }
  };
  const handleEditNote = (note: UserNote) => {
  setEditingNote(note);
  setNoteTitle(note.title);
  setNoteContent(note.content);
  setNoteTimestamp(note.timestamp_seconds);
  setShowNoteForm(true);
};
const handleDeleteNote = (id: number) => {
  if (window.confirm('确定要删除这条笔记吗？')) {
    deleteNoteMutation.mutate(id);
  }
};

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isCompleted = progressPercentage >= 90;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressUpdateRef.current) {
        clearInterval(progressUpdateRef.current);
      }
    };
  }, []);

  if (videoLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="aspect-video bg-gray-300 rounded-lg mb-4" />
          <div className="h-8 bg-gray-300 rounded mb-2" />
          <div className="h-4 bg-gray-300 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">视频不存在</p>
        <Button onClick={() => navigate('/videos')} className="mt-4">
          返回视频列表
        </Button>
      </div>
    );
  }

  const startProgressTracking = () => {
    if (progressUpdateRef.current) {
      clearInterval(progressUpdateRef.current);
    }
    
    progressUpdateRef.current = setInterval(() => {
      if (player) {
        const current = player.getCurrentTime();
        setCurrentTime(current);
        
        // Update progress every 10 seconds
        if (current - lastProgressUpdateRef.current >= 10) {
          updateProgress(current);
          lastProgressUpdateRef.current = current;
        }
      }
    }, 1000);
  };

  const stopProgressTracking = () => {
    if (progressUpdateRef.current) {
      clearInterval(progressUpdateRef.current);
      progressUpdateRef.current = null;
    }
    
    // Final progress update when stopping
    if (player) {
      updateProgress(player.getCurrentTime());
    }
  };

  const updateProgress = (watchTime: number) => {
    if (!user || !video || watchTime <= 0) return;
    
    const progressData = {
      videoId: video.id,
      watchTimeSeconds: Math.floor(watchTime),
      totalDuration: duration,
      lastPosition: Math.floor(watchTime),
    };
    
    // Debounce progress updates to avoid too many API calls
    updateProgressMutation.mutate(progressData);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/videos')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回视频列表
        </Button>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline">{video.grade_level}</Badge>
          <Badge 
            style={{ backgroundColor: video.subject_color }}
            className="text-white"
          >
            {video.subject_name_chinese}
          </Badge>
          {isCompleted && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="mr-1 h-3 w-3" />
              已完成
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player and Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Player */}
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <YouTube
                  videoId={video.youtube_id}
                  onReady={onReady}
                  onStateChange={onStateChange}
                  opts={{
                    height: '100%',
                    width: '100%',
                    playerVars: {
                      autoplay: 0,
                      controls: 1,
                      rel: 0,
                      showinfo: 0,
                      modestbranding: 1,
                      iv_load_policy: 3,
                      cc_load_policy: 0,
                      fs: 1,
                      enablejsapi: 1
                    }
                  }}
                  className="w-full h-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Video Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {video.title_chinese || video.title}
              </CardTitle>
              <CardDescription>
                {video.chapter && (
                  <span className="font-medium">{video.chapter}</span>
                )}
                {video.topic && video.chapter && ' - '}
                {video.topic && <span>{video.topic}</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {video.description && (
                <p className="text-gray-700">{video.description}</p>
              )}
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>学习进度</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div 
                  className="relative cursor-pointer group"
                  onClick={(e) => {
                    if (player && duration > 0) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const percentage = clickX / rect.width;
                      const seekTime = percentage * duration;
                      player.seekTo(seekTime);
                      setCurrentTime(seekTime);
                      toast.success(`跳转到 ${formatTime(seekTime)}`);
                    }
                  }}
                >
                  <Progress 
                    value={progressPercentage} 
                    className="h-3 transition-all group-hover:h-4" 
                  />
                  <div className="absolute inset-0 rounded-full bg-transparent hover:bg-black/5 transition-colors" />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

                {/* Video Actions */}
                <div className="flex space-x-2 flex-wrap">
                  <Button onClick={handleAddNote} size="sm" className="flex-shrink-0">
                    <Plus className="mr-2 h-4 w-4" />
                    添加笔记
                  </Button>
                  
                  {player && (
                    <>
                      <Button 
                        onClick={() => isPlaying ? player.pauseVideo() : player.playVideo()} 
                        size="sm" 
                        variant="outline"
                      >
                        {isPlaying ? (
                          <><Pause className="mr-2 h-4 w-4" />暂停</>
                        ) : (
                          <><Play className="mr-2 h-4 w-4" />播放</>
                        )}
                      </Button>
                      
                      <Button 
                        onClick={() => {
                          const newTime = Math.max(0, currentTime - 10);
                          player.seekTo(newTime);
                          setCurrentTime(newTime);
                        }} 
                        size="sm" 
                        variant="outline"
                      >
                        后退10s
                      </Button>
                      
                      <Button 
                        onClick={() => {
                          const newTime = Math.min(duration, currentTime + 10);
                          player.seekTo(newTime);
                          setCurrentTime(newTime);
                        }} 
                        size="sm" 
                        variant="outline"
                      >
                        前进10s
                      </Button>
                    </>
                  )}
                  
                  <Button variant="outline" size="sm">
                    <BookOpen className="mr-2 h-4 w-4" />
                    相关资料
                  </Button>
                </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes Panel */}
        <div className="space-y-4">
          {/* Add Note Form */}
          {showNoteForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{editingNote ? '编辑笔记' : '添加笔记'}</CardTitle>
                <CardDescription>
                  在 {formatTime(noteTimestamp)} 处{editingNote ? '编辑' : '添加'}笔记
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="笔记标题（可选）"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                />
                <Textarea
                  placeholder="请输入笔记内容..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={4}
                />
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleSaveNote} 
                    disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
                    className="flex-1"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {createNoteMutation.isPending || updateNoteMutation.isPending ? '保存中...' : '保存'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowNoteForm(false)}
                  >
                    取消
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                视频笔记
              </CardTitle>
              <CardDescription>
                {notes?.length || 0} 条笔记
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notes && notes.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {notes.map((note) => (
                    <div 
                      key={note.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleNoteClick(note)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm line-clamp-1">
                          {note.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="mr-1 h-3 w-3" />
                            {formatTime(note.timestamp_seconds)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditNote(note);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNote(note.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  还没有笔记，快来添加第一条吧！
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default VideoPlayer;