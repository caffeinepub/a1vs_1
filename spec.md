# A1VS

## Current State
A full vegetable/fruit ordering platform with Admin Portal, Customer Portal, and Rider Portal. The backend has all required APIs (products, customers, orders, payments, riders, statements, dashboard stats) but uses non-stable in-memory Maps. This means all data (products, customers, orders, payments, riders, sessions) is wiped every time a new build is deployed. The admin Products page shows "0 products" because the backend data was reset on the last deployment.

## Requested Changes (Diff)

### Add
- Stable variable storage for all backend data so it persists across canister upgrades
- `preupgrade` / `postupgrade` system hooks to serialize/deserialize all Maps to stable arrays
- All counters (productIdCounter, orderIdCounter, paymentIdCounter) must also be stable

### Modify
- All state declarations: `products`, `customers`, `orders`, `users`, `subUsers`, `payments`, `riderAssignments`, `riderProfiles`, `companyProfile`, `passwordHash`, `webhookUrl` -- converted to stable-backed storage
- On initialization, Maps are loaded from stable arrays
- On `preupgrade`, all Maps are serialized back to stable arrays
- `changeAdminPassword` must update stable variable
- `setCompanyProfile` must update stable variable
- `setWebhookUrl` must update stable variable

### Remove
- Nothing removed from existing functionality

## Implementation Plan
1. Add stable variable declarations for every data map as arrays of tuples
2. Initialize Maps using `Map.fromIter()` from those stable arrays on actor startup
3. Add `preupgrade` system function that saves all Maps back to stable arrays
4. Add `postupgrade` system function (no-op, data loaded at init)
5. Ensure all counter increments also update stable counter variables
6. Keep all existing API functions identical -- no breaking changes to backend.d.ts
