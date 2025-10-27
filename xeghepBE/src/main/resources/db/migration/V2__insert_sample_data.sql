-- Insert sample users
INSERT INTO users (username, password, name, role, email, phone, avatar, created_at) VALUES
('admin', '$2a$10$Gz4gP5dZ8nDqzXoK6u0QeOkb0f8Y8KjWY8p/q6hR2W4nBv6kU8uS', 'Quản trị viên', 'ADMIN', 'admin@xeghep.com', '0900000000', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', '2024-01-01 00:00:00'),
('tongdai', '$2a$10$Gz4gP5dZ8nDqzXoK6u0QeOkb0f8Y8KjWY8p/q6hR2W4nBv6kU8uS', 'Nhân viên Tổng đài', 'CALL_CENTER', 'tongdai@xeghep.com', '0901111111', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', '2024-01-01 00:00:00'),
('dieuphoi', '$2a$10$Gz4gP5dZ8nDqzXoK6u0QeOkb0f8Y8KjWY8p/q6hR2W4nBv6kU8uS', 'Nhân viên Điều phối', 'DISPATCHER', 'dieuphoi@xeghep.com', '0902222222', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', '2024-01-01 00:00:00'),
('taixe', '$2a$10$Gz4gP5dZ8nDqzXoK6u0QeOkb0f8Y8KjWY8p/q6hR2W4nBv6kU8uS', 'Phạm Thị Lan', 'DRIVER', 'phamthilan@email.com', '0904444444', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', '2024-01-01 00:00:00');

-- Password is "admin123", "tongdai123", "dieuphoi123", "taixe123" respectively

-- Insert sample customers
INSERT INTO customers (name, email, phone, address, join_date, total_trips, total_spent, rating, avatar, status) VALUES
('Trần Thị Mai', 'tranthimai@email.com', '0901234567', 'Quận 1, TP.HCM', '2023-01-15', 45, 12500000.00, 4.9, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'HOAT_DONG'),
('Nguyễn Văn Bình', 'nguyenvanbinh@email.com', '0912345678', 'Quận 3, TP.HCM', '2023-03-20', 28, 8900000.00, 4.7, 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400', 'HOAT_DONG'),
('Lê Minh Tuấn', 'leminhtuan@email.com', '0923456789', 'Quận 7, TP.HCM', '2023-06-10', 67, 18200000.00, 4.8, 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400', 'HOAT_DONG'),
('Công ty ABC', 'contact@abc.com', '0934567890', 'Quận 1, TP.HCM', '2022-11-05', 156, 89000000.00, 5.0, 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=400', 'HOAT_DONG'),
('Hoàng Thị Hoa', 'hoangthihoa@email.com', '0945678901', 'Quận Bình Thạnh, TP.HCM', '2023-08-22', 34, 7800000.00, 4.6, 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400', 'HOAT_DONG'),
('Phạm Văn Đức', 'phamvanduc@email.com', '0956789012', 'Quận 10, TP.HCM', '2023-02-18', 52, 14300000.00, 4.8, 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400', 'HOAT_DONG');

-- Insert sample vehicles
INSERT INTO vehicles (name, brand, model, year, license_plate, color, seats, fuel_type, status, mileage, last_maintenance, next_maintenance, image, total_trips, rating) VALUES
('Toyota Innova', 'Toyota', 'Innova 2.0E', 2023, '30A-12345', 'Trắng', 7, 'XANG', 'SAN_SANG', 15000, '2024-01-15', '2024-07-15', 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800', 245, 4.8),
('Ford Transit', 'Ford', 'Transit 16 chỗ', 2022, '51G-67890', 'Bạc', 16, 'DAU', 'DANG_CHAY', 45000, '2024-02-20', '2024-08-20', 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800', 189, 4.6),
('Hyundai Solati', 'Hyundai', 'Solati 16 chỗ', 2023, '29B-11111', 'Trắng', 16, 'DAU', 'SAN_SANG', 28000, '2024-03-01', '2024-09-01', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800', 156, 4.9),
('Toyota Vios', 'Toyota', 'Vios G', 2024, '30F-88888', 'Đen', 4, 'XANG', 'SAN_SANG', 8000, '2024-03-10', '2024-09-10', 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800', 312, 4.7),
('Honda City', 'Honda', 'City RS', 2023, '43C-55555', 'Đỏ', 4, 'XANG', 'DANG_CHAY', 22000, '2024-02-05', '2024-08-05', 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800', 278, 4.5),
('Mazda CX-5', 'Mazda', 'CX-5 Premium', 2023, '50H-99999', 'Xanh', 5, 'XANG', 'BAO_TRI', 18000, '2024-03-15', '2024-09-15', 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800', 134, 4.8);

-- Insert sample drivers
INSERT INTO drivers (name, phone, email, license_number, license_expiry, address, date_of_birth, join_date, status, avatar, vehicle_id, total_trips, rating, total_earnings, outstanding_balance) VALUES
('Nguyễn Văn An', '0901111111', 'nguyenvanan@email.com', 'B2-123456', '2026-12-31', 'Quận 1, TP.HCM', '1985-05-15', '2020-01-10', 'HOAT_DONG', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 1, 245, 4.8, 125000000.00, 0.00),
('Trần Minh Tuấn', '0902222222', 'tranminhtuan@email.com', 'D-234567', '2027-06-30', 'Quận Bình Thạnh, TP.HCM', '1982-08-20', '2019-06-15', 'HOAT_DONG', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', 2, 189, 4.6, 98000000.00, 0.00),
('Lê Hoàng Nam', '0903333333', 'lehoangnam@email.com', 'D-345678', '2025-12-31', 'Quận 7, TP.HCM', '1988-03-10', '2021-03-20', 'HOAT_DONG', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', 3, 156, 4.9, 87000000.00, 0.00),
('Phạm Thị Lan', '0904444444', 'phamthilan@email.com', 'B2-456789', '2026-08-31', 'Quận 3, TP.HCM', '1990-11-25', '2020-09-01', 'HOAT_DONG', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', 4, 312, 4.7, 156000000.00, 0.00),
('Võ Minh Khoa', '0905555555', 'vominhkhoa@email.com', 'B2-567890', '2027-03-31', 'Quận 10, TP.HCM', '1987-07-18', '2019-11-10', 'HOAT_DONG', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', 5, 278, 4.5, 142000000.00, 0.00),
('Đặng Thị Hương', '0906666666', 'dangthihuong@email.com', 'B2-678901', '2026-10-31', 'Quận Tân Bình, TP.HCM', '1992-02-14', '2022-01-15', 'NGHI_PHEP', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', NULL, 89, 4.8, 45000000.00, 0.00);

-- Insert sample trips
INSERT INTO trips (pickup_location, dropoff_location, pickup_time, distance, price, status, passengers, created_at, confirmed_at, customer_id, customer_name, customer_phone, driver_id, driver_name, vehicle_id, vehicle_name, group_id) VALUES
('Sân bay Tân Sơn Nhất, TP.HCM', 'Quận 1, TP.HCM', '2024-03-20 08:00:00', 15, 250000.00, 'CHO_XAC_NHAN', 3, '2024-03-19 15:30:00', NULL, 1, 'Trần Thị Mai', '0901234567', NULL, NULL, NULL, NULL, NULL),
('Quận 3, TP.HCM', 'Vũng Tàu', '2024-03-20 14:00:00', 125, 1800000.00, 'DA_XAC_NHAN', 12, '2024-03-18 10:00:00', '2024-03-18 11:00:00', 2, 'Nguyễn Văn Bình', '0912345678', NULL, NULL, NULL, NULL, NULL),
('Quận 7, TP.HCM', 'Quận 3, TP.HCM', '2024-03-20 16:30:00', 12, 180000.00, 'DA_PHAN_XE', 2, '2024-03-20 09:15:00', '2024-03-20 09:30:00', 3, 'Lê Minh Tuấn', '0923456789', 4, 'Phạm Thị Lan', 4, 'Toyota Vios - 30F-88888', 'g1'),
('Văn phòng Quận 1, TP.HCM', 'Đà Lạt', '2024-03-21 06:00:00', 308, 4500000.00, 'DA_XAC_NHAN', 15, '2024-03-15 14:20:00', '2024-03-15 15:00:00', 4, 'Công ty ABC', '0934567890', NULL, NULL, NULL, NULL, NULL),
('Bệnh viện Chợ Rẫy, TP.HCM', 'Quận Bình Thạnh, TP.HCM', '2024-03-20 10:15:00', 8, 120000.00, 'HOAN_THANH', 1, '2024-03-20 09:00:00', '2024-03-20 09:05:00', 5, 'Hoàng Thị Hoa', '0945678901', 5, 'Võ Minh Khoa', 5, 'Honda City - 43C-55555', NULL),
('Quận 10, TP.HCM', 'Sân bay Tân Sơn Nhất, TP.HCM', '2024-03-20 18:00:00', 10, 200000.00, 'DA_XAC_NHAN', 4, '2024-03-20 12:30:00', '2024-03-20 13:00:00', 6, 'Phạm Văn Đức', '0956789012', NULL, NULL, NULL, NULL, NULL);

-- Update completed trip with actual completion details
UPDATE trips 
SET assigned_at = '2024-03-20 09:30:00', 
    started_at = '2024-03-20 10:10:00', 
    completed_at = '2024-03-20 10:50:00', 
    pickup_confirmed = TRUE, 
    dropoff_confirmed = TRUE, 
    dropoff_time = '2024-03-20 10:45:00',
    rating = 4
WHERE id = 5;

-- Insert sample trip group
INSERT INTO trip_groups (name, trip_ids, vehicle_id, vehicle_name, driver_id, driver_name, status, created_at, total_passengers, total_revenue) VALUES
('Nhóm chuyến Quận 7 - Quận 3', '3', 4, 'Toyota Vios - 30F-88888', 4, 'Phạm Thị Lan', 'DA_PHAN_XE', '2024-03-20 10:00:00', 2, 180000.00);
