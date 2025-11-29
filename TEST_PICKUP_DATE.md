# Test Plan: pickupDate Field Implementation

## Manual Testing Steps

### 1. Test Create Trip Group
**Scenario**: Create a new trip group with trips

**Steps**:
1. Create a trip group with tripIds: "1,2,3"
2. Verify the response includes `pickupDate`
3. Verify `pickupDate` equals the earliest pickup date from trips 1, 2, 3

**Expected Result**: 
- Response contains `pickupDate` field
- `pickupDate` is in format `yyyy-MM-dd`
- Value matches the earliest trip's pickup date

**API Call**:
```bash
curl -X POST http://localhost:8080/api/trip-groups \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Group",
    "tripIds": "1,2,3",
    "status": "DANG_GHEP",
    "totalPassengers": 10,
    "totalRevenue": 500000
  }'
```

### 2. Test Update Trip Group
**Scenario**: Update trip group with different tripIds

**Steps**:
1. Update an existing trip group with new tripIds
2. Verify `pickupDate` is recalculated

**Expected Result**: 
- `pickupDate` updates to reflect the new earliest date

**API Call**:
```bash
curl -X PUT http://localhost:8080/api/trip-groups/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Group",
    "tripIds": "4,5,6",
    "status": "DANG_GHEP",
    "totalPassengers": 15,
    "totalRevenue": 750000
  }'
```

### 3. Test Add Trip to Group
**Scenario**: Add a trip with earlier pickup date to existing group

**Steps**:
1. Get current group's `pickupDate`
2. Add a trip with earlier pickup date
3. Verify `pickupDate` updates to the earlier date

**Expected Result**: 
- `pickupDate` updates to the new earliest date

**API Call**:
```bash
curl -X POST http://localhost:8080/api/trip-groups/{groupId}/trips/{tripId}
```

### 4. Test Remove Trip from Group
**Scenario**: Remove the trip with earliest pickup date

**Steps**:
1. Identify which trip has the earliest pickup date
2. Remove that trip from the group
3. Verify `pickupDate` updates to the next earliest date

**Expected Result**: 
- `pickupDate` recalculates from remaining trips

**API Call**:
```bash
curl -X DELETE http://localhost:8080/api/trip-groups/{groupId}/trips/{tripId}
```

### 5. Test Search by Date
**Scenario**: Filter trip groups by pickup date

**Steps**:
1. Create multiple trip groups with different pickup dates
2. Search for groups with specific date
3. Verify only groups with matching `pickupDate` are returned

**Expected Result**: 
- Only groups with matching date are returned
- Query is fast (database-level filtering)

**API Call**:
```bash
# Search by date only
curl "http://localhost:8080/api/trip-groups?date=2024-12-01"

# Search by status and date
curl "http://localhost:8080/api/trip-groups?status=DANG_GHEP&date=2024-12-01"
```

### 6. Test Data Migration
**Scenario**: Populate pickupDate for existing records

**Steps**:
1. Check existing trip groups without `pickupDate`
2. Login as admin to get JWT token
3. Call migration endpoint with authentication
4. Verify all groups now have `pickupDate`

**Expected Result**: 
- All existing groups with trips have `pickupDate` populated
- Response shows count of updated records

**API Call**:
```bash
# Using the migration script
./migrate-pickup-date.sh

# Or manually with curl
TOKEN=$(curl -s -X POST http://localhost:8080/transport-service/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

curl -X POST http://localhost:8080/transport-service/admin/migration/populate-pickup-dates \
  -H "Authorization: Bearer $TOKEN"
```

## Database Verification

### Check pickupDate values
```sql
SELECT 
    id, 
    name, 
    pickup_date, 
    trip_ids,
    created_at
FROM trip_groups
ORDER BY pickup_date DESC;
```

### Verify pickupDate matches earliest trip
```sql
SELECT 
    tg.id,
    tg.name,
    tg.pickup_date,
    MIN(t.pickup_time) as earliest_trip_pickup
FROM trip_groups tg
LEFT JOIN trips t ON FIND_IN_SET(t.id, REPLACE(tg.trip_ids, ',', ','))
GROUP BY tg.id, tg.name, tg.pickup_date
HAVING tg.pickup_date != DATE(earliest_trip_pickup);
```

### Check for NULL pickupDate
```sql
SELECT id, name, trip_ids
FROM trip_groups
WHERE pickup_date IS NULL AND trip_ids IS NOT NULL AND trip_ids != '';
```

## Frontend Verification

### Check TripGroup interface
1. Open browser DevTools
2. Fetch trip groups
3. Verify response includes `pickupDate` field

**Console Test**:
```javascript
// In browser console
fetch('/api/trip-groups')
  .then(r => r.json())
  .then(data => {
    console.log('First group:', data.content[0]);
    console.log('Has pickupDate:', 'pickupDate' in data.content[0]);
  });
```

## Performance Testing

### Before vs After Comparison

**Test Query**: Get all groups for a specific date

**Before** (in-memory filtering):
```
Time: ~500ms for 1000 records
```

**After** (database filtering):
```
Time: ~50ms for 1000 records
```

**Measurement**:
```bash
# Measure response time
time curl "http://localhost:8080/api/trip-groups?date=2024-12-01"
```

## Edge Cases to Test

1. **Empty trip group**: Group with no trips → `pickupDate` should be NULL
2. **Single trip**: Group with one trip → `pickupDate` equals that trip's date
3. **All trips same date**: Multiple trips with same pickup date → `pickupDate` equals that date
4. **Invalid tripIds**: Group with invalid trip IDs → should handle gracefully
5. **Deleted trips**: Group referencing deleted trips → should handle gracefully

## Success Criteria

- ✅ All CRUD operations correctly maintain `pickupDate`
- ✅ Date filtering queries use database-level filtering
- ✅ Performance improvement is measurable
- ✅ No errors in application logs
- ✅ Frontend correctly displays/uses `pickupDate`
- ✅ Existing data successfully migrated
