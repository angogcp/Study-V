import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Plus, Search, BookOpen, Clock, Tag, Download, FileText, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

import { NotesService } from '@/services/notes.service';
import { UserNote } from '@/types';

const MyNotes: React.FC = () => {
  const { user } = useAuth();
  
  if (user.role === 'guest') {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Guest Mode</h1>
        <p>Notes feature is not available in guest mode.</p>
      </div>
    );
  }

  const queryClient = useQueryClient();
  const [selectedNote, setSelectedNote] = useState<UserNote | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', videoId: '', tags: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showNoteDetail, setShowNoteDetail] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // Get notes with search and filter
  const { data: notesData, isLoading } = useQuery({
    queryKey: ['my-notes', searchTerm, selectedSubject, currentPage],
    queryFn: () => NotesService.getAllNotes({
      search: searchTerm || undefined,
      page: currentPage,
      limit: 10
    }),
  });
  
  const notes = notesData?.notes || [];
  const totalPages = notesData?.pagination?.pages || 1;

  // Extract unique subjects from notes
  const subjects = React.useMemo(() => {
    const subjectSet = new Set<string>();
    notes.forEach(note => {
      if (note.subject_name) {
        subjectSet.add(note.subject_name);
      }
    });
    return Array.from(subjectSet);
  }, [notes]);

  // Filtered notes based on subject selection
  const filteredNotes = React.useMemo(() => {
    if (selectedSubject === 'all') return notes;
    return notes.filter(note => note.subject_name === selectedSubject);
  }, [notes, selectedSubject]);

  const createMutation = useMutation({
    mutationFn: NotesService.createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      setNewNote({ title: '', content: '', videoId: '', tags: [] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...note }: { id: number } & Partial<UserNote>) => NotesService.updateNote(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      setIsEditing(false);
      setSelectedNote(null);
      setShowNoteDetail(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: NotesService.deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      setShowNoteDetail(false);
    },
  });

  const exportMutation = useMutation({
    mutationFn: NotesService.exportNotesPDF,
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notes_export_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setIsExporting(false);
    },
  });

  const handleCreate = () => {
    if (!newNote.title || !newNote.content || !newNote.videoId) {
      alert('请填写笔记标题、内容和视频ID');
      return;
    }
    createMutation.mutate({ 
      ...newNote, 
      videoId: parseInt(newNote.videoId),
      tags: newNote.tags
    });
  };

  const handleUpdate = () => {
    if (!selectedNote) return;
    
    updateMutation.mutate({ 
      id: selectedNote.id, 
      title: selectedNote.title, 
      content: selectedNote.content,
      tags: selectedNote.tags?.split(',') || []
    });
  };

  const handleDelete = (id: number) => {
    if (window.confirm('确定要删除这条笔记吗？')) {
      deleteMutation.mutate(id);
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    exportMutation.mutate({
      format: 'detailed'
    });
  };

  const handleViewNote = (note: UserNote) => {
    setSelectedNote(note);
    setShowNoteDetail(true);
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSubject]);

  if (isLoading) return <div className="flex justify-center items-center h-64">加载中...</div>;

  return (
    <div className="space-y-6 container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">我的笔记</h1>
          <p className="text-muted-foreground">管理和组织您的学习笔记</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? '列表视图' : '网格视图'}
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            导出笔记
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar with filters */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>筛选</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>搜索</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索笔记..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>科目</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择科目" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部科目</SelectItem>
                    {subjects.map(subject => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="pt-4">
                <Button variant="outline" className="w-full" onClick={() => {
                  setSearchTerm('');
                  setSelectedSubject('all');
                }}>
                  <Filter className="mr-2 h-4 w-4" />
                  重置筛选
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>新建笔记</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="笔记标题"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              />
              <Input
                placeholder="视频ID"
                value={newNote.videoId}
                onChange={(e) => setNewNote({ ...newNote, videoId: e.target.value })}
              />
              <Textarea
                placeholder="笔记内容"
                className="min-h-[100px]"
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              />
              <Button onClick={handleCreate} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> 创建笔记
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="md:col-span-3">
          {filteredNotes.length === 0 ? (
            <Card className="h-64">
              <CardContent className="flex flex-col items-center justify-center h-full">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">没有找到笔记</p>
                <p className="text-muted-foreground">尝试调整筛选条件或创建新笔记</p>
              </CardContent>
            </Card>
          ) : viewMode === 'list' ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {filteredNotes.map((note) => (
                    <div 
                      key={note.id} 
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleViewNote(note)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-lg">{note.title}</h3>
                            {note.subject_name && (
                              <Badge variant="outline" className="text-xs">
                                {note.subject_name}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground gap-4">
                            <div className="flex items-center">
                              <BookOpen className="mr-1 h-3 w-3" />
                              {note.video_title_chinese || note.video_title}
                            </div>
                            {note.timestamp_seconds > 0 && (
                              <div className="flex items-center">
                                <Clock className="mr-1 h-3 w-3" />
                                {formatTime(note.timestamp_seconds)}
                              </div>
                            )}
                          </div>
                          <p className="text-sm line-clamp-2">{note.content}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={(e) => { 
                            e.stopPropagation();
                            setSelectedNote(note); 
                            setIsEditing(true); 
                          }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(note.id);
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      上一页
                    </Button>
                    <span className="text-sm">
                      第 {currentPage} 页，共 {totalPages} 页
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      下一页
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredNotes.map((note) => (
                <Card key={note.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{note.title}</CardTitle>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { 
                          setSelectedNote(note); 
                          setIsEditing(true); 
                        }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(note.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="flex items-center text-xs gap-2">
                      <span className="flex items-center">
                        <BookOpen className="mr-1 h-3 w-3" />
                        {note.video_title_chinese || note.video_title}
                      </span>
                      {note.timestamp_seconds > 0 && (
                        <span className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          {formatTime(note.timestamp_seconds)}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <p className="text-sm line-clamp-3">{note.content}</p>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex justify-between">
                    {note.subject_name && (
                      <Badge variant="outline" className="text-xs">
                        {note.subject_name}
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleViewNote(note)}>
                      查看详情
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Note Detail Dialog */}
      <Dialog open={showNoteDetail} onOpenChange={setShowNoteDetail}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedNote?.title}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center text-sm gap-4 mt-1">
                <span className="flex items-center">
                  <BookOpen className="mr-1 h-3 w-3" />
                  {selectedNote?.video_title_chinese || selectedNote?.video_title}
                </span>
                {selectedNote?.timestamp_seconds > 0 && (
                  <span className="flex items-center">
                    <Clock className="mr-1 h-3 w-3" />
                    {formatTime(selectedNote?.timestamp_seconds || 0)}
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] mt-4 overflow-y-auto">
            <div className="p-4 whitespace-pre-wrap">
              {selectedNote?.content}
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center">
            <div className="flex gap-2">
              {selectedNote?.subject_name && (
                <Badge variant="outline">
                  {selectedNote.subject_name}
                </Badge>
              )}
              {selectedNote?.tags && selectedNote.tags.split(',').map(tag => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setIsEditing(true);
                setShowNoteDetail(false);
              }}>
                <Pencil className="mr-2 h-4 w-4" />
                编辑
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(selectedNote?.id || 0)}>
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={isEditing} onOpenChange={(open) => {
        setIsEditing(open);
        if (!open) setSelectedNote(null);
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>编辑笔记</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">标题</Label>
              <Input
                id="title"
                value={selectedNote?.title || ''}
                onChange={(e) => setSelectedNote(prev => prev ? {...prev, title: e.target.value} : null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">内容</Label>
              <Textarea
                id="content"
                className="min-h-[200px]"
                value={selectedNote?.content || ''}
                onChange={(e) => setSelectedNote(prev => prev ? {...prev, content: e.target.value} : null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">标签 (用逗号分隔)</Label>
              <Input
                id="tags"
                placeholder="例如: 重点,难点,考点"
                value={selectedNote?.tags || ''}
                onChange={(e) => setSelectedNote(prev => prev ? {...prev, tags: e.target.value} : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>取消</Button>
            <Button onClick={handleUpdate}>保存更改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyNotes;