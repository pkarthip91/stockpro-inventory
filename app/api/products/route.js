import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product, Category, Supplier } from "@/models";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

function shapeProduct(p, categoryName, supplierName) {
  return {
    id: String(p._id),
    sku: p.sku,
    sub_product: p.sub_product || null,
    name: p.name,
    category_id: p.category_id ? String(p.category_id) : null,
    supplier_id: p.supplier_id ? String(p.supplier_id) : null,
    unit: p.unit,
    pack_size: p.pack_size || 1,
    cost_price: p.cost_price,
    selling_price: p.selling_price,
    pricing_tiers: p.pricing_tiers || [],
    stock_qty: p.stock_qty,
    reorder_level: p.reorder_level,
    created_at: p.created_at,
    category_name: categoryName || null,
    supplier_name: supplierName || null,
  };
}

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const category = searchParams.get("category_id");
  const lowStock = searchParams.get("low_stock");

  const filter = {};
  if (q) filter.$or = [{ name: { $regex: q, $options: "i" } }, { sku: { $regex: q, $options: "i" } }];
  if (category) filter.category_id = category;

  let products = await Product.find(filter).sort({ created_at: -1 }).lean();
  if (lowStock === "1") products = products.filter((p) => p.stock_qty <= p.reorder_level);

  const categoryIds = [...new Set(products.map((p) => p.category_id).filter(Boolean).map(String))];
  const supplierIds = [...new Set(products.map((p) => p.supplier_id).filter(Boolean).map(String))];
  const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
  const suppliers = await Supplier.find({ _id: { $in: supplierIds } }).lean();
  const catMap = Object.fromEntries(categories.map((c) => [String(c._id), c.name]));
  const supMap = Object.fromEntries(suppliers.map((s) => [String(s._id), s.name]));

  const shaped = products.map((p) => shapeProduct(p, catMap[String(p.category_id)], supMap[String(p.supplier_id)]));
  return NextResponse.json({ products: shaped });
}

export async function POST(request) {
  await connectDB();
  const body = await request.json();
  const { sku, sub_product, name, category_id, supplier_id, unit, cost_price, selling_price, stock_qty, reorder_level, pricing_tiers, pack_size } = body;

  if (!name) {
    return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  }

  try {
    const product = await Product.create({
      sku: sku || undefined,
      sub_product: sub_product || undefined,
      name,
      category_id: category_id || undefined,
      supplier_id: supplier_id || undefined,
      unit: unit || "BOTTLE",
      cost_price: Number(cost_price) || 0,
      selling_price: Number(selling_price) || 0,
      pricing_tiers: Array.isArray(pricing_tiers) ? pricing_tiers : [],
      pack_size: Number(pack_size) || 1,
      stock_qty: Number(stock_qty) || 0,
      reorder_level: Number(reorder_level) || 5,
    });

    // Fire-and-forget WhatsApp alert — never blocks the response
    sendWhatsAppMessage(
      `🆕 New product added: *${product.name}*\nSKU: ${product.sku || "—"}\nOpening stock: ${product.stock_qty} ${product.unit}`
    );

    return NextResponse.json({ product: shapeProduct(product) }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e.code === 11000 ? "SKU already exists." : e.message },
      { status: 400 }
    );
  }
}
