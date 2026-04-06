import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getCustomersPaginated } from '@/data/customers';
import { Search, Star, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { PaginationControls } from '@/components/PaginationControls';

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['customers', 'paginated', page, pageSize, searchTerm],
    queryFn: () => getCustomersPaginated(page, pageSize, searchTerm || undefined),
  });

  const customers = data?.customers || [];
  const totalPages = data?.totalPages || 0;
  const totalElements = data?.totalElements || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hoạt động':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'Ngừng hoạt động':
        return 'bg-gray-100 text-gray-700 border border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4 shadow-sm">
        <SidebarTrigger />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">Quản Lý Khách Hàng</h1>
          <p className="text-sm text-muted-foreground">Danh sách khách hàng trong hệ thống</p>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Search Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <Input
                    type="text"
                    placeholder="Tìm kiếm theo tên, số điện thoại, email..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(0);
                    }}
                    className="pl-10"
                  />
                </div>
                <Button className="gap-2" onClick={() => navigate('/customers/add')}>
                  <Plus size={18} />
                  Thêm khách hàng
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Customers Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Đang tải...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Không tìm thấy khách hàng nào</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customers.map((customer, index) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-2">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-2xl font-semibold shrink-0 shadow-lg">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-800 mb-1">
                            {customer.name}
                          </h3>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                            {customer.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">📞 Điện thoại:</span>
                          <span className="font-medium">{customer.phone}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">✉️ Email:</span>
                          <span className="font-medium text-xs">{customer.email}</span>
                        </div>
                        <div className="flex items-start justify-between text-sm">
                          <span className="text-muted-foreground">📍 Địa chỉ:</span>
                          <span className="font-medium text-right text-xs">{customer.address}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Star className="fill-yellow-400 text-yellow-400" size={14} />
                            Đánh giá
                          </span>
                          <span className="font-bold text-yellow-600">{customer.rating}/5</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <TrendingUp size={14} />
                            Chuyến đi
                          </span>
                          <span className="font-bold text-blue-600">{customer.totalTrips}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar size={14} />
                            Tham gia
                          </span>
                          <span className="font-medium text-sm">
                            {new Date(customer.joinDate).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t mt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <DollarSign size={14} />
                            Tổng chi tiêu
                          </span>
                          <span className="text-lg font-bold text-green-600">
                            {(customer.totalSpent / 1000000).toFixed(1)}M ₫
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            <Card>
              <CardContent className="p-0">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={totalElements}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(0);
                  }}
                />
              </CardContent>
            </Card>
          </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Customers;