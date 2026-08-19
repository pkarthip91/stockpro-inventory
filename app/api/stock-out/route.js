import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StockOut, Product, Customer, Invoice, Notification } from "@/models";
import mongoose from "mongoose";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { sendEmailNotification } from "@/lib/email";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const product_id = searchParams.get("product_id");
  const customer_name = searchParams.get("customer_name");
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "10")));

  const filter = {};
  if (product_id) filter.product_id = product_id;
  if (customer_name) filter.customer_name = { $regex: customer_name, $options: "i" };

  const [total, rows] = await Promise.all([
    StockOut.countDocuments(filter),
    StockOut.find(filter).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  const productIds = [...new Set(rows.map((r) => String(r.product_id)))];
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const prodMap = Object.fromEntries(products.map((p) => [String(p._id), p]));

  const shaped = rows.map((r) => ({
    id: String(r._id), reference: r.reference, product_id: String(r.product_id), quantity: r.quantity,
    rate: r.rate, sale_value: r.sale_value, balance_after: r.balance_after, invoice_no: r.invoice_no,
    customer_name: r.customer_name || "Walk-in", created_at: r.created_at,
    product_name: prodMap[String(r.product_id)]?.sub_product || prodMap[String(r.product_id)]?.name,
    product_main_name: prodMap[String(r.product_id)]?.name || null,
    product_sub_name: prodMap[String(r.product_id)]?.sub_product || null,
    sku: prodMap[String(r.product_id)]?.sku, unit: prodMap[String(r.product_id)]?.unit,
    pack_size: prodMap[String(r.product_id)]?.pack_size || 1,
  }));

  let product_summary = null;
  if (product_id) {
    try {
      const prodObj = await Product.findById(product_id).lean();
      const agg = await StockOut.aggregate([
        { $match: { product_id: prodObj ? prodObj._id : null } },
        { $group: { _id: "$product_id", total_sold: { $sum: "$quantity" }, total_revenue: { $sum: "$sale_value" } } },
      ]);
      product_summary = {
        product_id,
        name: prodObj ? prodObj.name : null,
        sub_product: prodObj ? prodObj.sub_product : null,
        unit: prodObj ? prodObj.unit : null,
        pack_size: prodObj ? prodObj.pack_size || 1 : 1,
        selling_price: prodObj ? prodObj.selling_price : 0,
        stock_qty: prodObj ? prodObj.stock_qty : 0,
        total_sold: agg?.[0]?.total_sold || 0,
        total_revenue: agg?.[0]?.total_revenue || 0,
        remaining_value: prodObj ? prodObj.stock_qty * (prodObj.selling_price || 0) : 0,
      };
    } catch { product_summary = null; }
  }

  let customer_summary = null;
  if (customer_name) {
    try {
      const agg = await StockOut.aggregate([
        { $match: { customer_name: { $regex: customer_name, $options: "i" } } },
        { $group: { _id: "$customer_name", total_qty: { $sum: "$quantity" }, total_spent: { $sum: "$sale_value" }, last_purchase: { $max: "$created_at" } } },
      ]);
      customer_summary = agg?.[0]
        ? { name: agg[0]._id, total_qty: agg[0].total_qty, total_spent: agg[0].total_spent, last_purchase: agg[0].last_purchase }
        : { name: customer_name, total_qty: 0, total_spent: 0, last_purchase: null };
    } catch { customer_summary = null; }
  }

  return NextResponse.json({ stock_out: shaped, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)), product_summary, customer_summary });
}

export async function POST(request) {
  await connectDB();
  const body = await request.json();
  const { product_id, customer_name, quantity } = body;

  if (!product_id || !quantity || Number(quantity) <= 0) {
    return NextResponse.json({ error: "Product and a positive quantity are required." }, { status: 400 });
  }

  const product = await Product.findById(product_id);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  if (Number(quantity) > product.stock_qty) {
    return NextResponse.json(
      { error: `Only ${product.stock_qty} ${product.unit} of ${product.name} in stock.` },
      { status: 400 }
    );
  }

  const buyerName = (customer_name || "").trim() || "Walk-in";
  const qty = Number(quantity);

  function computeRate(product, qty) {
    const base = Number(product.selling_price || 0);
    const tiers = product.pricing_tiers || [];
    if (Array.isArray(tiers) && tiers.length > 0) {
      for (const t of tiers) {
        const min = Number(t.min_qty || 0);
        const max = t.max_qty == null ? Infinity : Number(t.max_qty);
        if (qty >= min && qty <= max) {
          if (t.price != null) return Number(t.price);
          if (t.discount_percent != null) return base * (1 - Number(t.discount_percent) / 100);
        }
      }
    }
    return base;
  }

  const rate = computeRate(product, qty);
  const saleValue = qty * rate;
  const reference = "SOUT-" + Date.now().toString().slice(-8);

  // Find or create a lightweight customer record for named buyers (not "Walk-in"),
  // so their purchase history/spend total builds up over repeat visits.
  let customerId = null;
  if (buyerName !== "Walk-in") {
    let customer = await Customer.findOne({ name: buyerName });
    if (!customer) customer = await Customer.create({ name: buyerName });
    customerId = customer._id;
  }

  // Gather per-customer purchase summary for this product
  let customerSummary = null;
  if (customerId) {
    const prodObjId = new mongoose.Types.ObjectId(product_id);
    const custObjId = new mongoose.Types.ObjectId(customerId);
    const agg = await StockOut.aggregate([
      { $match: { customer_id: custObjId, product_id: prodObjId } },
      { $group: { _id: null, totalQty: { $sum: "$quantity" }, totalSpent: { $sum: "$sale_value" }, lastPurchase: { $max: "$created_at" } } },
    ]);
    if (agg && agg[0]) {
      customerSummary = {
        total_qty: agg[0].totalQty,
        total_spent: agg[0].totalSpent,
        last_purchase: agg[0].lastPurchase,
      };
    } else {
      customerSummary = { total_qty: 0, total_spent: 0, last_purchase: null };
    }
  }

  // Auto-generate the invoice for this sale — one line item, marked paid immediately
  // (this is a point-of-sale style flow: the sale IS the invoice, no separate step).
  const invoiceCount = await Invoice.countDocuments();
  const invoiceNo = "INV" + (900 + invoiceCount);

  await Invoice.create({
    invoice_no: invoiceNo,
    customer_id: customerId || undefined,
    invoice_date: new Date().toISOString().slice(0, 10),
    status: "paid",
    subtotal: saleValue,
    total: saleValue,
    paid: saleValue,
    balance: 0,
    payment_method: "CASH",
    items: [{ product_id: product._id, quantity: qty, rate, amount: saleValue }],
  });

  const entry = await StockOut.create({
    reference,
    product_id,
    customer_id: customerId || undefined,
    customer_name: buyerName,
    quantity: qty,
    rate,
    sale_value: saleValue,
    invoice_no: invoiceNo,
    reason: "sale",
  });

  product.stock_qty -= qty;
  await product.save();

  entry.balance_after = product.stock_qty;
  await entry.save();

  await Notification.create({
    type: "stock_out",
    message: `Sold ${qty} ${product.unit} of ${product.name} to ${buyerName} — Invoice ${invoiceNo}.`,
  });

  const timestamp = new Date().toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });

  let whatsappMessage =
    `📤 *Sale Recorded*\n\n` +
    `Product: ${product.name}\n` +
    `Buyer: ${buyerName}\n` +
    `Quantity Sold: ${qty} ${product.unit}\n` +
    `Rate: RM ${rate.toFixed(2)}\n` +
    `Sale Value: RM ${saleValue.toFixed(2)}\n` +
    `Remaining Stock: ${product.stock_qty} ${product.unit}\n` +
    `Invoice: ${invoiceNo}\n` +
    `Time: ${timestamp}`;

  let emailBody =
    `Hello,\n\n` +
    `A sale has been recorded in StockPro Inventory.\n\n` +
    `Product: ${product.name}\n` +
    `Buyer: ${buyerName}\n` +
    `Quantity Sold: ${qty} ${product.unit}\n` +
    `Rate: RM ${rate.toFixed(2)}\n` +
    `Sale Value: RM ${saleValue.toFixed(2)}\n` +
    `Remaining Stock: ${product.stock_qty} ${product.unit}\n` +
    `Invoice: ${invoiceNo}\n` +
    `Date & Time: ${timestamp}`;

  if (product.stock_qty <= product.reorder_level) {
    await Notification.create({
      type: "low_stock",
      message: `Low stock alert: ${product.name} is down to ${product.stock_qty} ${product.unit}.`,
    });
    whatsappMessage += `\n\n⚠️ *Low Stock Alert*\nOnly ${product.stock_qty} ${product.unit} remaining (reorder level: ${product.reorder_level} ${product.unit}). Please arrange restocking soon.`;
    emailBody += `\n\n⚠️ LOW STOCK ALERT\nOnly ${product.stock_qty} ${product.unit} remaining (reorder level: ${product.reorder_level} ${product.unit}). Please arrange restocking soon.`;
  }

  whatsappMessage += `\n\n_Nectar Heaven — StockPro Inventory_`;
  emailBody += `\n\nThis is an automated notification from Nectar Heaven — StockPro Inventory System.`;

  // WhatsApp + email alerts — fire and forget, never blocks the response
  sendWhatsAppMessage(whatsappMessage);
  sendEmailNotification(`Sale Recorded — ${product.name}`, emailBody);

  return NextResponse.json(
    {
      stock_out: {
        id: String(entry._id),
        reference,
        product_id: String(product._id),
        quantity: qty,
        rate,
        sale_value: saleValue,
        balance_after: product.stock_qty,
        invoice_no: invoiceNo,
        customer_name: buyerName,
        product_name: product.name,
        unit: product.unit,
        pack_size: product.pack_size || 1,
        customer_summary: customerSummary,
      },
    },
    { status: 201 }
  );
}
