import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { VideoService } from '@/services/video.service';
import { SubjectService } from '@/services/subject.service';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { Search, Filter, Clock, Eye, Star } from 'lucide-react';
import { Video } from '@/types';
import { ChapterService, Chapter } from '@/services/chapter.service';

const VideoList: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState(user?.gradeLevel || 'all');
  const [selectedChapter, setSelectedChapter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20; // 添加分页限制变量

  // 添加调试日志
  useEffect(() => {
    console.log('Selected Subject:', selectedSubject);
    console.log('Selected Grade:', selectedGrade);
    console.log('Selected Chapter:', selectedChapter);
  }, [selectedSubject, selectedGrade, selectedChapter]);

  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: SubjectService.getAllSubjects,
  });

  const { data: chapters, isLoading: isLoadingChapters } = useQuery({
    queryKey: ['chapters', selectedSubject, selectedGrade],
    queryFn: () => ChapterService.getChapters({
      subject_id: selectedSubject !== 'all' ? parseInt(selectedSubject) : undefined,
      grade_level: selectedGrade !== 'all' ? selectedGrade : undefined,
    }),
    enabled: true, // 始终启用章节查询
    staleTime: 0, // 禁用缓存
    refetchOnMount: true, // 组件挂载时重新获取数据
    refetchOnWindowFocus: true, // 窗口获得焦点时重新获取数据
  });

  // 添加调试日志
  useEffect(() => {
    console.log('Subjects:', subjects);
    console.log('Chapters:', chapters);
  }, [subjects, chapters]);
  const { data: videosData, isLoading } = useQuery({
    queryKey: ['videos', searchTerm, selectedSubject, selectedGrade, selectedChapter, currentPage],
    queryFn: () => {
      console.log('Fetching videos with params:', {
        search: searchTerm || undefined,
        subject_id: selectedSubject && selectedSubject !== 'all' ? parseInt(selectedSubject) : undefined,
        grade_level: selectedGrade && selectedGrade !== 'all' ? selectedGrade as '初中1' | '初中2' | '初中3' : undefined,
        chapter: selectedChapter && selectedChapter !== 'all' ? selectedChapter : undefined,
        page: currentPage,
        limit,
      });
      return VideoService.getAllVideos({
        search: searchTerm || undefined,
        subject_id: selectedSubject && selectedSubject !== 'all' ? parseInt(selectedSubject) : undefined,
        grade_level: selectedGrade && selectedGrade !== 'all' ? selectedGrade as '初中1' | '初中2' | '初中3' : undefined,
        chapter: selectedChapter && selectedChapter !== 'all' ? selectedChapter : undefined,
        page: currentPage,
        limit,
      });
    },
  });

  const videos = videosData?.videos || [];
  const pagination = videosData?.pagination;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedSubject('all');
    setSelectedGrade(user?.gradeLevel || 'all');
    setSelectedChapter('all');
    setCurrentPage(1);
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (level: string) => {
    switch (level) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      default: return '中等';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">视频学习</h1>
        <p className="text-gray-600 mt-2">
          浏览和学习各科视频课程
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            筛选和搜索
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜索视频标题或描述..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Subject Filter */}
              <Select 
                value={selectedSubject} 
                onValueChange={(value) => {
                  console.log('Subject selected:', value);
                  setSelectedSubject(value);
                  // 重置章节选择
                  setSelectedChapter('all');
                  setCurrentPage(1);
                }}
                disabled={isLoadingSubjects}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择学科" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有学科</SelectItem>
                  {subjects && subjects.length > 0 ? (
                    subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name_chinese}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-subjects" disabled>
                      无可用学科
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Grade Filter */}
              <Select value={selectedGrade} onValueChange={(value) => {
                console.log('Grade selected:', value);
                setSelectedGrade(value);
                // 重置章节选择
                setSelectedChapter('all');
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="年级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有年级</SelectItem>
                  <SelectItem value="初中1">初中1</SelectItem>
                  <SelectItem value="初中2">初中2</SelectItem>
                  <SelectItem value="初中3">初中3</SelectItem>
                </SelectContent>
              </Select>

              {/* Chapter Select */}
              <Select 
                value={selectedChapter} 
                onValueChange={(value) => {
                  console.log('Chapter selected:', value);
                  setSelectedChapter(value);
                  setCurrentPage(1);
                }} 
                disabled={isLoadingChapters || !chapters || chapters.length === 0}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="章节" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有章节</SelectItem>
                  {chapters && chapters.length > 0 ? (
                    chapters.map((chapter: Chapter) => (
                      <SelectItem key={chapter.id} value={chapter.name}>
                        {chapter.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-chapters" disabled>
                      无可用章节
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button type="submit" className="flex-1">
                  搜索
                </Button>
                <Button type="button" variant="outline" onClick={resetFilters}>
                  重置
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results Info */}
      {pagination && (
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            显示 {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 
            共 {pagination.total} 个结果
          </span>
          <span>
            第 {pagination.page} 页，共 {pagination.pages} 页
          </span>
        </div>
      )}

      {/* Video Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-video bg-gray-300 rounded-t-lg" />
              <CardContent className="p-4">
                <div className="h-4 bg-gray-300 rounded mb-2" />
                <div className="h-3 bg-gray-300 rounded w-3/4 mb-2" />
                <div className="flex space-x-2">
                  <div className="h-5 bg-gray-300 rounded w-16" />
                  <div className="h-5 bg-gray-300 rounded w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : videos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video: Video) => (
            <Card key={video.id} className="group hover:shadow-lg transition-shadow duration-200">
              <Link to={`/videos/${video.id}`}>
                <div className="relative">
                  <img
                    src={video.thumbnail_url || '/placeholder-video.jpg'}
                    alt={video.title_chinese || video.title}
                    className="w-full aspect-video object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-200"
                  />
                  {video.duration > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                      {formatDuration(video.duration)}
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge 
                      className={getDifficultyColor(video.difficulty_level)}
                    >
                      {getDifficultyText(video.difficulty_level)}
                    </Badge>
                  </div>
                </div>
              </Link>
              
              <CardContent className="p-4">
                <Link to={`/videos/${video.id}`}>
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {video.title_chinese || video.title}
                  </h3>
                </Link>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span 
                      className="px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: video.subject_color }}
                    >
                      {video.subject_name_chinese}
                    </span>
                    <Badge variant="outline">
                      {video.grade_level}
                    </Badge>
                  </div>
                  
                  {video.chapter && (
                    <p className="text-sm text-gray-600 line-clamp-1">
                      {video.chapter}
                      {video.topic && ` - ${video.topic}`}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-3 w-3" />
                      <span>{video.view_count}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDuration(video.duration)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 text-lg">暂无符合条件的视频</p>
            <p className="text-gray-400 text-sm mt-2">请调整搜索条件或筛选器</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            disabled={pagination.page <= 1}
            onClick={() => setCurrentPage(pagination.page - 1)}
          >
            上一页
          </Button>
          
          <div className="flex items-center space-x-1">
            {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
              const pageNum = Math.max(1, pagination.page - 2) + i;
              if (pageNum > pagination.pages) return null;
              
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === pagination.page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            disabled={pagination.page >= pagination.pages}
            onClick={() => setCurrentPage(pagination.page + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
};

export default VideoList;