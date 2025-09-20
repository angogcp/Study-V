import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ProgressService } from '@/services/progress.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type ProgressData = {
  overall: {
    total_videos: number;
    completed_videos: number;
    average_progress: number;
    total_watch_time: number;
  };
  bySubject: Array<{
    subject_name: string;
    avg_progress: number;
    videos_watched: number;
    completed_count: number;
  }>;
  recentActivity: Array<{
    video_id: number;
    title_chinese: string;
    progress_percentage: number;
    is_completed: boolean;
    last_watched_at: string;
  }>;
};

const LearningProgress: React.FC = () => {
  const { user } = useAuth();
  
  if (user.role === 'guest') {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Guest Mode</h1>
        <p>Progress tracking is not available in guest mode.</p>
      </div>
    );
  }
  const { data: progressData, isLoading } = useQuery<ProgressData>({
    queryKey: ['learning-progress'],
    queryFn: ProgressService.getLearningStats,
  });

  const formatWatchTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
  };

  if (isLoading) return <div>加载中...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>整体进度</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>完成视频</span>
            <Badge>{progressData?.overall.completed_videos} / {progressData?.overall.total_videos}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>平均进度</span>
            <Badge>{Math.round(progressData?.overall.average_progress || 0)}%</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>总学习时长</span>
            <Badge>{formatWatchTime(progressData?.overall.total_watch_time || 0)}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>学科进度</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {progressData?.bySubject.map((subject, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between">
                <span>{subject.subject_name}</span>
                <span>{Math.round(subject.avg_progress)}%</span>
              </div>
              <Progress value={subject.avg_progress} className="h-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>已观看: {subject.videos_watched}</span>
                <span>已完成: {subject.completed_count}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>最近活动</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {progressData?.recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center justify-between">
              <div>
                <p>{activity.title_chinese}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.last_watched_at), { addSuffix: true, locale: zhCN })}
                </p>
              </div>
              <div className="text-right">
                <Badge variant={activity.is_completed ? 'success' : 'default'}>
                  {activity.is_completed ? '已完成' : `${Math.round(activity.progress_percentage)}%`}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default LearningProgress;