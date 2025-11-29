import { useLocation, useNavigate } from 'react-router-dom';
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
import { LayoutDashboard, Phone, GitMerge, Truck, Car, UserCircle, Users, Lock, LogOut, Home, Banknote, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser, logout } = useAuth();
  const role = currentUser?.role ? currentUser.role.toString().toLowerCase() : undefined;
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
            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
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
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}