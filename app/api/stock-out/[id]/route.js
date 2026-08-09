import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StockOut, Product, Invoice, Notification } from "@/models";

export async function DELETE(request, { params }) {
  await connectDB();
  const { id } = await params;
  try {
    const entry = await StockOut.findById(id);
    if (!entry) return NextResponse.json({ error: "Stock-out entry not found." }, { status: 404 });
    const product = await Product.findById(entry.product_id);
    if (product) { product.stock_qty = Number(product.stock_qty || 0) + Number(entry.quantity || 0); await product.save(); }

    if (entry.invoice_no) {
      const invoice = await Invoice.findOne({ invoice_no: entry.invoice_no });
      if (invoice) {
        const items = [...(invoice.items || [])];
        let removeIndex = Number.isInteger(entry.invoice_item_index) ? entry.invoice_item_index : -1;
        if (removeIndex < 0 || !items[removeIndex]) {
          removeIndex = items.findIndex(it => String(it.product_id) === String(entry.product_id) && Number(it.quantity) === Number(entry.quantity) && Number(it.rate) === Number(entry.rate));
        }
        if (removeIndex >= 0) items.splice(removeIndex, 1);
        if (!items.length) {
          await Invoice.deleteOne({ _id: invoice._id });
        } else {
          invoice.items = items;
          invoice.subtotal = items.reduce((s, it) => s + Number(it.amount || (Number(it.quantity) * Number(it.rate))), 0);
          invoice.total = invoice.subtotal;
          invoice.paid = Math.min(Number(invoice.paid || 0), invoice.total);
          invoice.balance = Math.max(0, invoice.total - invoice.paid);
          invoice.status = invoice.balance <= 0 ? "paid" : invoice.paid > 0 ? "partial" : "unpaid";
          await invoice.save();
          // re-index remaining stock-out lines for this invoice so future deletes stay aligned
          const remaining = await StockOut.find({ invoice_no: entry.invoice_no, _id: { $ne: entry._id } }).sort({ created_at: 1 });
          for (let i = 0; i < remaining.length; i += 1) { remaining[i].invoice_item_index = i; await remaining[i].save(); }
        }
      }
    }
    await StockOut.findByIdAndDelete(id);
    await Notification.create({ type: "stock_out_delete", message: `Deleted stock-out ${entry.invoice_no || entry.reference}; stock restored.` });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
