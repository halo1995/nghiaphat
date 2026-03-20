# Kế hoạch Kiểm thử: Quy tắc "Cùng Ngày Đón" cho TripGroup

## Tóm tắt Quy tắc
Theo yêu cầu nghiệp vụ mới, **tất cả các chuyến đi (Trips) trong cùng một Nhóm chuyến (TripGroup) bắt buộc phải có cùng một ngày đón khách (pickupDate)**. 
Quy tắc này được áp dụng và kiểm tra nghiêm ngặt tại các hành động:
1. Tạo mới nhóm chuyến (`create`)
2. Cập nhật nhóm chuyến (`update`)
3. Thêm chuyến vào nhóm đã có (`addTrip`)

---

## 1. Kiểm thử thủ công (Manual Testing)

### Kịch bản 1: Tạo nhóm chuyến với các chuyến có ngày đón KHÁC NHAU
**Mục tiêu**: Đảm bảo hệ thống chặn việc tạo nhóm nếu các chuyến không cùng ngày.
**Các bước**:
1. Lấy ID của 2 chuyến đi có ngày đón (pickup time) khác nhau (VD: Trip A ngày 01/12/2024, Trip B ngày 02/12/2024).
2. Gọi API tạo nhóm mới với `tripIds` chứa cả 2 ID này.
3. **Kết quả mong đợi**: 
   - API trả về lỗi `400 Bad Request`.
   - Message lỗi: `"Không thể tạo nhóm với các chuyến có ngày đón khác nhau. Một nhóm chỉ được chứa các chuyến cùng ngày đón."`

### Kịch bản 2: Tạo nhóm chuyến với các chuyến CÙNG ngày đón
**Mục tiêu**: Đảm bảo quy trình bình thường không bị ảnh hưởng.
**Các bước**:
1. Lấy ID của các chuyến đi có cùng ngày đón.
2. Gọi API tạo nhóm mới với các ID này.
3. **Kết quả mong đợi**: 
   - Ghi nhận thành công (`200 OK` hoặc `201 Created`).
   - Nhóm chuyến được tạo với `pickupDate` tương ứng.

### Kịch bản 3: Thêm một chuyến đi KHÁC ngày đón vào nhóm ĐÃ CÓ
**Mục tiêu**: Đảm bảo hệ thống chặn việc thêm chuyến không hợp lệ vào nhóm.
**Các bước**:
1. Chọn một nhóm chuyến đã có sẵn (VD đang có `pickupDate` là 01/12/2024).
2. Lấy ID của một chuyến đi mới có ngày đón là 02/12/2024.
3. Gọi API `addTrip` để thêm chuyến này vào nhóm.
4. **Kết quả mong đợi**: 
   - API trả về lỗi `400 Bad Request`.
   - Message lỗi: `"Không thể thêm chuyến có ngày đón khác với nhóm. Nhóm chỉ chứa chuyến cùng ngày đón."`

### Kịch bản 4: Cập nhật nhóm chuyến qua API `update` với danh sách chuyến KHÁC ngày
**Mục tiêu**: Đảm bảo hệ thống chặn update danh sách ID chuyến đi nếu chúng không cùng ngày.
**Các bước**:
1. Chọn một nhóm chuyến bất kỳ.
2. Gọi API `PUT /api/trip-groups/{id}`.
3. Truyền payload với `tripIds` là danh sách các chuyến có ngày đón khác nhau.
4. **Kết quả mong đợi**: 
   - API trả về lỗi `400 Bad Request`.
   - Message lỗi: `"Không thể tạo nhóm với các chuyến có ngày đón khác nhau..."`

---

## 2. Kiểm thử Frontend (Giao diện)

### Tại màn hình CallCenter / Xếp chuyến
1. **Kéo thả / Ghép chuyến**: Thử chọn 2 chuyến ở 2 ngày khác nhau và gán vào cùng một nhóm xe.
2. Hệ thống phải hiển thị thông báo lỗi rõ ràng cho người dùng (toast error) từ message trả về của Backend.
3. Trạng thái của các chuyến đi trên giao diện phải giữ nguyên như trước khi thao tác (không bị kẹt ở trạng thái loading hoặc tự động update sai mảng).

---

## 3. Kiểm chứng Dữ liệu (Database Verification)

Đảm bảo không có dữ liệu rác hoặc dữ liệu vi phạm quy tắc tồn tại trong Database sau khi triển khai hệ thống:

```sql
-- Truy vấn để tìm ra các TripGroup vi phạm quy tắc (chứa các chuyến có ngày đón khác nhau)
SELECT 
    tg.id AS group_id,
    tg.name AS group_name,
    tg.pickup_date AS group_pickup_date,
    COUNT(DISTINCT DATE(t.pickup_time)) AS different_dates_count,
    GROUP_CONCAT(DATE(t.pickup_time)) AS all_pickup_dates
FROM trip_groups tg
JOIN trips t ON FIND_IN_SET(t.id, REPLACE(tg.trip_ids, ' ', ''))
GROUP BY tg.id, tg.name, tg.pickup_date
HAVING COUNT(DISTINCT DATE(t.pickup_time)) > 1;
```
*(Truy vấn trên phải trả về **0** bản ghi)*

---

## 4. Các trường hợp ngoại lệ (Edge Cases)
- **Cập nhật ngày đón của một chuyến đi (Trip) đã nằm trong nhóm**: Nếu nhân viên update thông tin chuyến (đổi ngày đi của khách) trong khi chuyến đó đang nằm trong `TripGroup`, sẽ xử lý như thế nào? (Yêu cầu phải tách chuyến ra khỏi nhóm trước khi đổi ngày, hoặc xóa nhóm nếu đó là chuyến cuối cùng).
- **Chuyến đi không có giờ đón (`pickupTime` = NULL)**: Quy tắc tính toán hiện tại sẽ bỏ qua các chuyến không có `pickupTime`. Cần đảm bảo logic tạo nhóm không bị lỗi Null Pointer khi có chuyến bị thiếu dữ liệu thời gian.

---

## 5. Tiêu chí Thành công (Success Criteria)
- [ ] Mọi API thay đổi cấu trúc của Nhóm chuyến (`create`, `update`, `addTrip`) đều ném ra exception hợp lệ khi phát hiện sai lệch về ngày đón.
- [ ] Frontend hiển thị đúng câu thông báo lỗi cho người vận hành một cách thân thiện.
- [ ] Script kiểm tra DB báo cáo không có conflict data nào (hoặc đã được xử lý tay hết trước khi release lỗi).
