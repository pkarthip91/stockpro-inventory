import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product, StockIn, StockOut, Invoice } from "@/models";

async function splitSafeIds(ids) {
  if (!ids.length) return { safeIds: [], blockedIds: [] };

  const [stockInIds, stockOutIds, invoiceIds] = await Promise.all([
    StockIn.distinct("product_id", { product_id: { $in: ids } }),
    StockOut.distinct("product_id", { product_id: { $in: ids } }),
    Invoice.distinct("items.product_id", { "items.product_id": { $in: ids } }),
  ]);

  const blocked = new Set([...stockInIds, ...stockOutIds, ...invoiceIds].map(String));
  return {
    safeIds: ids.filter((id) => !blocked.has(String(id))),
    blockedIds: ids.filter((id) => blocked.has(String(id))),
  };
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const mode = body?.mode || "selected";

    let ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];
    let batchId = body?.batchId || null;

    if (mode === "latest_import") {
      const latest = await Product.findOne({ import_batch_id: { $exists: true, $ne: null } })
        .sort({ imported_at: -1, created_at: -1 })
        .select("import_batch_id")
        .lean();

      if (!latest?.import_batch_id) {
        return NextResponse.json({ error: "No imported product batch was found." }, { status: 404 });
      }
      batchId = latest.import_batch_id;
      ids = (await Product.find({ import_batch_id: batchId }).select("_id").lean()).map((p) => String(p._id));
    } else if (mode === "import_batch") {
      if (!batchId) return NextResponse.json({ error: "Import batch is required." }, { status: 400 });
      ids = (await Product.find({ import_batch_id: batchId }).select("_id").lean()).map((p) => String(p._id));
    }

    if (!ids.length) return NextResponse.json({ error: "Select at least one product to delete." }, { status: 400 });

    const { safeIds, blockedIds } = await splitSafeIds(ids);
    if (safeIds.length) await Product.deleteMany({ _id: { $in: safeIds } });

    return NextResponse.json({
      ok: true,
      requested: ids.length,
      deleted: safeIds.length,
      blocked: blockedIds.length,
      blockedIds,
      batchId,
      message: blockedIds.length
        ? `${safeIds.length} deleted. ${blockedIds.length} kept because they already have stock/sales/invoice history.`
        : `${safeIds.length} product${safeIds.length === 1 ? "" : "s"} deleted.`,
    });
  } catch (error) {
    console.error("BULK PRODUCT DELETE ERROR", error);
    return NextResponse.json({ error: error.message || "Unable to delete selected products." }, { status: 500 });
  }
}
