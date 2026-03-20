import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Phone, GitMerge, Truck, Car, UserCircle, Users, Lock, LogOut, Home, Banknote, Wallet, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/apiService';
import { useTheme } from 'next-themes';

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const role = currentUser?.role ? currentUser.role.toString().toLowerCase() : undefined;

  const isAccountantOrAdmin = role === 'admin' || role === 'accountant';
  const { data: pendingExpenseCount = 0 } = useQuery({
    queryKey: ['pendingExpenseCount'],
    queryFn: async () => {
      const res = await apiService.getExpenseVouchers({ status: 'PENDING', page: 0, size: 1 });
      return res.pageable?.totalElements ?? 0;
    },
    enabled: isAccountantOrAdmin,
    refetchInterval: 30000,
    staleTime: 15000,
  });
  const menuSections = (() => {
    if (role === 'call_center') {
      return [
        {
          label: 'Tổng Đài',
          items: [
            { title: 'Quản Lý Đặt Chuyến', icon: Phone, href: '/call-center' },
          ]
        },
      ];
    }
    if (role === 'dispatcher') {
      return [
        {
          label: 'Điều Phối',
          items: [
            { title: 'Ghép Chuyến', icon: GitMerge, href: '/dispatch' },
            { title: 'Nhóm Chuyến', icon: Truck, href: '/group-trips' },
          ]
        },
      ];
    }
    if (role === 'driver') {
      return [
        {
          label: 'Tài Xế',
          items: [
            { title: 'Lịch Trình Của Tôi', icon: LayoutDashboard, href: '/driver' },
            { title: 'Lịch Sử Tạm Ứng', icon: Wallet, href: '/driver/advances' },
          ]
        },
      ];
    }
    if (role === 'accountant') {
      return [
        {
          label: 'Kế Toán',
          items: [
            { title: 'Thu - Nộp', icon: Banknote, href: '/accounting' },
            { title: 'Phiếu Chi', icon: Banknote, href: '/accounting/expenses' },
            { title: 'Sổ Quỹ Tài Xế', icon: Wallet, href: '/accounting/driver-ledger' },
          ]
        },
      ];
    }
    // admin
    return [
      {
        label: 'Tổng Quan',
        items: [
          { title: 'Dashboard', icon: Home, href: '/' },
        ]
      },
      {
        label: 'Tổng Đài',
        items: [
          { title: 'Quản Lý Đặt Chuyến', icon: Phone, href: '/call-center' },
        ]
      },
      {
        label: 'Điều Phối',
        items: [
          { title: 'Ghép Chuyến', icon: GitMerge, href: '/dispatch' },
          { title: 'Nhóm Chuyến', icon: Truck, href: '/group-trips' },
        ]
      },
      {
        label: 'Quản Lý',
        items: [
          { title: 'Xe', icon: Car, href: '/vehicles' },
          { title: 'Tài Xế', icon: UserCircle, href: '/drivers' },
          { title: 'Khách Hàng', icon: Users, href: '/customers' },
          { title: 'Người Dùng', icon: Users, href: '/users' },
          { title: 'Kế Toán', icon: Banknote, href: '/accounting' },
          { title: 'Phiếu Chi', icon: Banknote, href: '/accounting/expenses' },
          { title: 'Sổ Quỹ Tài Xế', icon: Wallet, href: '/accounting/driver-ledger' },
        ]
      }
    ];
  })();

  const handleLogout = () => {
    logout();
    toast({
      title: "Đã đăng xuất",
      description: "Hẹn gặp lại bạn!",
    });
    // Use window.location to force full page reload and avoid navigation blocking
    window.location.href = '/login';
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-lg">
            <Truck className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
              Xe Ghép
            </h1>
            <p className="text-xs text-muted-foreground">Hệ thống điều phối</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {menuSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      isActive={location.pathname === item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Workaround: Use full page reload when navigating from /accounting
                        if (location.pathname === '/accounting' && item.href !== '/accounting') {
                          window.location.href = item.href;
                        } else {
                          navigate(item.href, { replace: true });
                        }
                      }}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.href === '/accounting/expenses' && pendingExpenseCount > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold h-5 min-w-[20px] px-1">
                          {pendingExpenseCount}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {currentUser && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 bg-sidebar-accent rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {currentUser.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {role === 'admin' ? 'Quản trị viên' :
                   role === 'call_center' ? 'Tổng đài' :
                   role === 'dispatcher' ? 'Điều phối' :
                   role === 'accountant' ? 'Kế toán' : 'Tài xế'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 gap-2"
                onClick={() => navigate('/change-password')}
              >
                <Lock size={14} />
                Đổi MK
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex-1 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut size={14} />
                Đăng xuất
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? 'Bật sáng' : 'Bật tối'}
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </Button>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}