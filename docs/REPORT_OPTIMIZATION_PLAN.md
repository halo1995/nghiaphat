# Kế Hoạch Tối Ưu Chức Năng Xuất Báo Cáo

## Vấn Đề Hiện Tại

Từ phân tích code `ReportServiceImpl.java`, các vấn đề cần tối ưu:

### 1. **Performance Issues**
- Query nhiều lần từ database (8+ queries riêng biệt)
- Load toàn bộ data vào memory trước khi filter
- Không có pagination hoặc streaming
- Tạo Excel file đồng bộ, block request thread

### 2. **Memory Issues**
- Load tất cả transactions, vouchers, payments vào memory
- Với data lớn (>10,000 records) có thể gây OutOfMemoryError
- Không có giới hạn kích thước báo cáo

### 3. **User Experience Issues**
- Request timeout với data lớn (>30s)
- Không có progress indicator
- Không thể cancel request đang chạy
- Browser có thể timeout trước khi nhận được file

### 4. **Code Quality Issues**
- Logic phức tạp, khó maintain
- Duplicate code trong việc tạo sheets
- Không có caching
- Không có error handling tốt

## Giải Pháp Đề Xuất

### Phase 1: Tối Ưu Query & Memory (Ưu tiên cao)
1. **Optimize Database Queries**
   - Sử dụng JOIN thay vì multiple queries
   - Add indexes cho các trường filter (createdAt, collectedAt, etc.)
   - Sử dụng projection để chỉ lấy fields cần thiết
   - Implement pagination cho large datasets

2. **Streaming Processing**
   - Sử dụng POI SXSSFWorkbook thay vì XSSFWorkbook (streaming write)
   - Process data theo batch thay vì load all
   - Giảm memory footprint từ O(n) xuống O(1)

### Phase 2: Async Processing (Ưu tiên cao)
1. **Background Job Processing**
   - Implement async report generation với Spring @Async
   - Lưu file tạm vào disk/S3
   - Trả về job ID cho client
   - Client poll status và download khi ready

2. **Job Queue System**
   - Sử dụng database table để track jobs
   - Status: PENDING, PROCESSING, COMPLETED, FAILED
   - Store file path và expiry time
   - Auto cleanup old files

### Phase 3: Caching & Optimization (Ưu tiên trung bình)
1. **Smart Caching**
   - Cache aggregated data (totals, summaries)
   - Cache user/trip lookups
   - Invalidate cache khi có update

2. **Parallel Processing**
   - Generate multiple sheets parallel
   - Sử dụng CompletableFuture/ExecutorService

### Phase 4: UI/UX Improvements (Ưu tiên trung bình)
1. **Progress Tracking**
   - WebSocket hoặc SSE để push progress
   - Show % complete và estimated time
   - Allow cancel operation

2. **Report Templates**
   - Pre-defined report templates
   - Custom column selection
   - Save user preferences

### Phase 5: Advanced Features (Ưu tiên thấp)
1. **Scheduled Reports**
   - Cron jobs để tự động generate
   - Email delivery
   - Report history

2. **Export Formats**
   - PDF export
   - CSV export (lighter than Excel)
   - JSON API for custom processing

## Implementation Priority

### Sprint 1 (Week 1-2): Critical Performance Fixes
- [ ] Add database indexes
- [ ] Optimize queries với JOIN
- [ ] Implement SXSSFWorkbook streaming
- [ ] Add batch processing

### Sprint 2 (Week 3-4): Async Processing
- [ ] Create ReportJob entity & repository
- [ ] Implement async service với @Async
- [ ] Add job status API endpoints
- [ ] Frontend: polling mechanism

### Sprint 3 (Week 5-6): Caching & Polish
- [ ] Implement caching layer
- [ ] Add progress tracking
- [ ] Error handling improvements
- [ ] Testing & optimization

## Success Metrics

### Performance Targets
- Report generation time: < 10s for 10K records
- Memory usage: < 500MB for 50K records
- No timeout errors for reports up to 100K records
- Response time for status check: < 100ms

### User Experience Targets
- Progress indicator shows within 1s
- User can cancel long-running reports
- Download link available within 30s for typical reports
- Clear error messages with retry options

## Technical Specifications

### Database Indexes Needed
```sql
CREATE INDEX idx_company_transaction_created_at ON company_transactions(created_at);
CREATE INDEX idx_expense_voucher_created_at_status ON expense_vouchers(created_at, status);
CREATE INDEX idx_customer_advance_collected_at ON customer_advance_payments(collected_at);
CREATE INDEX idx_driver_advance_requested_at ON driver_expense_advances(requested_at);
CREATE INDEX idx_trip_payment_collected_at ON trip_payments(collected_at);
CREATE INDEX idx_deposit_record_created_at ON deposit_records(created_at);
```

### New API Endpoints
```
POST   /api/reports/accounting/generate  - Start async generation
GET    /api/reports/jobs/{jobId}         - Check job status
GET    /api/reports/jobs/{jobId}/download - Download completed report
DELETE /api/reports/jobs/{jobId}         - Cancel/delete job
GET    /api/reports/jobs                 - List user's report jobs
```

### Report Job Schema
```sql
CREATE TABLE report_jobs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    parameters JSONB,
    status VARCHAR(20) NOT NULL,
    file_path VARCHAR(500),
    error_message TEXT,
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Risk Assessment

### High Risk
- **Memory issues during migration**: Cần test thoroughly với production data size
- **Breaking changes**: Async API khác với sync API hiện tại

### Medium Risk
- **Complexity increase**: Thêm job management system
- **Storage requirements**: Cần disk space cho temporary files

### Low Risk
- **Performance regression**: Có thể rollback nếu cần
- **User confusion**: Cần good documentation

## Rollback Plan

1. Keep old sync endpoint as fallback
2. Feature flag để enable/disable async processing
3. Monitor error rates và performance metrics
4. Gradual rollout: 10% → 50% → 100% users

## Next Steps

1. **Review & Approval**: Team review kế hoạch này
2. **Create Detailed Spec**: Tạo spec chi tiết cho Phase 1
3. **Database Migration**: Tạo migration scripts cho indexes
4. **Implementation**: Bắt đầu với Sprint 1
5. **Testing**: Load testing với production-like data
6. **Deployment**: Gradual rollout với monitoring

---

**Estimated Timeline**: 6 weeks
**Team Size**: 1-2 developers
**Priority**: High (affecting user experience)
