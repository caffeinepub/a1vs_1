# A1VS - Aone Vegetables & Supplier

## Current State
- Admin portal with sidebar navigation: Dashboard, Products, Customers, Orders/PO, Accounts, Users, Settings, Profile
- Customer portal is a simple multi-page app (login → order → orders history → statement)
- Customer statement page exists and calls `actor.getMyStatement(token, from, to)` but throws "access denied" errors
- Admin Customers page shows a read-only table of customers with only upload/download template
- PDF download button exists on CustomerStatement but `generateStatementPDF` utility is already in place
- Customer portal lacks a proper dashboard/home layout after login

## Requested Changes (Diff)

### Add
- Customer Portal: Full dashboard layout after login (mirroring admin sidebar/layout style) with:
  - Sidebar or bottom nav with sections: Dashboard, My Orders, Place New Order, My Statement
  - Dashboard home page showing: recent order status cards with order tracking roadmap (Order Placed → Accepted → On the Way → Delivered), quick action buttons
  - Slider/cards for COD orders vs Pay Later orders overview
  - My Orders page (already exists, move there)
  - My Statement page (already exists, move there)
  - Place New Order navigates to /order
- Admin Customers page: Edit functionality - inline edit or edit modal for each customer row (all fields: Store Number, Name, Phone, Company Name, Address, GST Number, Email, Password). Save updates using `replaceCustomers` after modifying the list.

### Modify
- Fix "access denied" error on Customer Statement: The `getMyStatement` call is correct. The issue is likely the token stored as `a1vs_customer_token` vs `a1vs_admin_token`. Ensure the customer token is being passed correctly and that the backend call uses the right localStorage key. Add better error handling and display a clear error message.
- Customer Statement PDF: Already has a Download PDF button, but make sure it's always visible after loading (currently conditional on entries.length > 0, which is correct). Verify `generateStatementPDF` is working properly.
- Customer portal routing: After login (from StoreSelectorPage), redirect to `/customer/dashboard` instead of `/order`. The StoreSelectorPage should show the navigation cards pointing to the new dashboard, orders, statement sections.

### Remove
- Nothing to remove

## Implementation Plan
1. Create a new `CustomerLayout.tsx` with a sidebar (desktop) + bottom navigation (mobile) similar to AdminLayout, with nav items: Dashboard, Place New Order, My Orders, My Statement, Logout
2. Create `CustomerDashboard.tsx` page showing:
   - Welcome card with store info
   - Recent orders (last 5) with status tracking roadmap visual (stepper: Placed → Accepted → On the Way → Delivered)
   - Order summary cards: COD orders count/total vs Pay Later orders count/total
   - Quick action buttons: Place New Order, View All Orders, View Statement
3. Create `/customer/dashboard` route in App.tsx, protect it with customer token check
4. Update `StoreSelectorPage.tsx`: after login, redirect to `/customer/dashboard`; if already logged in, show nav to dashboard
5. Update `Customers.tsx` admin page: Add an Edit button per row that opens an inline edit form or modal. On save, update the customer in the local list and call `replaceCustomers(token, updatedList)`. Fields: Store Number, Name, Phone, Company Name, Address, GST Number, Email, Password.
6. Fix CustomerStatement access denied: Ensure token is read from `a1vs_customer_token` (it already is). Add try/catch with toast.error showing the actual message. Also check that actor is ready before calling.
7. Wrap CustomerOrders, CustomerStatement, and new CustomerDashboard inside CustomerLayout

## UX Notes
- Customer layout should use light colors (white sidebar, green accents) matching the admin portal style
- The order tracking roadmap should be a horizontal stepper showing current status highlighted
- COD vs Pay Later should be shown as two summary cards with counts and totals
- Edit customer modal in admin should be a dialog with all fields pre-filled, validation before save
- PDF download button for statement should be clearly labeled "Download PDF" and always shown after loading entries
