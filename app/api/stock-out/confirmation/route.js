import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StockOut, Product } from "@/models";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const invoiceNo = searchParams.get("invoice_no");
  if (!invoiceNo) {
    return NextResponse.json({ error: "Invoice number is required." }, { status: 400 });
  }

  const sale = await StockOut.findOne({ invoice_no: invoiceNo }).lean();
  if (!sale) {
    return NextResponse.json({ error: "Sale confirmation not found." }, { status: 404 });
  }

  const product = sale.product_id ? await Product.findById(sale.product_id).lean() : null;

  return NextResponse.json({
    sale: {
      id: String(sale._id),
      invoice_no: sale.invoice_no,
      product_name: product?.name || sale.product_name || "Unknown product",
      customer_name: sale.customer_name || "Walk-in",
      quantity: sale.quantity,
      unit: product?.unit || sale.unit || "unit",
      pack_size: product?.pack_size || 1,
      rate: sale.rate,
      sale_value: sale.sale_value,
      balance_after: sale.balance_after,
      created_at: sale.created_at,
    },
  });
}
