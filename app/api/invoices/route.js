import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Invoice, Customer, Product, StockOut, Notification } from "@/models";

function computeRate(product, qty) {
  const base = Number(product?.selling_price || 0);
  const tiers = Array.isArray(product?.pricing_tiers) ? product.pricing_tiers : [];
  for (const t of tiers) {
    const min = Number(t.min_qty || 0);
    const max = t.max_qty == null ? Infinity : Number(t.max_qty);
    if (qty >= min && qty <= max) {
      if (t.price != null) return Number(t.price);
      if (t.discount_percent != null) return base * (1 - Number(t.discount_percent) / 100);
    }
  }
  return base;
}

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 10)));

  const filter = {};
  if (status) filter.status = status;
  if (q) filter.$or = [
    { invoice_no: { $regex: q, $options: "i" } },
    { customer_name: { $regex: q, $options: "i" } },
  ];

  let customerIds = [];
  if (q) {
    const matches = await Customer.find({ name: { $regex: q, $options: "i" } }).select("_id").lean();
    customerIds = matches.map(c => c._id);
    if (customerIds.length) {
      filter.$or.push({ customer_id: { $in: customerIds } });
    }
  }

  const [total, invoices] = await Promise.all([
    Invoice.countDocuments(filter),
    Invoice.find(filter).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  const ids = [...new Set(invoices.map(i => i.customer_id).filter(Boolean).map(String))];
  const customers = await Customer.find({ _id: { $in: ids } }).lean();
  const custMap = Object.fromEntries(customers.map(c => [String(c._id), c]));
  const shaped = invoices.map(i => ({
    id: String(i._id), invoice_no: i.invoice_no, customer_id: i.customer_id ? String(i.customer_id) : null,
    customer_name: i.customer_name || custMap[String(i.customer_id)]?.name || "Walk-in",
    customer_phone: custMap[String(i.customer_id)]?.phone || null,
    invoice_date: i.invoice_date, status: i.status, subtotal: i.subtotal, total: i.total,
    paid: i.paid, balance: i.balance, payment_method: i.payment_method, created_at: i.created_at,
    item_count: (i.items || []).length,
  }));
  return NextResponse.json({ invoices: shaped, total, page, pages: Math.max(1, Math.ceil(total / limit)), limit });
}

export async function POST(request) {
  await connectDB();
  const body = await request.json();
  const { customer_name, invoice_date, items, payment_method, paid, note } = body;
  if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: "At least one product is required." }, { status: 400 });

  try {
    const normalized = items.map(it => ({ product_id: String(it.product_id || ""), quantity: Number(it.quantity || 0) })).filter(it => it.product_id && it.quantity > 0);
    if (!normalized.length) throw new Error("Add at least one valid product line.");

    // If same sub-product is added twice, validate and deduct the combined quantity correctly.
    const qtyByProduct = normalized.reduce((acc, it) => { acc[it.product_id] = (acc[it.product_id] || 0) + it.quantity; return acc; }, {});
    const productIds = Object.keys(qtyByProduct);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = Object.fromEntries(products.map(p => [String(p._id), p]));
    for (const pid of productIds) {
      const p = productMap[pid];
      if (!p) throw new Error("One of the selected products was not found.");
      if (qtyByProduct[pid] > Number(p.stock_qty || 0)) throw new Error(`Only ${p.stock_qty} ${p.unit} available for ${p.name} / ${p.sub_product || "Default"}.`);
    }

    const buyerName = customer_name?.trim() || "Walk-in";
    let customerId = null;
    if (buyerName !== "Walk-in") {
      let customer = await Customer.findOne({ name: buyerName });
      if (!customer) customer = await Customer.create({ name: buyerName });
      customerId = customer._id;
    }

    const invoiceItems = normalized.map(it => {
      const p = productMap[it.product_id];
      const rate = computeRate(p, it.quantity);
      return { product_id: p._id, quantity: it.quantity, rate, amount: it.quantity * rate };
    });
    const subtotal = invoiceItems.reduce((sum, it) => sum + it.amount, 0);
    const paidAmt = Math.max(0, Number(paid ?? subtotal) || 0);
    const balance = Math.max(0, subtotal - paidAmt);
    const count = await Invoice.countDocuments();
    const invoiceNo = `INV${900 + count}`;

    const invoice = await Invoice.create({
      invoice_no: invoiceNo, customer_id: customerId || undefined, customer_name: buyerName,
      invoice_date: invoice_date || new Date().toISOString().slice(0, 10),
      status: balance <= 0 ? "paid" : paidAmt > 0 ? "partial" : "unpaid",
      subtotal, total: subtotal, paid: paidAmt, balance, payment_method: payment_method || "CASH",
      note: note || "", items: invoiceItems,
    });

    // One invoice can create many stock-out rows. Every row is visible in Sales History.
    for (let index = 0; index < invoiceItems.length; index += 1) {
      const it = invoiceItems[index];
      const p = productMap[String(it.product_id)];
      p.stock_qty = Number(p.stock_qty || 0) - Number(it.quantity || 0);
      await p.save();
      await StockOut.create({
        reference: `SOUT-${invoiceNo}-${index + 1}`, product_id: p._id, customer_id: customerId || undefined,
        customer_name: buyerName, quantity: it.quantity, rate: it.rate, sale_value: it.amount,
        balance_after: p.stock_qty, invoice_no: invoiceNo, invoice_item_index: index, reason: "invoice",
        note: `Invoice line ${index + 1} of ${invoiceItems.length}`,
      });
    }

    await Notification.create({ type: "invoice", message: `Invoice ${invoiceNo} created — ${invoiceItems.length} product line(s), RM ${subtotal.toFixed(2)}.` });
    return NextResponse.json({ invoice: { id: String(invoice._id), invoice_no: invoice.invoice_no, total: invoice.total, item_count: invoiceItems.length } }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
