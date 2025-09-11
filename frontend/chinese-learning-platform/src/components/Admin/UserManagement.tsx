import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserService } from '@/services/user.service';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const roles = ['student', 'admin'] as const;
const gradeLevels = ['初中1', '初中2', '初中3'] as const;

const formSchema = z.object({
  email: z.string().email('无效的邮箱格式'),
  password: z.string().optional().refine((val) => !val || val.length >= 6, { message: '密码至少6位' }),
  fullName: z.string().min(1, '姓名不能为空'),
  gradeLevel: z.enum(gradeLevels),
  role: z.enum(roles),
});

const UserManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', searchTerm, currentPage],
    queryFn: () => UserService.getAllUsers({ search: searchTerm, page: currentPage, limit: itemsPerPage }),
  });

  const users = usersData?.users || [];
  const totalPages = usersData?.totalPages || 1;

  const createMutation = useMutation({
    mutationFn: UserService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsDialogOpen(false);
      reset();
      toast.success('用户添加成功');
    },
    onError: () => toast.error('添加用户失败'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => UserService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsDialogOpen(false);
      reset();
      toast.success('用户更新成功');
    },
    onError: () => toast.error('更新用户失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: UserService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('用户删除成功');
    },
    onError: () => toast.error('删除用户失败'),
  });

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (editingUser) {
      setValue('email', editingUser.email);
      setValue('fullName', editingUser.fullName);
      setValue('gradeLevel', editingUser.gradeLevel);
      setValue('role', editingUser.role);
      setIsDialogOpen(true);
    } else {
      reset();
    }
  }, [editingUser, setValue, reset]);

  const onSubmit = (data: any) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { reset(); setEditingUser(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              添加用户
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingUser ? '编辑用户' : '添加用户'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">邮箱</Label>
                <Input id="email" {...register('email')} />
                {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="password">密码 {editingUser ? '(可选)' : ''}</Label>
                <Input id="password" type="password" {...register('password')} />
                {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
              </div>
              <div>
                <Label htmlFor="fullName">姓名</Label>
                <Input id="fullName" {...register('fullName')} />
                {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName.message}</p>}
              </div>
              <div>
                <Label htmlFor="gradeLevel">年级</Label>
                <Select onValueChange={(value) => setValue('gradeLevel', value)} defaultValue={editingUser?.gradeLevel}>
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
                <Label htmlFor="role">角色</Label>
                <Select onValueChange={(value) => setValue('role', value)} defaultValue={editingUser?.role}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-red-500 text-sm">{errors.role.message}</p>}
              </div>
              <Button type="submit" className="w-full">保存</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="搜索用户..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="mb-4 max-w-sm"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>年级</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    暂无用户
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.gradeLevel}</TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setEditingUser(user)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(user.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex justify-between mt-4">
            <Button disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>
              上一页
            </Button>
            <span>第 {currentPage} 页 / 共 {totalPages} 页</span>
            <Button disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => prev + 1)}>
              下一页
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;