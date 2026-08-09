import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models";

export async function POST(request) {
  await connectDB();

  try {
    const body = await request.json();

    const {
      name,
      category_id,
      supplier_id,
      unit,
      cost_price,
      selling_price,
      stock_qty,
      reorder_level,
      pack_size,
      sub_products,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Product name is required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(sub_products) || sub_products.length === 0) {
      return NextResponse.json(
        { error: "sub_products array is required." },
        { status: 400 }
      );
    }

    const docs = sub_products.map((sp) => {
      const nameVal =
        typeof sp === "string"
          ? sp
          : sp?.name || "";

      const costVal =
        sp?.cost_price ?? cost_price ?? 0;

      const sellVal =
        sp?.selling_price ?? selling_price ?? 0;

      const stockVal =
        sp?.stock_qty ?? stock_qty ?? 0;

      /*
       * BULK PRICING FIX
       *
       * Frontend may send:
       *
       * pricing_tiers: [
       *   {
       *     min_qty: 12,
       *     price: 290
       *   }
       * ]
       *
       * So first use pricing_tiers.
       *
       * If pricing_tiers is not available,
       * fallback to bulk_qty / bulk_price.
       */
      let tier = [];

      if (
        Array.isArray(sp?.pricing_tiers) &&
        sp.pricing_tiers.length > 0
      ) {
        tier = sp.pricing_tiers
          .filter(
            (t) =>
              t?.min_qty !== undefined &&
              t?.min_qty !== null &&
              t?.min_qty !== "" &&
              t?.price !== undefined &&
              t?.price !== null &&
              t?.price !== ""
          )
          .map((t) => ({
            min_qty: Number(t.min_qty),
            price: Number(t.price),
          }));
      } else if (
        sp?.bulk_qty !== undefined &&
        sp?.bulk_qty !== null &&
        sp?.bulk_qty !== "" &&
        sp?.bulk_price !== undefined &&
        sp?.bulk_price !== null &&
        sp?.bulk_price !== ""
      ) {
        tier = [
          {
            min_qty: Number(sp.bulk_qty),
            price: Number(sp.bulk_price),
          },
        ];
      }

      return {
        name,

        sub_product: nameVal,

        category_id:
          category_id || undefined,

        supplier_id:
          supplier_id || undefined,

        unit:
          unit || "BOTTLE",

        cost_price:
          Number(costVal) || 0,

        selling_price:
          Number(sellVal) || 0,

        /*
         * Bulk price saved here
         */
        pricing_tiers: tier,

        pack_size:
          Number(sp?.pack_size ?? pack_size) || 1,

        /*
         * Works correctly for:
         * 0
         * 10
         * 50
         * etc.
         */
        stock_qty:
          Number(stockVal) || 0,

        reorder_level:
          Number(reorder_level) || 5,
      };
    });

    /*
     * Helpful debugging
     */
    console.log(
      "PRODUCTS TO SAVE:",
      JSON.stringify(docs, null, 2)
    );

    const created =
      await Product.insertMany(docs);

    /*
     * Return all important fields
     */
    const shaped = created.map((p) => ({
      id: String(p._id),

      name: p.name,

      sub_product:
        p.sub_product,

      category_id:
        p.category_id,

      supplier_id:
        p.supplier_id,

      unit:
        p.unit,

      cost_price:
        p.cost_price,

      selling_price:
        p.selling_price,

      stock_qty:
        p.stock_qty,

      /*
       * Return bulk pricing
       */
      pricing_tiers:
        p.pricing_tiers || [],

      pack_size:
        p.pack_size,

      reorder_level:
        p.reorder_level,

      created_at:
        p.createdAt ||
        p.created_at,
    }));

    return NextResponse.json(
      {
        products: shaped,
      },
      {
        status: 201,
      }
    );
  } catch (e) {
    console.error(
      "CREATE PRODUCT ERROR:",
      e
    );

    return NextResponse.json(
      {
        error:
          e.message ||
          "Unable to create products.",
      },
      {
        status: 400,
      }
    );
  }
}