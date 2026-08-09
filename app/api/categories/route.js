import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Category, Product } from "@/models";

export async function GET() {
  await connectDB();
  const [categories, breakdown] = await Promise.all([
    Category.find().sort({ name: 1 }).lean(),
    Product.aggregate([
      { $group: { _id: "$category_id", sub_product_count: { $sum: 1 }, main_names: { $addToSet: "$name" } } },
      { $project: { sub_product_count: 1, main_product_count: { $size: "$main_names" } } },
    ]),
  ]);
  const countMap = Object.fromEntries(breakdown.map((c) => [String(c._id), c]));
  return NextResponse.json({
    categories: categories.map((c) => ({
      id: String(c._id), name: c.name, created_at: c.created_at,
      product_count: countMap[String(c._id)]?.sub_product_count || 0,
      main_product_count: countMap[String(c._id)]?.main_product_count || 0,
      sub_product_count: countMap[String(c._id)]?.sub_product_count || 0,
    })),
  });
}

export async function POST(request) {
  await connectDB();
  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  try {
    const category = await Category.create({ name: name.trim() });
    return NextResponse.json({ category: { id: String(category._id), name: category.name } }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.code === 11000 ? "Category already exists." : e.message }, { status: 400 });
  }
}

export async function PUT(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const { name } = await request.json();
  if (!id || !name?.trim()) return NextResponse.json({ error: "Category id and name are required." }, { status: 400 });
  try {
    const category = await Category.findByIdAndUpdate(id, { name: name.trim() }, { new: true, runValidators: true });
    if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    return NextResponse.json({ category: { id: String(category._id), name: category.name } });
  } catch (e) {
    return NextResponse.json({ error: e.code === 11000 ? "Category already exists." : e.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  const used = await Product.countDocuments({ category_id: id });
  if (used > 0) return NextResponse.json({ error: `This category has ${used} sub products. Move or delete them first.` }, { status: 409 });
  await Category.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
