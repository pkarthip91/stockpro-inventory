import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Customer, Invoice } from "@/models";

export async function GET() {
  await connectDB();
  const customers = await Customer.find().sort({ created_at: -1 }).lean();
  const stats = await Invoice.aggregate([
    { $group: { _id: "$customer_id", count: { $sum: 1 }, total: { $sum: "$total" } } },
  ]);
  const statMap = Object.fromEntries(stats.map((s) => [String(s._id), s]));

  const shaped = customers.map((c) => ({
    id: String(c._id),
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    created_at: c.created_at,
    invoice_count: statMap[String(c._id)]?.count || 0,
    total_spent: statMap[String(c._id)]?.total || 0,
  }));
  return NextResponse.json({ customers: shaped });
}

export async function POST(request) {
  await connectDB();
  const { name, phone, email, address } = await request.json();
  if (!name) return NextResponse.json({ error: "Customer name is required." }, { status: 400 });

  const customer = await Customer.create({ name, phone, email, address });
  return NextResponse.json({ customer: { id: String(customer._id), name: customer.name } }, { status: 201 });
}

export async function DELETE(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  await Customer.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
