import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus } from 'lucide-react';

import { NotesService } from '@/services/notes.service';
import { UserNote } from '@/types';

const MyNotes: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', videoId: '' });

  const { data: notesData, isLoading } = useQuery({
    queryKey: ['my-notes'],
    queryFn: () => NotesService.getAllNotes(),
  });
  const notes = notesData?.notes || [];

  const createMutation = useMutation({
    mutationFn: NotesService.createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      setNewNote({ title: '', content: '', videoId: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...note }: { id: number } & Partial<UserNote>) => NotesService.updateNote(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      setIsEditing(false);
      setSelectedNote(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: NotesService.deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
    },
  });

  const handleCreate = () => {
    createMutation.mutate({ ...newNote, videoId: parseInt(newNote.videoId) });
  };

  const handleUpdate = () => {
    if (selectedNote) updateMutation.mutate({ id: selectedNote.id, title: selectedNote.title, content: selectedNote.content });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) return <div>加载中...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>我的笔记</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notes?.map((note) => (
              <div key={note.id} className="border-b pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{note.title}</h3>
                    <p className="text-sm text-muted-foreground">视频: {note.video_title_chinese || note.video_title} | 时间: {note.timestamp_seconds}s</p>
                    <p className="text-sm">{note.content.substring(0, 100)}...</p>
                  </div>
                  <div className="space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedNote(note); setIsEditing(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(note.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? '编辑笔记' : '新建笔记'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="笔记标题"
            value={isEditing ? selectedNote?.title : newNote.title}
            onChange={(e) => isEditing ? setSelectedNote({ ...selectedNote!, title: e.target.value }) : setNewNote({ ...newNote, title: e.target.value })}
          />
          <Input
            placeholder="视频ID"
            value={isEditing ? '' : newNote.videoId} // Editing might not change video
            onChange={(e) => !isEditing && setNewNote({ ...newNote, videoId: e.target.value })}
          />
          <Textarea
            placeholder="笔记内容"
            value={isEditing ? selectedNote?.content : newNote.content}
            onChange={(e) => isEditing ? setSelectedNote({ ...selectedNote!, content: e.target.value }) : setNewNote({ ...newNote, content: e.target.value })}
          />
          <Button onClick={isEditing ? handleUpdate : handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> {isEditing ? '更新' : '创建'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyNotes;