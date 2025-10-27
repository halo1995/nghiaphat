import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUsers, createUser, deleteUser, updateUser, type User } from '@/data/auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const Users: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  const usersQ = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const users = usersQ.data ?? [];
  const isLoading = usersQ.isLoading;

  const roleOptions = useMemo(
    () => [
      { value: 'dispatcher' as User['role'], label: 'Điều phối', disabled: false },
      { value: 'call_center' as User['role'], label: 'Tổng đài', disabled: false },
      { value: 'accountant' as User['role'], label: 'Kế toán', disabled: false },
      { value: 'admin' as User['role'], label: 'Admin', disabled: false },
      { value: 'driver' as User['role'], label: 'Tài xế', disabled: true },
    ],
    []
  );

  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'dispatcher' as User['role'],
    email: '',
    phone: '',
  });

  const createMut = useMutation({
    mutationFn: () => {
      if (form.role === 'driver') {
        throw new Error('Vui lòng tạo tài khoản tài xế tại trang Tài xế');
      }
      return createUser({
        username: form.username,
        password: form.password,
        name: form.name,
        role: form.role,
        email: form.email,
        phone: form.phone,
      });
    },
    onSuccess: () => {
      toast({ title: 'Tạo người dùng thành công' });
      setForm({ username: '', password: '', name: '', role: 'dispatcher', email: '', phone: '' });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: unknown) =>
      toast({
        title: 'Lỗi',
        description: e instanceof Error ? e.message : 'Không thể tạo người dùng',
        variant: 'destructive',
      }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast({ title: 'Đã xóa người dùng' });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: unknown) =>
      toast({
        title: 'Lỗi',
        description: e instanceof Error ? e.message : 'Không thể xóa',
        variant: 'destructive',
      }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<User> }) => {
      const existing = users.find((user) => user.id === id);
      if (!existing) {
        throw new Error('Không tìm thấy người dùng để cập nhật');
      }
      if (patch.role === 'driver' && existing.role !== 'driver') {
        throw new Error('Không thể chuyển vai trò sang Tài xế tại trang này');
      }
      return updateUser(id, {
        username: patch.username ?? existing.username,
        password: patch.password ?? existing.password,
        name: patch.name ?? existing.name,
        role: patch.role ?? existing.role,
        email: patch.email ?? existing.email,
        phone: patch.phone ?? existing.phone,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (e: unknown) =>
      toast({
        title: 'Lỗi',
        description: e instanceof Error ? e.message : 'Không thể cập nhật người dùng',
        variant: 'destructive',
      }),
  });

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">Quản lý người dùng</h2>

      <Card>
        <CardHeader>
          <CardTitle>Tạo tài khoản mới</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Tên đăng nhập</label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Mật khẩu</label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Họ tên</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Vai trò</label>
            <select
              className="border rounded-md h-9 px-3 w-full"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Muốn tạo tài khoản tài xế? Vui lòng sử dụng mục “Thêm tài xế” trong trang Tài xế.
            </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">SĐT</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="mt-4">
            <Button
              disabled={createMut.isPending}
              onClick={() => {
                if (!form.username || !form.password || !form.name) {
                  toast({ title: 'Thiếu thông tin', description: 'Nhập đủ tên đăng nhập, mật khẩu, họ tên', variant: 'destructive' });
                  return;
                }
                createMut.mutate();
              }}
            >
              Tạo tài khoản
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách người dùng</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên đăng nhập</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>SĐT</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQ.data?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>
                    <select
                      className="border rounded-md h-9 px-2"
                      value={u.role}
                      onChange={(e) => updateMut.mutate({ id: u.id, patch: { role: e.target.value as User['role'] } })}
                      disabled={u.role === 'driver'}
                    >
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value} disabled={option.disabled && option.value !== u.role}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {u.role === 'driver' && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Quản lý trạng thái tài xế tại trang Tài xế.
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.phone}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => deleteMut.mutate(u.id)}>Xóa</Button>
                    </div>
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

export default Users;
