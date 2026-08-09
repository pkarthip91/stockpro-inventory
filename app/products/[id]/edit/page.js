import AppShell from "@/components/layout/AppShell";
import ProductForm from "@/components/forms/ProductForm";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models";
import { notFound } from "next/navigation";

export default async function EditProductPage({ params }) {
  const { id } = await params;
  await connectDB();
  const doc = await Product.findById(id).lean();
  if (!doc) notFound();

  const groupDocs = await Product.find({
    name: doc.name,
    category_id: doc.category_id || null,
    supplier_id: doc.supplier_id || null,
  }).lean();

  const product = {
    id: String(doc._id),
    sku: doc.sku,
    name: doc.name,
    category_id: doc.category_id ? String(doc.category_id) : "",
    supplier_id: doc.supplier_id ? String(doc.supplier_id) : "",
    unit: doc.unit,
    pack_size: doc.pack_size || 1,
    sub_products: groupDocs.map((sub) => ({
      id: String(sub._id),
      name: sub.sub_product || "",
      cost_price: sub.cost_price,
      selling_price: sub.selling_price,
      stock_qty: sub.stock_qty,
      pricing_tiers: sub.pricing_tiers || [],
    })),
  };

  return (
    <AppShell title="Edit Product">
      <ProductForm product={product} />
    </AppShell>
  );
}
