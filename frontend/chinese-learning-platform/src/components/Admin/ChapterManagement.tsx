import React, { useState, useEffect } from 'react';
import { ChapterService } from '@/services/chapter.service';
import { SubjectService } from '@/services/subject.service';
import { Chapter, Subject } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import { Download, Upload } from 'lucide-react';
import Papa from 'papaparse';
import { Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const chapterSchema = z.object({
  subject_id: z.number().min(1, '请选择科目'),
  grade_level: z.string().min(1, '请选择年级'),
  name: z.string().min(1, '请输入章节名称'),
  sort_order: z.number().min(0, '排序必须大于等于0'),
});

function ChapterManagement() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingChapter, setEditingChapter] = useState<Partial<Chapter> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const gradeLevels = ['初中1', '初中2', '初中3'];
  const { register, handleSubmit, setValue, reset, formState: { errors }, watch } = useForm<z.infer<typeof chapterSchema>>({
    resolver: zodResolver(chapterSchema),
  });

  useEffect(() => {
    if (editingChapter) {
      reset({
        subject_id: editingChapter.subject_id ?? 0,
        grade_level: editingChapter.grade_level ?? '',
        name: editingChapter.name ?? '',
        sort_order: editingChapter.sort_order ?? 0,
      });
    } else {
      reset();
    }
  }, [editingChapter, reset]);

  // Replace the existing handleSubmit with this onSubmit
  const onSubmit = async (data) => {
    try {
      if (editingChapter?.id) {
        await ChapterService.updateChapter(editingChapter.id, data);
      } else {
        await ChapterService.createChapter(data);
      }
      setEditingChapter(null);
      fetchData();
      toast.success('Chapter saved successfully');
    } catch (error) {
      toast.error('Failed to save chapter');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSubject, selectedGrade]);
  const fetchData = async () => {
    try {
      setLoading(true);
      const [chapterData, subjectData] = await Promise.all([
        ChapterService.getChapters(),
        SubjectService.getAllSubjects()
      ]);
      setChapters(chapterData);
      setSubjects(subjectData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // The form in the dialog uses handleSubmit(onSubmit)

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this chapter?')) return;
    try {
      await ChapterService.deleteChapter(id);
      fetchData();
      toast.success('Chapter deleted successfully');
    } catch (error) {
      toast.error('Failed to delete chapter');
    }
  };

  const handleCSVImport = async (event) => {
    console.log('handleCSVImport triggered');
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          try {
            const freshSubjects = await SubjectService.getAllSubjects();
            const existingChapters = await ChapterService.getChapters();
            let importedCount = 0;
            let skippedCount = 0;
            for (const row of results.data) {
              const subject = freshSubjects.find(s => s.name_chinese === row.Subject);
              if (!subject) {
                console.warn(`Subject not found: ${row.Subject}`);
                continue;
              }
              const potentialChapter = {
                subject_id: subject.id,
                grade_level: row.Grade || '',
                name: row.Name || '',
                sort_order: parseInt(row['Sort Order']) || 0
              };
              // Check for duplicate
              const isDuplicate = existingChapters.some(ch => 
                ch.subject_id === potentialChapter.subject_id &&
                ch.grade_level === potentialChapter.grade_level &&
                ch.name === potentialChapter.name
              );
              if (isDuplicate) {
                console.log(`Skipping duplicate chapter: ${potentialChapter.name}`);
                skippedCount++;
                continue;
              }
              await ChapterService.createChapter(potentialChapter);
              importedCount++;
            }
            fetchData();
            toast.success(`Imported ${importedCount} chapters, skipped ${skippedCount} duplicates`);
          } catch (error) {
            console.error('Failed to import chapters:', error);
            toast.error('Failed to import chapters');
          }
        }
      });
    }
  };
  const exportToCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + 
      'ID,Subject,Grade,Name,Sort Order\n' + 
      chapters.map(ch => `${ch.id},${ch.subject_name_chinese},${ch.grade_level},${ch.name},${ch.sort_order}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'chapters.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const filteredChapters = chapters.filter(chapter => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (chapter.name.toLowerCase().includes(searchLower) || chapter.subject_name_chinese.toLowerCase().includes(searchLower)) &&
      (selectedSubject ? chapter.subject_id === selectedSubject : true) &&
      (selectedGrade ? chapter.grade_level === selectedGrade : true)
    );
  });
  const totalPages = Math.ceil(filteredChapters.length / pageSize);
  const paginatedChapters = filteredChapters.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Chapter Management</h1>
        <div className="space-x-2">
          <Dialog open={!!editingChapter} onOpenChange={(open) => !open && setEditingChapter(null)}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingChapter({})}>Add Chapter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingChapter?.id ? 'Edit Chapter' : 'Add Chapter'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="subject_id">科目</Label>
                  <Select value={watch('subject_id')?.toString()} onValueChange={(value) => setValue('subject_id', parseInt(value))} >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>{subject.name_chinese}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.subject_id && <p className="text-red-500">{errors.subject_id.message}</p>}
                </div>
                <div>
                  <Label htmlFor="grade_level">年级</Label>
                  <Select value={watch('grade_level')} onValueChange={(value) => setValue('grade_level', value)} >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="初中1">初中1</SelectItem>
                      <SelectItem value="初中2">初中2</SelectItem>
                      <SelectItem value="初中3">初中3</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.grade_level && <p className="text-red-500">{errors.grade_level.message}</p>}
                </div>
                <div>
                  <Label htmlFor="name">名称</Label>
                  <Input {...register('name')} />
                  {errors.name && <p className="text-red-500">{errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="sort_order">排序</Label>
                  <Input type="number" {...register('sort_order', { valueAsNumber: true })} />
                  {errors.sort_order && <p className="text-red-500">{errors.sort_order.message}</p>}
                </div>
                <Button type="submit">保存</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={exportToCSV}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
          <div className="inline-block">
            <input 
              id="chapter-csv-import" 
              type="file" 
              accept=".csv" 
              onChange={handleCSVImport} 
              style={{ display: 'none' }}
            />
            <Button 
              variant="outline" 
              onClick={() => {
                console.log('Direct button click');
                document.getElementById('chapter-csv-import')?.click();
              }}
            >
              <Upload className="mr-2 h-4 w-4" /> Import CSV
            </Button>
          </div>
        </div>
      </div>
      <div className="flex space-x-4 mb-4">
        <Input 
          placeholder="Search by name or subject" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="max-w-sm" 
        />
        <Select value={selectedSubject ? selectedSubject.toString() : ''} onValueChange={(v) => setSelectedSubject(v ? parseInt(v) : null)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="选择科目" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id.toString()}>
                {subject.name_chinese}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedGrade || ''} onValueChange={setSelectedGrade}>
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
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedChapters.map((chapter) => (
                <TableRow key={chapter.id}>
                  <TableCell>{chapter.id}</TableCell>
                  <TableCell>{chapter.subject_name_chinese}</TableCell>
                  <TableCell>{chapter.grade_level}</TableCell>
                  <TableCell>{chapter.name}</TableCell>
                  <TableCell>{chapter.sort_order}</TableCell>
                  <TableCell>
                    <Button variant="outline" onClick={() => setEditingChapter(chapter)}>Edit</Button>
                    <Button variant="destructive" onClick={() => handleDelete(chapter.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-between mt-4">
            <Button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>上一页</Button>
            <span>第 {currentPage} 页 / 共 {totalPages} 页</span>
            <Button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>下一页</Button>
          </div>
        </>
      )}
    </div>
  );
}

export default ChapterManagement;