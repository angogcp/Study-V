import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { VideoService } from '@/services/video.service';
import { SubjectService } from '@/services/subject.service';
import { ChapterService, Chapter } from '@/services/chapter.service';
import { Video } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Download } from 'lucide-react';
import Papa from 'papaparse';
import { Upload } from 'lucide-react';
import { Search } from 'lucide-react';

const gradeLevels = ['初中1', '初中2', '初中3'] as const;

type FormData = {
  id?: number;
  title: string;
  titleChinese: string;
  description: string;
  youtubeUrl: string;
  subjectId: number;
  gradeLevel: '初中1' | '初中2' | '初中3';
  chapter: string;
  topic: string;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  sortOrder: number;
};

const VideoManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    titleChinese: '',
    description: '',
    youtubeUrl: '',
    subjectId: 0,
    gradeLevel: '初中1',
    chapter: '',
    topic: '',
    difficultyLevel: 'medium',
    sortOrder: 0,
  });
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: videos } = useQuery({
    queryKey: ['videos'],
    queryFn: () => VideoService.getAllVideos({ limit: 100 }),
    select: (data) => data.videos,
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: SubjectService.getSubjects,
  });

  // Move filteredVideos here after videos is defined
  const filteredVideos = videos?.filter(v => 
    v.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (formData.subjectId && formData.gradeLevel) {
      ChapterService.getChapters({
        subject_id: formData.subjectId,
        grade_level: formData.gradeLevel,
      }).then(setChapters);
    }
  }, [formData.subjectId, formData.gradeLevel]);

  useEffect(() => {
    if (editingVideo) {
      setFormData({
        id: editingVideo.id,
        title: editingVideo.title,
        titleChinese: editingVideo.title_chinese || '',
        description: editingVideo.description || '',
        youtubeUrl: editingVideo.youtube_url,
        subjectId: editingVideo.subject_id,
        gradeLevel: editingVideo.grade_level,
        chapter: editingVideo.chapter || '',
        topic: editingVideo.topic || '',
        difficultyLevel: editingVideo.difficulty_level,
        sortOrder: editingVideo.sort_order,
      });
      setIsDialogOpen(true);
    }
  }, [editingVideo]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => VideoService.createVideo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('视频添加成功');
    },
    onError: () => toast.error('添加视频失败'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: FormData) => VideoService.updateVideo(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('视频更新成功');
    },
    onError: () => toast.error('更新视频失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: VideoService.deleteVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('视频删除成功');
    },
    onError: () => toast.error('删除视频失败'),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      titleChinese: '',
      description: '',
      youtubeUrl: '',
      subjectId: 0,
      gradeLevel: '初中1',
      chapter: '',
      topic: '',
      difficultyLevel: 'medium',
      sortOrder: 0,
    });
    setEditingVideo(null);
    setChapters([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVideo) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const exportToCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + 
      'ID,Title,Description,Video URL,Thumbnail URL,Subject,Grade,Chapter,Difficulty,Sort Order\n' + 
      videos.map(v => `${v.id},${v.title},${v.description},${v.video_url},${v.thumbnail_url},${v.subject_name_chinese},${v.grade_level},${v.chapter_name},${v.difficulty},${v.sort_order}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'videos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVImport = async (event) => {
    console.log('handleCSVImport triggered');
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          try {
            const { videos: existingVideos } = await VideoService.getAllVideos({ limit: 1000 });
            let importedCount = 0;
            let skippedCount = 0;
            for (const row of results.data) {
              const subject = subjects.find(s => s.name_chinese === row.Subject);
              if (!subject) continue;
  
              const fetchedChapters = await ChapterService.getChapters({
                subject_id: subject.id,
                grade_level: row.Grade,
              });
  
              const chapter = fetchedChapters.find(c => c.name === row.Chapter);
              if (!chapter) continue;
  
              const potentialVideo = {
                title: row.Title,
                description: row.Description,
                youtubeUrl: row['Video URL'],
                subjectId: subject.id,
                gradeLevel: row.Grade,
                chapter: row.Chapter,
                difficultyLevel: row.Difficulty,
                sortOrder: parseInt(row['Sort Order']) || 0
              };
  
              // Check for duplicate
              const isDuplicate = existingVideos.some(v => 
                v.subject_id === potentialVideo.subjectId &&
                v.grade_level === potentialVideo.gradeLevel &&
                v.chapter === potentialVideo.chapter &&
                v.title === potentialVideo.title
              );
  
              if (isDuplicate) {
                console.log(`Skipping duplicate video: ${potentialVideo.title}`);
                skippedCount++;
                continue;
              }
  
              await VideoService.createVideo(potentialVideo);
              importedCount++;
            }
            queryClient.invalidateQueries({ queryKey: ['videos'] });
            toast.success(`Imported ${importedCount} videos, skipped ${skippedCount} duplicates`);
          } catch (error) {
            toast.error('Failed to import videos');
            console.error(error);
          }
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">视频管理</h1>
        <div className="space-x-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                添加视频
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingVideo ? '编辑视频' : '添加视频'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">标题</Label>
                  <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="titleChinese">中文标题</Label>
                  <Input id="titleChinese" value={formData.titleChinese} onChange={(e) => setFormData({ ...formData, titleChinese: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="description">描述</Label>
                  <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="youtubeUrl">YouTube URL</Label>
                  <Input id="youtubeUrl" value={formData.youtubeUrl} onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="subjectId">科目</Label>
                  <Select value={formData.subjectId.toString()} onValueChange={(v) => setFormData({ ...formData, subjectId: parseInt(v) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择科目" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>
                          {subject.name_chinese}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="gradeLevel">年级</Label>
                  <Select value={formData.gradeLevel} onValueChange={(v) => setFormData({ ...formData, gradeLevel: v as '初中1' | '初中2' | '初中3' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择年级" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeLevels.map((level) => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="chapter">章节</Label>
                  <Select value={formData.chapter} onValueChange={(v) => setFormData({ ...formData, chapter: v })} disabled={!chapters.length}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择章节" />
                    </SelectTrigger>
                    <SelectContent className="z-[50]">
                      {chapters.map((ch) => (
                        <SelectItem key={ch.id} value={ch.name}>{ch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="topic">主题</Label>
                  <Input id="topic" value={formData.topic} onChange={(e) => setFormData({ ...formData, topic: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="difficultyLevel">难度</Label>
                  <Select value={formData.difficultyLevel} onValueChange={(v) => setFormData({ ...formData, difficultyLevel: v as 'easy' | 'medium' | 'hard' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择难度" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">简单</SelectItem>
                      <SelectItem value="medium">中等</SelectItem>
                      <SelectItem value="hard">困难</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sortOrder">排序</Label>
                  <Input id="sortOrder" type="number" value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })} />
                </div>
                <Button type="submit" className="w-full">保存</Button>
              </form>
            </DialogContent>
          </Dialog>
        <Button variant="outline" onClick={exportToCSV}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
        <div className="inline-block">
          <input 
            id="video-csv-import" 
            type="file" 
            accept=".csv" 
            onChange={handleCSVImport} 
            style={{ display: 'none' }}
          />
          <Button 
            variant="outline" 
            onClick={() => {
              console.log('Direct button click');
              document.getElementById('video-csv-import')?.click();
            }}
          >
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
        </div>
      </div>
    </div>
    <Card>
      <CardHeader>
        <CardTitle>视频列表</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input 
            placeholder="Search by title or description" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="max-w-sm" 
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>标题</TableHead>
              <TableHead>科目</TableHead>
              <TableHead>年级</TableHead>
              <TableHead>章节</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVideos?.map((video) => (
              <TableRow key={video.id}>
                <TableCell>{video.title_chinese || video.title}</TableCell>
                <TableCell>{video.subject_name_chinese}</TableCell>
                <TableCell>{video.grade_level}</TableCell>
                <TableCell>{video.chapter}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setEditingVideo(video)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(video.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </div>
  );
};

export default VideoManagement;