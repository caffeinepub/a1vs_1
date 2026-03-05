# A1VS - Points 15-18 Updates

## Current State
- Order type has: deliverySignature, invoiceNumber, status, timestamp fields
- markOrderDeliveredWithSignature sets status=delivered and invoiceNumber
- updateOrderStatusRider updates status only
- Admin Dashboard has 10 stat cards (no revenue-till-today, no pending-due, no avg delivery time)
- Orders in admin show status/PO number with no delivery timing info
- Invoice PDF uses order.timestamp for the date; no "signed at" timestamp exists

## Requested Changes (Diff)

### Add
- `deliverySignedAt: ?Time` field to Order — set to Time.now() when markOrderDeliveredWithSignature is called (the exact moment signature is submitted)
- `deliveryStartTime: ?Time` field to Order — set to Time.now() when status is changed to "on_the_way"
- `deliveryEndTime: ?Time` field to Order — set to Time.now() when status is changed to "delivered"
- New backend function `updateOrderStatusWithTimestamp` that sets deliveryStartTime on "on_the_way" and deliveryEndTime on "delivered"
- Admin Dashboard: two new stat cards: "Revenue Till Today" (sum of delivered + accepted order totals) and "Pending Due Amount" (total debit minus total credit across all statements)
- Admin Dashboard: one new stat card "Avg Delivery Time" (avg of deliveryEndTime - deliveryStartTime for all delivered orders with both timestamps)
- Invoice PDF: below customer signature box, show "Received Date & Time: <deliverySignedAt formatted>" — only when deliverySignedAt is present
- Admin Orders: each delivered order row shows total delivery duration (e.g. "42 mins" or "1 hr 12 mins")

### Modify
- markOrderDeliveredWithSignature: also set deliverySignedAt = Time.now()
- updateOrderStatusRider and updateOrderStatus: when setting "on_the_way", also set deliveryStartTime; when "delivered", also set deliveryEndTime
- Order type in Motoko: add deliverySignedAt, deliveryStartTime, deliveryEndTime optional fields
- Order type in backend.d.ts: add deliverySignedAt, deliveryStartTime, deliveryEndTime optional bigint fields
- pdfUtils drawTotalAndSignatures: render deliverySignedAt timestamp below customer signature when present
- Admin Dashboard: add 3 new stat cards (revenue-till-today, pending-due, avg-delivery-time) and query payments for pending-due calculation

### Remove
- Nothing removed

## Implementation Plan
1. Update Motoko Order type to add deliverySignedAt, deliveryStartTime, deliveryEndTime (?Time each)
2. Update all Order construction/update sites in Motoko to carry the new fields (preserving existing values)
3. Update markOrderDeliveredWithSignature to set deliverySignedAt = Time.now() and deliveryEndTime = Time.now()
4. Update updateOrderStatus and updateOrderStatusRider: set deliveryStartTime on "on_the_way", deliveryEndTime on "delivered"
5. Update backend.d.ts with new Order fields
6. Update pdfUtils.ts to render signature date/time on invoice PDF
7. Update Admin Dashboard to add 3 new stat cards (revenue-till-today fetches payments, pending-due, avg delivery time)
8. Update Admin Orders rows to show delivery duration for delivered orders
