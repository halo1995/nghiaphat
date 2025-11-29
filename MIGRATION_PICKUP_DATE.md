# Migration Guide: Adding pickupDate to TripGroup

## Overview
This migration adds a `pickup_date` field to the `trip_groups` table to optimize date filtering queries. The field stores the earliest pickup date from all trips in the group.

## Changes Made

### Backend Changes

#### 1. Database Schema
- **File**: `xeghepBE/src/main/resources/db/migration/V10__add_pickup_date_to_trip_groups.sql`
- **Change**: Added `pickup_date DATE` column to `trip_groups` table
- **Status**: ✅ Created

#### 2. Entity Layer
- **File**: `xeghepBE/src/main/java/com/brostech/transport/jpa/entity/TripGroup.java`
- **Change**: Field `pickupDate` already exists
- **Status**: ✅ Already present

#### 3. Repository Layer
- **File**: `xeghepBE/src/main/java/com/brostech/transport/jpa/repository/TripGroupRepository.java`
- **Changes**: 
  - `findByPickupDate(LocalDate, Pageable)` - already exists
  - `findByStatusAndPickupDate(GroupStatus, LocalDate, Pageable)` - already exists
- **Status**: ✅ Already present

#### 4. Service Layer
- **File**: `xeghepBE/src/main/java/com/brostech/transport/service/impl/TripGroupServiceImpl.java`
- **Changes**:
  - ✅ Added `calculatePickupDate()` helper method
  - ✅ Updated `create()` to set pickupDate
  - ✅ Updated `update()` to recalculate pickupDate when tripIds change
  - ✅ Updated `addTrip()` to update pickupDate
  - ✅ Updated `removeTrip()` to recalculate pickupDate
  - ✅ Updated `toDTO()` to include pickupDate
  - ✅ Updated `search()` to use pickupDate for filtering (already implemented)
- **Status**: ✅ Completed

#### 5. DTO Layer
- **File**: `xeghepBE/src/main/java/com/brostech/transport/dto/trip/TripGroupDTO.java`
- **Change**: Field `pickupDate` already exists
- **Status**: ✅ Already present

#### 6. Data Migration Controller
- **File**: `xeghepBE/src/main/java/com/brostech/transport/controller/DataMigrationController.java`
- **Change**: Created endpoint to populate pickupDate for existing records
- **Status**: ✅ Created

### Frontend Changes

#### 1. Type Definitions
- **File**: `xeghepFE/src/data/trips.ts`
- **Changes**:
  - ✅ Added `pickupDate?: string` to `TripGroup` interface
  - ✅ Updated `mapTripGroupResponse()` to include pickupDate
- **Status**: ✅ Completed

## Migration Steps

### Step 1: Deploy Backend Changes
1. Build the backend application
2. The Flyway migration will automatically run and add the `pickup_date` column

### Step 2: Populate Existing Data
After deployment, call the migration endpoint to populate pickupDate for existing trip groups.

**Option 1: Using the migration script (Recommended)**
```bash
# Set environment variables
export API_URL=http://localhost:8080
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=your_admin_password

# Run the script
./migrate-pickup-date.sh
```

**Option 2: Manual curl with authentication**
```bash
# Step 1: Login to get JWT token
TOKEN=$(curl -s -X POST http://localhost:8080/transport-service/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Step 2: Call migration endpoint
curl -X POST http://localhost:8080/transport-service/admin/migration/populate-pickup-dates \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:
```
Successfully populated pickup_date for X trip groups
```

**Note**: This endpoint requires ADMIN role for security.

### Step 3: Verify Data
Check that existing trip groups now have pickupDate populated:

```sql
SELECT id, name, pickup_date, trip_ids FROM trip_groups WHERE pickup_date IS NOT NULL;
```

### Step 4: Deploy Frontend Changes
Deploy the updated frontend with the new pickupDate field support.

## Testing Checklist

### Backend Tests
- [ ] Create new trip group → verify pickupDate is set correctly
- [ ] Add trip to group → verify pickupDate updates if new trip has earlier date
- [ ] Remove trip from group → verify pickupDate recalculates from remaining trips
- [ ] Update trip group with new tripIds → verify pickupDate recalculates
- [ ] Query groups by date → verify results are correct and performant
- [ ] Query groups by status and date → verify filtering works correctly

### Frontend Tests
- [ ] Fetch trip groups → verify pickupDate is included in response
- [ ] Display trip group details → verify pickupDate is shown (if UI displays it)
- [ ] Filter by date → verify filtering works correctly

## Performance Impact

### Before
- Date filtering required in-memory filtering after fetching all records
- Query: `SELECT * FROM trip_groups WHERE status = ?` + in-memory date filter

### After
- Date filtering happens at database level
- Query: `SELECT * FROM trip_groups WHERE status = ? AND pickup_date = ?`
- Significant performance improvement for date-based queries

## Rollback Plan

If issues occur, you can rollback the migration:

```sql
ALTER TABLE trip_groups DROP COLUMN pickup_date;
```

Then revert the code changes and redeploy.

## Notes

- The `pickup_date` column is nullable to allow for trip groups without trips
- The field is automatically maintained by the application when trips are added/removed
- Existing records will have NULL initially until the migration endpoint is called
- After migration, all new groups will have pickupDate automatically set
