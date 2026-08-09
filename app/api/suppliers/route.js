import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Supplier, Product } from "@/models";

export async function GET() {
  await connectDB();
  const suppliers = await Supplier.find().sort({ created_at: -1 }).lean();
  const counts = await Product.aggregate([{ $group: { _id: "$supplier_id", count: { $sum: 1 } } }]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

  const shaped = suppliers.map((s) => ({
    id: String(s._id),
    name: s.name,
    contact_person: s.contact_person,
    phone: s.phone,
    email: s.email,
    address: s.address,
    created_at: s.created_at,
    product_count: countMap[String(s._id)] || 0,
  }));
  return NextResponse.json({ suppliers: shaped });
}

export async function POST(request) {
  await connectDB();
  const { name, contact_person, phone, email, address } = await request.json();
  if (!name) return NextResponse.json({ error: "Supplier name is required." }, { status: 400 });

  const supplier = await Supplier.create({ name, contact_person, phone, email, address });
  return NextResponse.json({ supplier: { id: String(supplier._id), name: supplier.name } }, { status: 201 });
}

export async function DELETE(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  await Supplier.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
