# A1VS

## Current State

Full-stack vegetable ordering platform with Admin Portal, Customer Portal, and Rider Portal. Backend uses Motoko with orders, products, customers, payments, sub-users, rider assignments, and session management. Frontend uses React + TypeScript + Tailwind + shadcn/ui.

Existing features: product/customer management, order placement with COD/Pay Later, PO-to-invoice workflow, admin order deletion with note, PDF invoice/statement generation, customer statement, company statement, payment feed with edit, sub-user roles (admin/manager/accounts/rider), rider assignment and portal, rider delivery status updates, customer signature on delivery.

## Requested Changes (Diff)

### Add

1. **Rider: PO/order item details in rider dashboard** - Each active order card must show the full product list (item name, qty, unit, rate) in a collapsible section so the rider knows what they're delivering.

2. **Rider: Browser/phone Web Notification popup** - On new order assignment, trigger `Notification` API popup (not just toast). Request permission on login. Poll every 15s; when new orders appear, fire both a `new Notification(...)` and the existing toast+sound. This gives a system-level popup on mobile browsers.

3. **Rider: Google Maps navigate button** - On each active order card, add a "Navigate" button that opens `https://maps.google.com/?q=<encoded address>` in a new tab. No API key needed.

4. **Rider/Invoice: Customer signature embedded in invoice PDF** - The signature captured at delivery is currently saved in component state only. It needs to be persisted into the backend (stored as a text field `deliverySignature` on the Order type). When generating the invoice PDF, if a signature data URL exists on the order, render it as an image in the PDF below the items table. The signature must appear in invoices shown to admin, customer, and rider.

5. **Invoice header fix: PO → Invoice on delivery** - Currently the document header shows "PO" even after delivery in some views. Fix: wherever an order with `status === "delivered"` AND `invoiceNumber` is displayed, always show "INVOICE" + invoice number. In the Orders list (admin), the row badge/label must change from "PO" to "Invoice" once delivered. In the rider history tab, show "INV#" if available. In the customer My Orders view, delivered orders must be labeled "Invoice" not "PO".

6. **Admin Accounts > Payment Feed: Delete payment** - Add a Delete button (admin-only, shown only when `a1vs_admin_token` is set) on each payment entry in the Recent Payments list. Clicking opens a confirmation dialog with a mandatory reason/comment text area. On confirm, calls a new backend API `deletePayment(token, paymentId, reason)` which soft-deletes the payment (sets a `deleted: Bool` and `deleteReason: Text` field). Deleted payments stay visible in the list with a red "Deleted" badge and the reason shown. They must be excluded from statement calculations (balance totals).

### Modify

- **Order type in backend**: Add `deliverySignature: ?Text` field to store the base64 PNG of the customer's signature.
- **Payment type in backend**: Add `deleted: Bool` and `deleteReason: ?Text` fields for soft-delete.
- **backend API `markDelivered` / `updateOrderStatusRider`**: When marking delivered, also accept and store the `deliverySignature` data URL. Add new `markOrderDeliveredWithSignature(token, orderId, signatureData)` endpoint that sets status to "delivered", generates invoice number, and saves the signature.
- **Statement calculations** (both `getCustomerStatement` and `getCompanyStatement`): Filter out payments where `deleted == true`.
- **`getMyStatement`**: Same filter for deleted payments.
- **Rider `ActiveOrderCard`**: Add collapsible product list section; add Google Maps navigate button.
- **Admin `Orders.tsx`**: Fix all PO/Invoice label logic to use `invoiceNumber` properly.
- **Customer My Orders page**: Fix "PO" → "Invoice" label for delivered orders.
- **PDF invoice**: Add signature image section if `order.deliverySignature` is present.
- **Rider delivery confirm**: Call `markOrderDeliveredWithSignature` instead of `updateOrderStatusRider` to persist the signature.
- **`Accounts.tsx` PaymentFeedTab**: Add Delete button + dialog to each payment row; exclude deleted payments from display totals.

### Remove

- Nothing removed.

## Implementation Plan

1. **Backend (Motoko)**:
   - Add `deliverySignature: ?Text` to `Order` type and all Order construction/update sites.
   - Add `deleted: Bool` and `deleteReason: ?Text` to `Payment` type and all Payment construction sites (default `deleted = false`, `deleteReason = null`).
   - Add `deletePayment(token, paymentId, reason)` API: admin-only, soft-deletes payment.
   - Add `markOrderDeliveredWithSignature(token, orderId, signatureData)` API: sets status="delivered", sets invoiceNumber = "INV-" + orderId, stores signature.
   - Filter `deleted == true` payments from all statement queries.

2. **Frontend - Rider Dashboard**:
   - Add collapsible product list panel to each `ActiveOrderCard`.
   - Add "Navigate" button that opens Google Maps with encoded address.
   - Call `markOrderDeliveredWithSignature` (passing signature data) instead of `updateOrderStatusRider` on delivery.
   - Ensure Web Notifications are requested on mount and fired when new orders arrive.

3. **Frontend - Admin Orders**:
   - Fix all PO/Invoice labels: if `order.invoiceNumber` exists, show "INVOICE / INV#"; else "PO / PO#".
   - Invoice PDF download button always visible for delivered orders.
   - Direct print button for invoice from admin.

4. **Frontend - Customer My Orders**:
   - Delivered orders labeled "Invoice" with invoice number.
   - Invoice PDF available for delivered orders.

5. **Frontend - Accounts Payment Feed**:
   - Add Delete button (admin-only) on each payment entry.
   - Delete dialog with mandatory reason text area.
   - Deleted payments shown with "Deleted" badge + reason, but excluded from any totals.
   - Call `deletePayment` backend API.

6. **Frontend - PDF Utils**:
   - If `order.deliverySignature` is present, render it as an image in the invoice PDF after the items table.
