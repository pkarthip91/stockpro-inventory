import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StockIn, Product, Notification } from "@/models";

export async function PUT(request, { params }) {
  await connectDB();
  const { id } = await params;
  const body = await request.json();
  const { quantity, cost_price, note, supplier_id } = body;

  if (!quantity || Number(quantity) <= 0) {
    return NextResponse.json({ error: "Quantity must be a positive number." }, { status: 400 });
  }

  const entry = await StockIn.findById(id);
  if (!entry) return NextResponse.json({ error: "Stock-in entry not found." }, { status: 404 });

  const product = await Product.findById(entry.product_id);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const oldQty = Number(entry.quantity || 0);
  const newQty = Number(quantity);
  const nextStock = Number(product.stock_qty || 0) + (newQty - oldQty);
  if (nextStock < 0) {
    return NextResponse.json({ error: "This change would make product stock negative." }, { status: 400 });
  }

  entry.quantity = newQty;
  if (cost_price !== undefined) entry.cost_price = Number(cost_price) || 0;
  if (note !== undefined) entry.note = note || "";
  if (supplier_id !== undefined) entry.supplier_id = supplier_id || undefined;
  await entry.save();

  product.stock_qty = nextStock;
  await product.save();

  await Notification.create({
    type: "stock_in_edit",
    message: `Updated stock-in ${entry.reference}: ${newQty} ${product.unit} of ${product.name}.`,
  });

  return NextResponse.json({
    stock_in: {
      id: String(entry._id),
      reference: entry.reference,
      product_id: String(product._id),
      quantity: entry.quantity,
      cost_price: entry.cost_price,
      product_name: product.sub_product || product.name,
      product_main_name: product.name,
      product_sub_name: product.sub_product || null,
      unit: product.unit,
      stock_qty: product.stock_qty,
    },
  });
}

export async function DELETE(request, { params }) {
  await connectDB();
  const { id } = await params;
  const entry = await StockIn.findById(id);
  if (!entry) return NextResponse.json({ error: "Stock-in entry not found." }, { status: 404 });

  const product = await Product.findById(entry.product_id);
  if (product) {
    const nextStock = Number(product.stock_qty || 0) - Number(entry.quantity || 0);
    if (nextStock < 0) {
      return NextResponse.json(
        { error: "Cannot delete this stock-in because some of this stock has already been sold." },
        { status: 400 }
      );
    }
    product.stock_qty = nextStock;
    await product.save();
  }

  await StockIn.findByIdAndDelete(id);
  await Notification.create({ type: "stock_in_delete", message: `Deleted stock-in ${entry.reference}.` });
  return NextResponse.json({ ok: true });
}
