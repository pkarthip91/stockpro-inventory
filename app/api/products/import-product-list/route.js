import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Category, Product } from "@/models";
import { productStockImport, DEFAULT_PACK_SIZE } from "@/lib/data/productStockImport";

function totalBottles(row) {
  const packSize = Number(row.packSize || DEFAULT_PACK_SIZE);
  return Number(row.ctn || 0) * packSize + Number(row.bt || 0);
}

export async function POST() {
  await connectDB();

  try {
    const categoryNames = [...new Set(productStockImport.map((row) => row.category))];
    const categories = {};
    for (const name of categoryNames) {
      categories[name] = await Category.findOneAndUpdate(
        { name },
        { $setOnInsert: { name } },
        { upsert: true, new: true }
      );
    }

    let created = 0;
    let updated = 0;
    const review = [];

    for (const row of productStockImport) {
      const packSize = Number(row.packSize || DEFAULT_PACK_SIZE);
      const quantity = totalBottles(row);
      const filter = { name: row.main, sub_product: row.sub };
      const existing = await Product.findOne(filter);

      const values = {
        name: row.main,
        sub_product: row.sub,
        category_id: categories[row.category]._id,
        unit: "BOTTLE",
        pack_size: packSize,
        stock_qty: quantity,
        reorder_level: 6,
      };

      if (existing) {
        await Product.updateOne(filter, { $set: values });
        updated += 1;
      } else {
        await Product.create({
          ...values,
          cost_price: 0,
          selling_price: 0,
          pricing_tiers: [],
        });
        created += 1;
      }

      if (row.review) {
        review.push(`${row.main} / ${row.sub}`);
      }
    }

    return NextResponse.json({
      ok: true,
      rows: productStockImport.length,
      created,
      updated,
      default_pack_size: DEFAULT_PACK_SIZE,
      bulk_min_qty: 6,
      review,
      message: `Imported ${productStockImport.length} physical-count rows. Cartons were converted using each product pack size (default ${DEFAULT_PACK_SIZE}).`,
    });
  } catch (error) {
    console.error("PRODUCT STOCK IMPORT ERROR", error);
    return NextResponse.json({ error: error.message || "Unable to import bar stock." }, { status: 500 });
  }
}
