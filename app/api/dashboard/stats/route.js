import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product, StockIn, StockOut, Invoice, Supplier, Customer, Category } from "@/models";

export async function GET() {
  await connectDB();
  try {
    const [products, recentIns, recentOuts, invoiceAgg, totalSuppliers, totalCustomers, stockInCount, stockOutCount, categories] = await Promise.all([
      Product.find().select("name sub_product sku unit stock_qty cost_price selling_price reorder_level pack_size category_id").lean(),
      StockIn.find().sort({ created_at: -1 }).limit(8).lean(),
      StockOut.find().sort({ created_at: -1 }).limit(8).lean(),
      Invoice.aggregate([{ $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$total" }, outstanding: { $sum: "$balance" } } }]),
      Supplier.countDocuments(), Customer.countDocuments(), StockIn.countDocuments(), StockOut.countDocuments(), Category.find().lean(),
    ]);
    const productMap = Object.fromEntries(products.map(p => [String(p._id), p]));
    const catMap = Object.fromEntries(categories.map(c => [String(c._id), c.name]));
    const mainProductCount = new Set(products.map(p => p.name)).size;
    const subProductCount = products.length;
    const totalStockUnits = products.reduce((s,p)=>s+Number(p.stock_qty||0),0);
    const stockCostValue = products.reduce((s,p)=>s+Number(p.stock_qty||0)*Number(p.cost_price||0),0);
    const stockSaleValue = products.reduce((s,p)=>s+Number(p.stock_qty||0)*Number(p.selling_price||0),0);
    const lowStockProducts = products.filter(p=>Number(p.stock_qty||0)<=Number(p.reorder_level||0)).map(p=>({id:String(p._id),name:`${p.name}${p.sub_product?` / ${p.sub_product}`:""}`,stock_qty:p.stock_qty,reorder_level:p.reorder_level}));
    const categoryGroups = {};
    for (const p of products) { const name=catMap[String(p.category_id)]||"Uncategorized"; if(!categoryGroups[name]) categoryGroups[name]={name,product_count:0,value:0}; categoryGroups[name].product_count+=1; categoryGroups[name].value+=Number(p.stock_qty||0)*Number(p.cost_price||0); }
    const shapeMovement=(row,direction)=>{const p=productMap[String(row.product_id)];return {id:String(row._id),direction,reference:row.reference,main_product:p?.name||"Unknown",sub_product:p?.sub_product||"Default",product_name:`${p?.name||"Unknown"}${p?.sub_product?` / ${p.sub_product}`:""}`,quantity:row.quantity,unit:p?.unit||"unit",amount:direction==="in"?Number(row.quantity||0)*Number(row.cost_price||0):Number(row.sale_value||0),created_at:row.created_at,invoice_no:row.invoice_no||null};};
    const recentStockIn=recentIns.map(r=>shapeMovement(r,"in")); const recentStockOut=recentOuts.map(r=>shapeMovement(r,"out"));
    const recentMovements=[...recentStockIn,...recentStockOut].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,12);
    return NextResponse.json({kpis:{mainProductCount,subProductCount,totalStockUnits,stockCostValue,stockValue:stockCostValue,stockSaleValue,lowStockCount:lowStockProducts.length,totalRevenue:invoiceAgg?.[0]?.revenue||0,totalOutstanding:invoiceAgg?.[0]?.outstanding||0,totalInvoices:invoiceAgg?.[0]?.count||0,totalSuppliers,totalCustomers,stockInCount,stockOutCount},categoryBreakdown:Object.values(categoryGroups).sort((a,b)=>b.value-a.value),recentStockIn,recentStockOut,recentMovements,lowStockProducts});
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
