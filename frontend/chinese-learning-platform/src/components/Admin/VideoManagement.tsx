import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { VideoService } from '@/services/video.service';
import { SubjectService } from '@/services/subject.service';
import { ChapterService } from '@/services/chapter.service';
import { Video } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { Pencil, Trash2, Plus, Download, Upload } from 'lucide-react';
import Papa from 'papaparse';

const gradeLevels = ['初中1', '初中2', '初中3'] as const;
const difficultyLevels = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' }
];

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

const formSchema = z.object({
  title: z.string().min(1, { message: '标题是必需的' }),
  titleChinese: z.string().optional(),
  description: z.string().optional(),
  youtubeUrl: z.string().url({ message: '无效的URL' }).min(1, { message: 'YouTube URL是必需的' }),
  subjectId: z.number().min(1, { message: '科目是必需的' }),
  gradeLevel: z.enum(['初中1', '初中2', '初中3']),
  chapter: z.string().optional(),
  topic: z.string().optional(),
  difficultyLevel: z.enum(['easy', 'medium', 'hard']),
  sortOrder: z.number().optional(),
});

const VideoManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  const { register, handleSubmit, formState: { errors }, setValue, reset, watch } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
    }
  });

  const subjectId = watch('subjectId');
  const gradeLevel = watch('gradeLevel');

  const { data: videosData } = useQuery({
    queryKey: ['videos', searchTerm, selectedSubject, selectedGrade, currentPage],
    queryFn: () => VideoService.getAllVideos({ search: searchTerm, subject_id: selectedSubject, grade_level: selectedGrade, page: currentPage, limit }),
  });
  const videos = videosData?.videos || [];
  const pagination = videosData?.pagination;

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: SubjectService.getSubjects,
  });

  useEffect(() => {
    if (subjectId && gradeLevel) {
      ChapterService.getChapters({
        subject_id: subjectId,
        grade_level: gradeLevel,
      }).then(setChapters);
    }
  }, [subjectId, gradeLevel]);

  useEffect(() => {
    if (editingVideo) {
      setValue('title', editingVideo.title);
      setValue('titleChinese', editingVideo.title_chinese || '');
      setValue('description', editingVideo.description || '');
      setValue('youtubeUrl', editingVideo.youtube_url);
      setValue('subjectId', editingVideo.subject_id);
      setValue('gradeLevel', editingVideo.grade_level);
      setValue('chapter', editingVideo.chapter || '');
      setValue('topic', editingVideo.topic || '');
      setValue('difficultyLevel', editingVideo.difficulty_level);
      setValue('sortOrder', editingVideo.sort_order);
      setIsDialogOpen(true);
    }
  }, [editingVideo, setValue]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSubject, selectedGrade]);

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
    reset({
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
  };

  const onSubmit = (data: FormData) => {
    if (editingVideo) {
      updateMutation.mutate({ id: editingVideo.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const exportToCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + 
      'ID,Title,Description,Video URL,Thumbnail URL,Subject,Grade,Chapter,Difficulty,Sort Order\n' + 
      videos.map(v => `${v.id},${v.title},${v.description || ''},${v.youtube_url},${v.thumbnail_url || ''},${v.subject_name_chinese},${v.grade_level},${v.chapter || ''},${v.difficulty_level},${v.sort_order}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'videos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          try {
            const { videos: existingVideos } = await VideoService.getAllVideos({ limit: 1000 });
            let importedCount = 0;
            let skippedCount = 0;
            
            for (const row of results.data as any[]) {
              const subject = subjects?.find(s => s.name_chinese === row.Subject);
              if (!subject) continue;
  
              const fetchedChapters = await ChapterService.getChapters({
                subject_id: subject.id,
                grade_level: row.Grade,
              });
  
              const chapter = fetchedChapters.find((c: any) => c.name === row.Chapter);
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
              const isDuplicate = existingVideos.some((v: Video) => 
                v.subject_id === potentialVideo.subjectId &&
                v.grade_level === potentialVideo.gradeLevel &&
                v.chapter === potentialVideo.chapter &&
                v.title === potentialVideo.title
              );
  
              if (isDuplicate) {
                skippedCount++;
                continue;
              }
  
              await VideoService.createVideo(potentialVideo);
              importedCount++;
            }
            
            queryClient.invalidateQueries({ queryKey: ['videos'] });
            toast.success(`导入 ${importedCount} 个视频，跳过 ${skippedCount} 个重复项`);
          } catch (error) {
            toast.error('导入视频失败');
            console.error(error);
          }
        }
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">视频管理</h1>
        <div className="space-x-2">
          <Button onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            添加视频
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            导出CSV
          </Button>
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
                document.getElementById('video-csv-import')?.click();
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              导入CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="flex space-x-4 mb-4">
        <Input 
          placeholder="搜索视频标题或描述" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="max-w-sm" 
        />
        <Select value={selectedSubject ? selectedSubject.toString() : ''} onValueChange={(v) => setSelectedSubject(v ? parseInt(v) : null)}>
          <SelectTrigger className="w-[180px]">
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
        <Select value={selectedGrade || ''} onValueChange={(v) => setSelectedGrade(v || null)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="选择年级" />
          </SelectTrigger>
          <SelectContent>
            {gradeLevels.map((level) => (
              <SelectItem key={level} value={level}>{level}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          {videos.map((video) => (
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

      {pagination && (
        <div className="flex justify-center space-x-2 mt-4">
          <Button
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            上一页
          </Button>
          <span className="py-2 px-4">
            第 {currentPage} 页 / 共 {pagination.pages} 页
          </span>
          <Button
            variant="outline"
            disabled={currentPage >= pagination.pages}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            下一页
          </Button>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVideo ? '编辑视频' : '添加视频'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="title">标题</Label>
              <Input id="title" {...register('title')} />
              {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
            </div>
            <div>
              <Label htmlFor="titleChinese">中文标题</Label>
              <Input id="titleChinese" {...register('titleChinese')} />
              {errors.titleChinese && <p className="text-red-500 text-sm">{errors.titleChinese.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">描述</Label>
              <Input id="description" {...register('description')} />
              {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
            </div>
            <div>
              <Label htmlFor="youtubeUrl">YouTube URL</Label>
              <Input id="youtubeUrl" {...register('youtubeUrl')} />
              {errors.youtubeUrl && <p className="text-red-500 text-sm">{errors.youtubeUrl.message}</p>}
            </div>
            <div>
              <Label htmlFor="subjectId">科目</Label>
              <Select 
                value={subjectId ? subjectId.toString() : ''} 
                onValueChange={(v) => setValue('subjectId', parseInt(v))}
              >
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
              {errors.subjectId && <p className="text-red-500 text-sm">{errors.subjectId.message}</p>}
            </div>
            <div>
              <Label htmlFor="gradeLevel">年级</Label>
              <Select 
                value={gradeLevel} 
                onValueChange={(v) => setValue('gradeLevel', v as '初中1' | '初中2' | '初中3')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择年级" />
                </SelectTrigger>
                <SelectContent>
                  {gradeLevels.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.gradeLevel && <p className="text-red-500 text-sm">{errors.gradeLevel.message}</p>}
            </div>
            <div>
              <Label htmlFor="chapter">章节</Label>
              <Select 
                value={watch('chapter')} 
                onValueChange={(v) => setValue('chapter', v)}
                disabled={!chapters.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择章节" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.name}>
                      {chapter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.chapter && <p className="text-red-500 text-sm">{errors.chapter.message}</p>}
            </div>
            <div>
              <Label htmlFor="topic">主题</Label>
              <Input id="topic" {...register('topic')} />
              {errors.topic && <p className="text-red-500 text-sm">{errors.topic.message}</p>}
            </div>
            <div>
              <Label htmlFor="difficultyLevel">难度</Label>
              <Select 
                value={watch('difficultyLevel')} 
                onValueChange={(v) => setValue('difficultyLevel', v as 'easy' | 'medium' | 'hard')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择难度" />
                </SelectTrigger>
                <SelectContent>
                  {difficultyLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.difficultyLevel && <p className="text-red-500 text-sm">{errors.difficultyLevel.message}</p>}
            </div>
            <div>
              <Label htmlFor="sortOrder">排序</Label>
              <Input 
                id="sortOrder" 
                type="number" 
                {...register('sortOrder', { valueAsNumber: true })} 
              />
              {errors.sortOrder && <p className="text-red-500 text-sm">{errors.sortOrder.message}</p>}
            </div>
            <Button type="submit" className="w-full">保存</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoManagement;