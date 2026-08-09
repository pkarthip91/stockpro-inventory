import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StockIn, Product, Supplier, Notification } from "@/models";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { sendEmailNotification } from "@/lib/email";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const product_id = searchParams.get("product_id");
  const supplier_name = searchParams.get("supplier_name");
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "10")));

  const filter = {};
  if (product_id) filter.product_id = product_id;

  if (supplier_name) {
    const matchedSuppliers = await Supplier.find({ name: { $regex: supplier_name, $options: "i" } }).select("_id").lean();
    filter.supplier_id = { $in: matchedSuppliers.map((s) => s._id) };
  }

  const [total, rows] = await Promise.all([
    StockIn.countDocuments(filter),
    StockIn.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const productIds = [...new Set(rows.map((r) => String(r.product_id)))];
  const supplierIds = [...new Set(rows.map((r) => r.supplier_id).filter(Boolean).map(String))];
  const [products, suppliers] = await Promise.all([
    Product.find({ _id: { $in: productIds } }).lean(),
    Supplier.find({ _id: { $in: supplierIds } }).lean(),
  ]);
  const prodMap = Object.fromEntries(products.map((p) => [String(p._id), p]));
  const supMap = Object.fromEntries(suppliers.map((s) => [String(s._id), s.name]));

  const shaped = rows.map((r) => ({
    id: String(r._id),
    reference: r.reference,
    product_id: String(r.product_id),
    supplier_id: r.supplier_id ? String(r.supplier_id) : null,
    quantity: r.quantity,
    cost_price: r.cost_price,
    total_cost: Number(r.quantity || 0) * Number(r.cost_price || 0),
    note: r.note,
    created_at: r.created_at,
    product_name: prodMap[String(r.product_id)]?.sub_product || prodMap[String(r.product_id)]?.name,
    product_main_name: prodMap[String(r.product_id)]?.name || null,
    product_sub_name: prodMap[String(r.product_id)]?.sub_product || null,
    sku: prodMap[String(r.product_id)]?.sku,
    unit: prodMap[String(r.product_id)]?.unit,
    supplier_name: supMap[String(r.supplier_id)] || null,
  }));
  return NextResponse.json({ stock_in: shaped, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
}

export async function POST(request) {
  await connectDB();
  const body = await request.json();
  const { product_id, supplier_id, quantity, cost_price, note } = body;

  if (!product_id || !quantity || Number(quantity) <= 0) {
    return NextResponse.json({ error: "Product and a positive quantity are required." }, { status: 400 });
  }

  const product = await Product.findById(product_id);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const reference = "SIN-" + Date.now().toString().slice(-8);

  const entry = await StockIn.create({
    reference,
    product_id,
    supplier_id: supplier_id || product.supplier_id || undefined,
    quantity: Number(quantity),
    cost_price: Number(cost_price) || product.cost_price,
    note: note || "",
  });

  product.stock_qty += Number(quantity);
  await product.save();

  await Notification.create({
    type: "stock_in",
    message: `Stock in: ${quantity} ${product.unit} of ${product.name} received (${reference}).`,
  });

  // WhatsApp + email alerts — fire and forget, never blocks the response
  const stockInMessage = `📥 Stock In\n${product.name}\n+${quantity} ${product.unit}\nNew balance: ${product.stock_qty} ${product.unit}\nRef: ${reference}`;
  sendWhatsAppMessage(stockInMessage);
  sendEmailNotification(`Stock In — ${product.name}`, stockInMessage);

  return NextResponse.json(
    {
      stock_in: {
        id: String(entry._id),
        reference,
        product_id: String(product._id),
        quantity: entry.quantity,
        product_name: product.name,
        unit: product.unit,
      },
    },
    { status: 201 }
  );
}

export async function PUT(request) {
  await connectDB();
  const body = await request.json();
  const { id, quantity, cost_price, note } = body;

  if (!id) {
    return NextResponse.json({ error: "Stock-in ID is required." }, { status: 400 });
  }
  if (!quantity || Number(quantity) <= 0) {
    return NextResponse.json({ error: "Quantity must be a positive number." }, { status: 400 });
  }

  const entry = await StockIn.findById(id);
  if (!entry) {
    return NextResponse.json({ error: "Stock-in entry not found." }, { status: 404 });
  }

  const product = await Product.findById(entry.product_id);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const previousQuantity = entry.quantity;
  const newQuantity = Number(quantity);
  const delta = newQuantity - previousQuantity;

  entry.quantity = newQuantity;
  if (cost_price !== undefined) entry.cost_price = Number(cost_price) || 0;
  if (note !== undefined) entry.note = note || "";
  await entry.save();

  product.stock_qty = Number(product.stock_qty || 0) + delta;
  await product.save();

  return NextResponse.json(
    {
      stock_in: {
        id: String(entry._id),
        reference: entry.reference,
        product_id: String(product._id),
        quantity: entry.quantity,
        product_name: product.name,
        unit: product.unit,
      },
    },
    { status: 200 }
  );
}
