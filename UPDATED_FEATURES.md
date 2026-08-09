# StockPro update — 9 Aug 2026

## This revision

- Stock In Receipt Total is now a large blue summary, matching the Stock Out final-price treatment.
- New Invoice is now a true multi-product sale flow:
  - free-text Customer / Buyer (no required dropdown)
  - Main Product -> Sub Product selection on every line
  - quantity-based normal/bulk pricing uses the same logic as Stock Out
  - each line shows normal price, final rate, quantity and line total
  - large blue final invoice total
  - one invoice can contain multiple products
  - creating the invoice creates one Stock Out DB record per product line and reduces each product's stock
  - all generated sale rows share the same invoice number and appear in Stock Card — Sales History
- Deleting one sale line from a multi-product invoice restores only that line's stock and recalculates the remaining invoice.
- Invoice keeps a customer-name snapshot and renders main product, sub product and category details.
- Reports runtime error fixed by safe defaults and dashboard API report data (`categoryBreakdown`, `recentMovements`, `lowStockProducts`).
- Categories now show both Main Product and Sub Product counts.
- Categories support inline rename/edit.
- Category View Products route now exists and shows main product, sub product, stock and prices with product edit links.
- Product Add/Edit no longer exposes stock quantity. Stock quantity is controlled through Stock In / Stock Out only.
- Shared numbered pagination component added (Previous, 1 2 3 …, Next) and applied to Products, Categories, Category Products, Stock In, Stock Out and Invoices.
- Invoice list actions use compact icons.
- Stock Card — Sales History continues to use the MongoDB `StockOut` collection; invoice multi-line sales are persisted there as separate rows.

## Pricing rule

Product setup stores the normal selling price and optional quantity price tier. Stock Out and Invoice both calculate the rate this way:

1. Start with `selling_price`.
2. If quantity matches a pricing tier, use the tier `price` (or percentage discount).
3. Final line total = quantity × calculated rate.

Stock In is separate: its cost is the actual purchase cost for that receiving transaction. Receipt Total = quantity × stock-in cost.

## Build note

The code was updated without changing package versions. The sandbox package mirror currently returns HTTP 404 for `zod-validation-error-4.0.2.tgz`, so a full `npm ci` / `next build` cannot complete in this environment. Run `npm install` and `npm run dev` on your normal machine/registry.
