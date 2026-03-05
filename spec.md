# A1VS

## Current State
Full-stack vegetable ordering platform with Admin Portal, Customer Portal, and Rider Portal.

- **Backend**: Product type has `id, name, active, unit, rate` (no image field). Payment type has `paymentId, storeNumber, companyName, amount, paymentMethod, chequeDetails, utrDetails, timestamp, deleted, deleteReason` (no image field).
- **Admin Products page**: Table with Name, Unit, Rate, Status, Toggle. Download template and upload Excel. No image column.
- **Customer Order page (OrderPage.tsx)**: Opens a Dialog modal when user clicks "Add Item". Modal shows a list/scrollable product list (~10 visible at once in a ScrollArea). No product images. Products shown as text list rows, not a grid.
- **Rider Dashboard**: Polls for assigned orders. Plays phone ring alert (via audioUtils). Alert rings once when new order detected but does NOT loop continuously until accepted/rejected.
- **Payment Feed (Accounts.tsx)**: Record Payment form with customer, amount, method, cheque/UTR fields. No image upload option. Recent Payments list on the right.

## Requested Changes (Diff)

### Add
1. **Backend: `imageBase64` field to `Product` type** -- stores a base64-encoded image string per product. Add `updateProductImage(token, productId, imageBase64)` API. Add `imageBase64` to `ProductInput` (optional, defaults to "").
2. **Backend: `paymentAdviceImage` field to `Payment` type** -- stores a base64 image of the payment advice slip. Update `recordPayment` and `editPayment` to accept an optional image.
3. **Admin Products page: Image upload column** -- Each product row gets an image upload button (last column). Clicking opens a file picker (PNG/JPG/JPEG). On selection, the image is converted to base64 and saved via `updateProductImage`. Shows a small thumbnail if image exists.
4. **Customer Order page: Full product grid** -- Replace the Dialog/modal list with a full-screen/full-page panel showing all 100+ products in a grid (3-4 columns on desktop, 2 on mobile). Each card shows: product image (or placeholder icon), product name, unit + rate, a qty number input, and an "Add" button. A sticky search bar at the top filters by name. Scrollable. Replaces the current modal approach entirely.
5. **Payment Feed: Payment advice image upload** -- In the Record Payment form and Edit Payment dialog, add an image upload field (PNG/JPG/JPEG). Stored as base64. In the Recent Payments list, if an image is attached, show a small clickable thumbnail that opens the full image in a lightbox dialog.
6. **Rider notification: looping ring until action** -- When rider detects a new assigned order, the audio alert loops continuously. It stops ONLY when the rider clicks "Accept" or "Reject" on that order. Show a persistent banner/alert at the top of the rider dashboard while unacknowledged orders exist.

### Modify
- `replaceProductsWithDetails` -- accept `imageBase64` as an optional field in `ProductInput` (default to "").
- `getActiveProducts` / `getAllProducts` -- return products with `imageBase64` field.
- Download template -- add an `Image` note column in the Excel (informational only, not imported).
- Admin Product list -- add "Image" column header; show thumbnail or upload button.
- Customer Order page -- completely replace modal with inline full product grid view.
- Rider alert logic -- change from single-fire to looping ring that stops on accept/reject.
- Payment feed -- add `paymentAdviceImage` to record and edit flows.

### Remove
- The small Dialog-based product selection modal in OrderPage.tsx (replaced by the inline product grid).

## Implementation Plan
1. **Backend**: Add `imageBase64: Text` to `Product` type and `ProductInput`. Add `paymentAdviceImage: Text` to `Payment` type. Add `updateProductImage(token, productId, imageBase64)` public shared function. Update `recordPayment` and `editPayment` to accept optional `paymentAdviceImage`. Rebuild `backend.d.ts` bindings.
2. **Admin Products (frontend)**: Add image column to product table. Small upload button per row. On file pick, read as base64, call `updateProductImage`. Show 32x32 thumbnail if `imageBase64` non-empty.
3. **Customer OrderPage (frontend)**: Remove Dialog modal. Add a state `showProductGrid` (boolean). When user clicks "Add Item", set `showProductGrid=true`, showing the full product grid panel (replaces cart view temporarily). Grid cards: image/placeholder, name, unit+rate, qty input, Add button. Search bar sticky at top. "Back to Cart" button to return. Adding an item returns to cart view.
4. **Rider Dashboard (frontend)**: Change alert logic. Track `ringIntervalRef`. When new orders detected, start looping `playPhoneRing` on interval. Stop interval only when rider acts on all new orders (accepts or rejects). Show a pulsing top banner: "New order assigned -- tap to view".
5. **Payment Feed (frontend)**: Add image upload input to Record Payment form and Edit Payment dialog. Convert to base64 on select. Show thumbnail in recent payments list. Clicking thumbnail opens full-size image dialog.
