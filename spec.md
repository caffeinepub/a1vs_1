# A1VS

## Current State
- Full-stack vegetable ordering platform with Admin Portal, Customer Portal, and Rider Portal.
- Backend (Motoko): orders, customers, products, payments, rider assignments, sub-user roles, sessions.
- Frontend: React + TypeScript + Tailwind + jsPDF for PDF generation.
- `pdfUtils.ts` generates PO/Invoice PDFs with a basic single-page layout. No A4 enforcement, no amount-in-words, no proper multi-page support, no company address footer, no signature section split.
- `Dashboard.tsx`: shows 4 stat cards (Total Orders, Total Customers, Total Products, Today's Orders) and a Recent Orders table that includes deleted orders.
- `AdminProfile.tsx`: only has Change Password. No company details (GST, contact, email, address, logo).
- Backend has no `CompanyProfile` type, no functions to get/set company profile.

## Requested Changes (Diff)

### Add
- Backend: `CompanyProfile` type with fields: gstNumber, contactPhone, contactEmail, address, logoBase64 (stored as Text).
- Backend: `getCompanyProfile()` (public, no auth) and `setCompanyProfile(token, profile)` (admin-only) functions.
- Backend: `backend.d.ts` updates for the new type and functions.
- Frontend: `AdminProfile.tsx` -- new "Company Details" section with form fields for GST No., Company Contact, Company Email, Company Address, and a logo upload (any image format, stored as base64). Save button calls `setCompanyProfile`.
- Frontend: `pdfUtils.ts` -- fully rewritten A4-compliant PDF generator:
  - Page size locked to A4 (210mm x 297mm).
  - Header: logo image (from company profile) on the left, document title + number + date on the right.
  - Company name and address below logo in header.
  - Bill To section with customer details.
  - Items table fills the full page width (170mm usable).
  - Multi-page support: header and footer repeat on every page via jsPDF-autotable `didDrawPage` hook.
  - After all items: Total amount box (right-aligned), followed by "Amount in Words: Rupees [words] Only" on the next line.
  - Signature section: Customer Signature (left) and "For A-One Vegetables & Suppliers" (right), with signature image embedded if available.
  - Footer on every page: company address from company profile (center), page number (right).
- Frontend: `Dashboard.tsx` -- expand stats to 10 cards: Total Orders, Total Customers, Total Products, Today's Orders, Total Revenue Today, Total Average Cart, Total Orders Placed Today, Total Orders Delivered Today, Total Rejected Orders Today, All Time Rejected Orders.
- Frontend: `Dashboard.tsx` -- Recent Orders table: filter out deleted orders, show only ongoing/live/delivered; delivered rows have green background/text.

### Modify
- `AdminProfile.tsx`: add Company Details card alongside existing Change Password card.
- `pdfUtils.ts`: full rewrite for A4, multi-page, amount in words, proper signature section, footer with address.
- `Dashboard.tsx`: update stats grid and recent orders filter.

### Remove
- Nothing removed.

## Implementation Plan
1. Add `CompanyProfile` type + `getCompanyProfile`/`setCompanyProfile` to `main.mo` backend.
2. Update `backend.d.ts` with `CompanyProfile` interface and new method signatures.
3. Rewrite `pdfUtils.ts`:
   - Helper function `amountToWords(amount: number): string` to convert numeric amount to Indian rupees words.
   - `buildInvoicePDF(order, companyProfile, print)` unified function used by both download and print flows.
   - A4 page dimensions, full-width table, `didDrawPage` for repeating header/footer.
   - Total + amount-in-words block after table.
   - Dual signature block (customer left, company right).
   - Footer with company address on every page.
4. Update `AdminProfile.tsx`:
   - Fetch current company profile on mount.
   - Form fields: GST No., Company Contact, Company Email, Company Address.
   - Logo upload input (accept image/*), preview, store as base64.
   - Save button calls `setCompanyProfile`.
5. Update `Dashboard.tsx`:
   - Add 6 new stat cards computed from orders data.
   - Recent orders: filter `status !== "deleted"`, highlight delivered rows in green.
6. Update all callers of `generateInvoicePDF` / `generateInvoicePDFAndPrint` to fetch and pass the company profile before generating the PDF.
