import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Truck, LogIn, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login: authLogin } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      const response = await authLogin({ username, password });
      
      toast({
        title: "Đăng nhập thành công",
        description: `Chào mừng ${response.user.name}!`,
      });

      // Redirect based on role
      switch (response.user.role.toLowerCase()) {
        case 'call_center':
          navigate('/call-center');
          break;
        case 'dispatcher':
          navigate('/dispatch');
          break;
        case 'driver':
          navigate('/driver');
          break;
        case 'accountant':
          navigate('/accounting');
          break;
        default:
          navigate('/');
      }
    } catch (error) {
      toast({
        title: "Đăng nhập thất bại",
        description: error instanceof Error ? error.message : "Có lỗi xảy ra",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl">
              <Truck className="text-white" size={48} />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
            Xe Ghép
          </CardTitle>
          <p className="text-muted-foreground mt-2">Hệ thống điều phối xe đưa đón</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 bg-green-600 hover:bg-green-700 h-12 text-base"
              disabled={isSubmitting}
            >
              <LogIn size={20} />
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;