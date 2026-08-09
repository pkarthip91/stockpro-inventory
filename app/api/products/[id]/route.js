import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product, Category, Supplier } from "@/models";

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

export async function GET(request, { params }) {
  await connectDB();
  const { id } = await params;
  const product = await Product.findById(id).lean();
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const category = product.category_id ? await Category.findById(product.category_id).lean() : null;
  const supplier = product.supplier_id ? await Supplier.findById(product.supplier_id).lean() : null;

  return NextResponse.json({ product: shapeProduct(product, category?.name, supplier?.name) });
}

export async function PUT(request, { params }) {
  await connectDB();
  const { id } = await params;
  const body = await request.json();
  const { sku, name, category_id, supplier_id, unit, cost_price, selling_price, stock_qty, reorder_level, pricing_tiers, pack_size, sub_products, deleted_sub_product_ids } = body;

  const existing = await Product.findById(id);
  if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  try {
    // Update shared group values for the existing product's group
    const groupFilter = {
      name: existing.name,
      category_id: existing.category_id || null,
      supplier_id: existing.supplier_id || null,
    };

    const sharedUpdate = {};
    if (name !== undefined) sharedUpdate.name = name;
    if (category_id !== undefined) sharedUpdate.category_id = category_id || undefined;
    if (supplier_id !== undefined) sharedUpdate.supplier_id = supplier_id || undefined;
    if (unit !== undefined) sharedUpdate.unit = unit;
    if (Object.keys(sharedUpdate).length) {
      await Product.updateMany(groupFilter, sharedUpdate);
    }

    if (Array.isArray(sub_products)) {
      for (const item of sub_products) {
        const itemData = {
          name: name !== undefined ? name : existing.name,
          category_id: category_id !== undefined ? category_id || undefined : existing.category_id,
          supplier_id: supplier_id !== undefined ? supplier_id || undefined : existing.supplier_id,
          unit: unit !== undefined ? unit : existing.unit,
          sub_product: item.name || undefined,
          cost_price: item.cost_price !== undefined ? Number(item.cost_price) : 0,
          selling_price: item.selling_price !== undefined ? Number(item.selling_price) : 0,
          ...(item.stock_qty !== undefined ? { stock_qty: Number(item.stock_qty) } : {}),
          pricing_tiers:
            Array.isArray(item.pricing_tiers) && item.pricing_tiers.length > 0
              ? item.pricing_tiers
              : item.bulk_qty && item.bulk_price
              ? [{ min_qty: Number(item.bulk_qty), price: Number(item.bulk_price) }]
              : [],
          pack_size: item.pack_size !== undefined ? Number(item.pack_size) : existing.pack_size,
          reorder_level: item.reorder_level !== undefined ? Number(item.reorder_level) : existing.reorder_level,
        };

        if (item.id) {
          await Product.findByIdAndUpdate(item.id, itemData, { new: true });
        } else if (item.name) {
          await Product.create(itemData);
        }
      }
    }

    if (Array.isArray(deleted_sub_product_ids) && deleted_sub_product_ids.length) {
      await Product.deleteMany({ _id: { $in: deleted_sub_product_ids } });
    }

    if (sku !== undefined) existing.sku = sku;
    if (name !== undefined) existing.name = name;
    if (category_id !== undefined) existing.category_id = category_id || null;
    if (supplier_id !== undefined) existing.supplier_id = supplier_id || null;
    if (unit !== undefined) existing.unit = unit;
    if (cost_price !== undefined) existing.cost_price = Number(cost_price);
    if (selling_price !== undefined) existing.selling_price = Number(selling_price);
    if (stock_qty !== undefined) existing.stock_qty = Number(stock_qty);
    if (reorder_level !== undefined) existing.reorder_level = Number(reorder_level);
    if (pack_size !== undefined) existing.pack_size = Number(pack_size);
    if (pricing_tiers !== undefined) existing.pricing_tiers = Array.isArray(pricing_tiers) ? pricing_tiers : [];
    await existing.save();

    return NextResponse.json({ product: shapeProduct(existing) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  await connectDB();
  const { id } = await params;
  const existing = await Product.findById(id);
  if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  await Product.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
