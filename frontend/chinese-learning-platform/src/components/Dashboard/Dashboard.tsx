import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { ProgressService } from '@/services/progress.service';
import { SubjectService } from '@/services/subject.service';
import { VideoService } from '@/services/video.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Clock, 
  Award, 
  FileText, 
  Video,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
// Add to imports
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Fetch learning statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['learning-stats'],
    queryFn: ProgressService.getLearningStats,
  });

  // Fetch subjects
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: SubjectService.getAllSubjects,
  });

  // Correct placement of chartData after queries
  // Fetch recent videos
  const { data: recentVideos } = useQuery({
    queryKey: ['recent-videos'],
    queryFn: () => VideoService.getAllVideos({ limit: 6 }),
  });

  const chartData = subjects?.map((subject) => {
    const subjectStats = stats?.bySubject?.find(
      (s) => s.subject_name === subject.name_chinese
    );
    return {
      name: subject.name_chinese,
      progress: subjectStats?.avg_progress || 0,
      color: subject.color_code,
    };
  }) || [];

  const formatWatchTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          欢迎回来，{user?.fullName}!
        </h1>
        <p className="text-blue-100">
          继续您的学习之旅，掌握更多知识
        </p>
        <div className="flex items-center mt-4 space-x-4">
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            {user?.gradeLevel}
          </Badge>
          <span className="text-sm text-blue-100">
            今日是美好的学习日
          </span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">学习时长</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user ? formatWatchTime(user.totalWatchTime) : '0分钟'}
            </div>
            <p className="text-xs text-muted-foreground">
              累计学习时长
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">完成视频</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.videosCompleted || 0}</div>
            <p className="text-xs text-muted-foreground">
              视频学习完成
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">笔记数量</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.notesCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              个人学习笔记
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均进度</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.overall?.average_progress ? `${Math.round(stats.overall.average_progress)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              整体学习进度
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="mr-2 h-5 w-5" />
              学科学习进度
            </CardTitle>
            <CardDescription>
              查看各学科的学习情况
            </CardDescription>
          </CardHeader>

          <CardContent>
            {subjects && subjects.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="progress" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                暂无学科数据
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              最近活动
            </CardTitle>
            <CardDescription>
              您最近观看的视频
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats?.recentActivity?.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                <img
                  src={activity.thumbnail_url}
                  alt={activity.title_chinese || activity.title}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = () => { target.src = '/placeholder-video.jpg'; };
                    target.src = activity.thumbnail_url.replace('maxresdefault.jpg', 'hqdefault.jpg');
                  }}
                  className="w-12 h-8 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {activity.title_chinese || activity.title}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>{activity.subject_name}</span>
                    <span>•</span>
                    <span>{Math.round(activity.progress_percentage)}%</span>
                    {activity.is_completed && (
                      <Badge variant="secondary" className="text-xs py-0">
                        已完成
                      </Badge>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.last_watched_at), { 
                    addSuffix: true, 
                    locale: zhCN 
                  })}
                </span>
              </div>
            ))}
            
            {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                暂无最近活动
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
          <CardDescription>
            常用功能快捷入口
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/videos" className="flex flex-col items-center space-y-2">
                <Video className="h-6 w-6" />
                <span>浏览视频</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/progress" className="flex flex-col items-center space-y-2">
                <TrendingUp className="h-6 w-6" />
                <span>查看进度</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/notes" className="flex flex-col items-center space-y-2">
                <FileText className="h-6 w-6" />
                <span>我的笔记</span>
              </Link>
            </Button>
            
            {user?.role === 'admin' && (
              <Button asChild variant="outline" className="h-auto p-4">
                <Link to="/admin/videos" className="flex flex-col items-center space-y-2">
                  <Award className="h-6 w-6" />
                  <span>管理后台</span>
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;