import React, { useState, useEffect } from 'react';
import { SubjectService } from '@/services/subject.service';
import { Subject } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

function SubjectManagement() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSubject, setEditingSubject] = useState<Partial<Subject> | null>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const data = await SubjectService.getAllSubjects();
      setSubjects(data);
    } catch (error) {
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;

    try {
      if (editingSubject.id) {
        await SubjectService.updateSubject(editingSubject.id, editingSubject);
      } else {
        await SubjectService.createSubject(editingSubject as any);
      }
      setEditingSubject(null);
      fetchSubjects();
      toast.success('Subject saved successfully');
    } catch (error) {
      toast.error('Failed to save subject');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      await SubjectService.deleteSubject(id);
      fetchSubjects();
      toast.success('Subject deleted successfully');
    } catch (error) {
      toast.error('Failed to delete subject');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Subject Management</h1>
        <Dialog open={!!editingSubject} onOpenChange={(open) => !open && setEditingSubject(null)}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingSubject({})}>Add Subject</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSubject?.id ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={editingSubject?.name || ''} onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="nameChinese">Chinese Name</Label>
                <Input id="nameChinese" value={editingSubject?.nameChinese || ''} onChange={(e) => setEditingSubject({ ...editingSubject, nameChinese: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={editingSubject?.description || ''} onChange={(e) => setEditingSubject({ ...editingSubject, description: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="iconUrl">Icon URL</Label>
                <Input id="iconUrl" value={editingSubject?.iconUrl || ''} onChange={(e) => setEditingSubject({ ...editingSubject, iconUrl: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="colorCode">Color Code</Label>
                <Input id="colorCode" value={editingSubject?.colorCode || ''} onChange={(e) => setEditingSubject({ ...editingSubject, colorCode: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input id="sortOrder" type="number" value={editingSubject?.sortOrder || 0} onChange={(e) => setEditingSubject({ ...editingSubject, sortOrder: parseInt(e.target.value) })} />
              </div>
              <Button type="submit">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Chinese Name</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((subject) => (
              <TableRow key={subject.id}>
                <TableCell>{subject.id}</TableCell>
                <TableCell>{subject.name}</TableCell>
                <TableCell>{subject.name_chinese}</TableCell>
                <TableCell>{subject.color_code}</TableCell>
                <TableCell>{subject.sort_order}</TableCell>
                <TableCell>
                  <Button variant="outline" onClick={() => setEditingSubject(subject)}>Edit</Button>
                  <Button variant="destructive" onClick={() => handleDelete(subject.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default SubjectManagement;