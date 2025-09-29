import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { VideoService } from '@/services/video.service';
import { ProgressService } from '@/services/progress.service';
import { NotesService } from '@/services/notes.service';
import { ChatbotService } from '@/services/chatbot.service';
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
  Trash2, 
  MessageCircle,
  Camera,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { VideoProgress, UserNote } from '@/types';
import { motion } from 'framer-motion';
import Chatbot from '@/components/Chatbot';
import YouTube from 'react-youtube';
import { useSearchParams } from 'react-router-dom';






interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  image?: string;
}

const VideoPlayer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [player, setPlayer] = useState<any | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTimestamp, setNoteTimestamp] = useState(0);
  const [editingNote, setEditingNote] = useState<UserNote | null>(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'bot', content: string}[]>([
    {role: 'bot', content: '你好！我是你的学习助手。我可以帮助你理解这个视频的内容。有什么问题请随时问我！'}
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const progressUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressUpdateRef = useRef(0);
const videoRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<any>(null);

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

// Handle sending message to chatbot
  // Remove handleCaptureScreenshot function entirely
  
  // Update handleSendMessage to use new sendMessage signature
  const handleSendMessage = async (message: string) => {
    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsChatLoading(true);
    
    try {
      // Call the chatbot API with video context and chat history
      const response = await ChatbotService.sendMessage({
        message,
        videoContext: {
          grade: video?.grade_level || '',
          subject: video?.subject_name_chinese || '',
          topic: video?.topic || '',
          title: video?.title_chinese || video?.title || '',
          currentTime: formatTime(currentTime)
        },
        context: chatMessages
      });
      
      // Add bot response to chat
      setChatMessages(prev => [...prev, { role: 'bot', content: response.message }]);
    } catch (error) {
      console.error('Error sending message to chatbot:', error);
      setChatMessages(prev => [...prev, { 
        role: 'bot', 
        content: '抱歉，我遇到了一些问题。请稍后再试。' 
      }]);
      toast.error('聊天机器人服务暂时不可用');
    } finally {
      setIsChatLoading(false);
    }
  };

  const formatTime = useCallback((seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}, []);

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

// Define these functions outside useEffect to make them available throughout the component
const updateProgress = useCallback((watchTime: number) => {
  if (!user || !video || watchTime <= 0) return;
  
  const progressData = {
    videoId: video?.id,
    watchTimeSeconds: Math.floor(watchTime),
    totalDuration: duration,
    lastPosition: Math.floor(watchTime),
  };
  
  // Debounce progress updates to avoid too many API calls
  updateProgressMutation.mutate(progressData);
}, [user, video, duration, updateProgressMutation]);

const startProgressTracking = useCallback(() => {
  if (progressUpdateRef.current) {
    clearInterval(progressUpdateRef.current);
  }
  
  progressUpdateRef.current = setInterval(() => {
    if (youtubePlayerRef.current) {
      const current = youtubePlayerRef.current.getCurrentTime();
      setCurrentTime(current);
      
      // Update progress every 10 seconds
      if (current - lastProgressUpdateRef.current >= 10) {
        updateProgress(current);
        lastProgressUpdateRef.current = current;
      }
    }
  }, 1000);
}, [youtubePlayerRef, updateProgress, setCurrentTime]);

const stopProgressTracking = useCallback(() => {
  if (progressUpdateRef.current) {
    clearInterval(progressUpdateRef.current);
    progressUpdateRef.current = null;
  }
  
  // Final progress update when stopping
  if (youtubePlayerRef.current) {
    updateProgress(youtubePlayerRef.current.getDuration());
  }
}, [youtubePlayerRef, updateProgress]);

useEffect(() => {
  if (!video) return;

  // 清理函数
  return () => {
    if (progressUpdateRef.current) {
      clearInterval(progressUpdateRef.current);
    }
  };
}, [video]);

// YouTube播放器配置
const youtubeOpts = {
  height: '100%',
  width: '100%',
  playerVars: {
    autoplay: 0,
    controls: 1,
    rel: 0,
    modestbranding: 1,
    origin: window.location.origin
  },
};

// YouTube播放器事件处理
const onYoutubeReady = (event: any) => {
  youtubePlayerRef.current = event.target;
  setPlayer(event.target);
  
  const videoDuration = event.target.getDuration();
  setDuration(videoDuration);
  
  if (progress && progress.last_position > 0) {
    event.target.seekTo(progress.last_position);
    toast.success(`从 ${formatTime(progress.last_position)} 处继续观看`);
  }
};



// Add playlist navigation logic inside VideoPlayer component, preferably after existing useQuery hooks
const [searchParams] = useSearchParams();
const playlistId = searchParams.get('playlist');

const { data: playlistVideos } = useQuery({
  queryKey: ['playlistVideos', playlistId],
  queryFn: async () => {
    const response = await api.get(`/playlists/${playlistId}/videos`);
    return response.data.sort((a, b) => a.order - b.order);
  },
  enabled: !!playlistId,
});

const currentIndex = useMemo(() => {
  if (!playlistVideos || !video) return -1;
  return playlistVideos.findIndex(pv => pv.video_id === video.id);
}, [playlistVideos, video]);

const hasPrevious = currentIndex > 0;
const hasNext = currentIndex >= 0 && currentIndex < playlistVideos?.length - 1;

const playPrevious = () => {
  if (hasPrevious) {
    const prevVideo = playlistVideos[currentIndex - 1];
    navigate(`/videos/${prevVideo.video_id}?playlist=${playlistId}`);
  }
};

const playNext = () => {
  if (hasNext) {
    const nextVideo = playlistVideos[currentIndex + 1];
    navigate(`/videos/${nextVideo.video_id}?playlist=${playlistId}`);
  }
};

// Update onYoutubeStateChange to include auto-play next when video ends
const onYoutubeStateChange = (event: any) => {
  const state = event.data;
  setIsPlaying(state === 1);

  if (state === 0) {
    stopProgressTracking();
    if (playlistId && hasNext) {
      playNext();
    }
  } else if (state === 1) {
    startProgressTracking();
  } else if (state === 2) {
    stopProgressTracking();
  }
};

const onYoutubeError = (event: any) => {
  console.error('YouTube播放器错误:', event);
  toast.error('视频加载失败，请刷新页面重试');
};

// 更新当前播放时间
useEffect(() => {
  if (!youtubePlayerRef.current || !isPlaying) return;
  
  const timeUpdateInterval = setInterval(() => {
    if (youtubePlayerRef.current) {
      const currentTime = youtubePlayerRef.current.getCurrentTime();
      setCurrentTime(currentTime);
    }
  }, 1000);
  
  return () => clearInterval(timeUpdateInterval);
}, [youtubePlayerRef.current, isPlaying]);
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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gray-50"
    >
      {/* 简化顶部导航栏 */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/videos')} className="text-gray-700 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {video.grade_level}
            </Badge>
            <Badge 
              style={{ backgroundColor: video.subject_color }}
              className="text-white text-xs"
            >
              {video.subject_name_chinese}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 优化视频播放器 - 增大占比 */}
          <div className="lg:col-span-3 space-y-3">
            <h1 className="text-xl font-semibold text-gray-900">
              {video.title_chinese || video.title}
            </h1>
            
            <div className="bg-black rounded-md overflow-hidden shadow-md">
              <div className="aspect-[16/9] relative" ref={videoRef}>
                {video && video.youtube_id && (
                  <YouTube
                    videoId={video.youtube_id}
                    opts={youtubeOpts}
                    onReady={onYoutubeReady}
                    onStateChange={onYoutubeStateChange}
                    onError={onYoutubeError}
                    className="w-full h-full"
                  />
                )}
              </div>
            </div>

            {/* 简化进度条 */}
            <div className="space-y-1">
              <Progress value={progressPercentage} className="h-1" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Video Controls */}
            <div className="flex gap-2 pt-2 justify-center">
              {playlistId && (
                <>
                  <Button onClick={playPrevious} disabled={!hasPrevious}>
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <Button onClick={playNext} disabled={!hasNext}>
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* 侧边面板 - 简化 */}
          <div className="lg:col-span-1 space-y-4">
            {/* 聊天机器人 - 改进集成 */}
            <Card className="shadow-md">
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  聊天助手
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <Chatbot 
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                  isLoading={isChatLoading}
                  className="h-[300px]"
                />
              </CardContent>
            </Card>

            {/* 笔记列表 - 简化 */}
            <Card className="shadow-md">
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  笔记
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {notes?.map((note) => (
                  <div key={note.id} className="border-b pb-2">
                    <p className="text-sm font-medium">{note.title}</p>
                    <p className="text-xs text-gray-500">{note.content.substring(0, 50)}...</p>
                  </div>
                ))}
                <Button onClick={handleAddNote} size="sm" className="w-full">
                  添加笔记
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default VideoPlayer;