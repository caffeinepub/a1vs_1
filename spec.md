# A1VS

## Current State
The backend uses `Map.empty<>()` (transient heap maps) for all data stores including products, customers, orders, payments, sessions, riders, and company profile. These maps are cleared on every canister redeployment, causing all data (especially products) to be lost after each version update.

## Requested Changes (Diff)

### Add
- Stable storage backing for all data maps using `stable var` arrays
- `preupgrade` / `postupgrade` system hooks to serialize/deserialize all maps to/from stable arrays

### Modify
- All map declarations converted from `let x = Map.empty<>()` to stable-backed pattern
- `productIdCounter`, `orderIdCounter`, `paymentIdCounter`, `passwordHash`, `webhookUrl`, `companyProfile` all made `stable var`
- Frontend Products.tsx empty state: remove the "re-load after update" warning message, replace with a simple first-time setup message

### Remove
- Auto-load on empty products (no longer needed since products persist)
- The confusing amber warning box about re-loading after system updates

## Implementation Plan
1. Rewrite `main.mo` to use stable arrays + preupgrade/postupgrade hooks for all state
2. Update `Products.tsx` empty state to say "No products yet - click Load 100 Default Products to get started" (one-time setup, no re-load warning)
3. Remove the auto-load useEffect from Products.tsx (products now persist, so auto-loading defaults silently would be wrong)
