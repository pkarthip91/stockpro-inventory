import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Invoice, Customer, Product, Category } from "@/models";
import mongoose from "mongoose";

export async function GET(request, { params }) {
  await connectDB();
  const { id } = await params;

  const query = mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { invoice_no: id }] } : { invoice_no: id };
  const invoice = await Invoice.findOne(query).lean();
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const customer = invoice.customer_id ? await Customer.findById(invoice.customer_id).lean() : null;

  const productIds = [...new Set((invoice.items || []).map((it) => String(it.product_id)))];
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const categoryIds = [...new Set(products.map(p => p.category_id).filter(Boolean).map(String))];
  const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
  const categoryMap = Object.fromEntries(categories.map(c => [String(c._id), c.name]));
  const prodMap = Object.fromEntries(products.map((p) => [String(p._id), p]));

  const items = (invoice.items || []).map((it, idx) => ({
    id: idx,
    product_id: String(it.product_id),
    quantity: it.quantity,
    rate: it.rate,
    amount: it.amount,
    product_name: prodMap[String(it.product_id)]?.sub_product || prodMap[String(it.product_id)]?.name,
    product_main_name: prodMap[String(it.product_id)]?.name || null,
    product_sub_name: prodMap[String(it.product_id)]?.sub_product || null,
    sku: prodMap[String(it.product_id)]?.sku,
    unit: prodMap[String(it.product_id)]?.unit,
    pack_size: prodMap[String(it.product_id)]?.pack_size || 1,
    category_name: categoryMap[String(prodMap[String(it.product_id)]?.category_id)] || null,
  }));

  const shapedInvoice = {
    id: String(invoice._id),
    invoice_no: invoice.invoice_no,
    invoice_date: invoice.invoice_date,
    status: invoice.status,
    subtotal: invoice.subtotal,
    total: invoice.total,
    paid: invoice.paid,
    balance: invoice.balance,
    payment_method: invoice.payment_method,
    customer_name: invoice.customer_name || customer?.name || "Walk-in",
    customer_phone: customer?.phone || null,
    customer_address: customer?.address || null,
  };

  return NextResponse.json({ invoice: shapedInvoice, items });
}

export async function PUT(request, { params }) {
  await connectDB();
  const { id } = await params;
  const body = await request.json();

  const existing = await Invoice.findById(id);
  if (!existing) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const paid = body.paid !== undefined ? Number(body.paid) : existing.paid;
  const balance = existing.total - paid;
  const status = body.status || (balance <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid");

  existing.paid = paid;
  existing.balance = balance;
  existing.status = status;
  await existing.save();

  return NextResponse.json({ invoice: { id: String(existing._id), paid, balance, status } });
}

export async function DELETE(request, { params }) {
  await connectDB();
  const { id } = await params;
  await Invoice.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
