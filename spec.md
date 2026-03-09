# A1VS - Rebuild to Version 22 Working State

## Current State
The app has been through many iterations. The backend (main.mo) has stable memory with preupgrade/postupgrade hooks and all features. The frontend .old/ directory contains the last confirmed-working code. The current src/frontend/src/ matches .old/ in structure but the Products page and login have been through multiple broken iterations.

The core issue: products always show as 0 because the frontend race-conditions reads before backend writes, or the "Load 100 Default Products" button approach is unreliable.

## Requested Changes (Diff)

### Add
- New Products page approach: 3 action buttons at top (Add New Product, Upload Bulk Products, Download All Products)
- "Add New Product" dialog: Name, Unit (Each/Kgs), Rate, optional image upload, Active/Inactive toggle
- "Upload Bulk Products": CSV/Excel upload with name-based deduplication (update if name matches, add if new)
- "Download All Products": downloads all products (active + inactive) as Excel
- Product search bar: single name or comma-separated names to filter product list
- Per-product image upload button in product list
- Per-product Active/Inactive toggle inline
- Per-product Edit button
- All products load directly from backend on page open (no "Load Default" button)

### Modify
- Products.tsx: completely rewritten with the 3-button approach, search, inline editing
- Login flow: keep existing .old version which has proper retry logic and back button
- All other pages: restore from .old/ working state

### Remove
- "Load 100 Default Products" button -- replaced by Add New and Bulk Upload
- All race-condition-prone mutation patterns that show false success then empty list

## Implementation Plan
1. Copy all .old frontend files to src/frontend/src
2. Rewrite Products.tsx with the new 3-button product management UI
3. Ensure products page fetches from backend and renders the real list
4. Validate, build, deploy
