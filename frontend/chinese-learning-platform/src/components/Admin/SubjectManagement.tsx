import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SubjectService } from '@/services/subject.service';
import { Subject } from '@/types';
import toast from 'react-hot-toast';

const formSchema = z.object({
  name: z.string().min(1, '名称是必填的'),
  nameChinese: z.string().min(1, '中文名称是必填的'),
  description: z.string().optional(),
  iconUrl: z.string().optional(),
  colorCode: z.string().optional(),
  sortOrder: z.number().optional(),
});

function SubjectManagement() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['subjects', searchTerm, currentPage],
    queryFn: () => SubjectService.getAllSubjects({ search: searchTerm, page: currentPage, limit: itemsPerPage }),
  });

  const subjects = data?.subjects || [];
  const totalPages = data?.totalPages || 1;

  const createMutation = useMutation({
    mutationFn: SubjectService.createSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setIsDialogOpen(false);
      setEditingSubject(null);
      toast.success('科目添加成功');
    },
    onError: () => toast.error('添加科目失败'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<Subject>) => SubjectService.updateSubject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setIsDialogOpen(false);
      setEditingSubject(null);
      toast.success('科目更新成功');
    },
    onError: () => toast.error('更新科目失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: SubjectService.deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('科目删除成功');
    },
    onError: () => toast.error('删除科目失败'),
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({
    resolver: zodResolver(formSchema),
  });

  React.useEffect(() => {
    if (editingSubject) {
      setValue('name', editingSubject.name);
      setValue('nameChinese', editingSubject.name_chinese);
      setValue('description', editingSubject.description);
      setValue('iconUrl', editingSubject.icon_url);
      setValue('colorCode', editingSubject.color_code);
      setValue('sortOrder', editingSubject.sort_order);
      setIsDialogOpen(true);
    } else {
      reset();
    }
  }, [editingSubject, setValue, reset]);

  const onSubmit = (formData: any) => {
    if (editingSubject?.id) {
      updateMutation.mutate({ id: editingSubject.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('确定要删除这个科目吗？')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">科目管理</h1>
        <Button onClick={() => {
          setEditingSubject(null);
          setIsDialogOpen(true);
        }}>添加科目</Button>
      </div>
      <Input
        placeholder="搜索科目..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4 max-w-sm"
      />
      {isLoading ? (
        <p>加载中...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>中文名称</TableHead>
              <TableHead>颜色代码</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>操作</TableHead>
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
                  <Button variant="outline" onClick={() => handleEdit(subject)}>编辑</Button>
                  <Button variant="destructive" onClick={() => handleDelete(subject.id)}>删除</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="flex justify-between mt-4">
        <Button disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>上一页</Button>
        <span>第 {currentPage} 页 / 共 {totalPages} 页</span>
        <Button disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => prev + 1)}>下一页</Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setEditingSubject(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubject ? '编辑科目' : '添加科目'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">名称</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-red-500">{errors.name.message as string}</p>}
            </div>
            <div>
              <Label htmlFor="nameChinese">中文名称</Label>
              <Input {...register('nameChinese')} />
              {errors.nameChinese && <p className="text-red-500">{errors.nameChinese.message as string}</p>}
            </div>
            <div>
              <Label htmlFor="description">描述</Label>
              <Input {...register('description')} />
            </div>
            <div>
              <Label htmlFor="iconUrl">图标URL</Label>
              <Input {...register('iconUrl')} />
            </div>
            <div>
              <Label htmlFor="colorCode">颜色代码</Label>
              <Input {...register('colorCode')} />
            </div>
            <div>
              <Label htmlFor="sortOrder">排序</Label>
              <Input type="number" {...register('sortOrder', { valueAsNumber: true })} />
            </div>
            <Button type="submit">保存</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SubjectManagement;