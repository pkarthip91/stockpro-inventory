"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, FileText, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { notifyActivity } from "@/lib/events";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, Label, Input, Select, Badge } from "@/components/ui";
import Button from "@/components/ui/Button";
import { formatMoney } from "@/lib/utils";

const blankItem = () => ({ main_product_name: "", product_id: "", quantity: 1 });
function getMatchedTier(product, qty) {
  const tiers = Array.isArray(product?.pricing_tiers) ? product.pricing_tiers : [];
  return tiers.find((t) => qty >= Number(t.min_qty || 0) && qty <= (t.max_qty == null ? Infinity : Number(t.max_qty)));
}
function computeRate(product, qty) {
  const base = Number(product?.selling_price || 0); const tier = getMatchedTier(product, qty);
  if (tier?.price != null) return Number(tier.price);
  if (tier?.discount_percent != null) return base * (1 - Number(tier.discount_percent) / 100);
  return base;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [products, setProducts] = useState([]); const [customerName, setCustomerName] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10)); const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paid, setPaid] = useState(""); const [items, setItems] = useState([blankItem()]); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { fetch("/api/products").then(r => r.json()).then(d => setProducts(d.products || [])); }, []);
  function updateItem(i, patch){setItems(prev=>prev.map((it,idx)=>idx===i?{...it,...patch}:it));}
  function addRow(){setItems(prev=>[...prev,blankItem()]);} function removeRow(i){setItems(prev=>prev.length===1?[blankItem()]:prev.filter((_,idx)=>idx!==i));}
  const detailedItems = useMemo(() => items.map(it => { const p=products.find(x=>String(x.id)===String(it.product_id)); const qty=Number(it.quantity)||0; const rate=computeRate(p,qty); return {...it, product:p, qty, rate, amount:qty*rate, tier:getMatchedTier(p,qty)}; }), [items,products]);
  const totalQty=detailedItems.reduce((s,it)=>s+it.qty,0); const subtotal=detailedItems.reduce((s,it)=>s+it.amount,0); const paidNum=paid===""?subtotal:Number(paid)||0; const balance=Math.max(0,subtotal-paidNum);
  async function handleSubmit(e){e.preventDefault();setError("");const valid=detailedItems.filter(it=>it.product&&it.qty>0);if(!valid.length){setError("Add at least one product line.");return;}for(const it of valid){if(it.qty>Number(it.product.stock_qty||0)){const msg=`Only ${it.product.stock_qty} ${it.product.unit} available for ${it.product.name} / ${it.product.sub_product||"Default"}.`;setError(msg);toast.error(msg);return;}}setSaving(true);try{const res=await fetch("/api/invoices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer_name:customerName.trim()||"Walk-in",invoice_date:invoiceDate,payment_method:paymentMethod,paid:paid===""?subtotal:paidNum,dispatch_stock:true,items:valid.map(it=>({product_id:it.product_id,quantity:it.qty}))})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Unable to create invoice.");toast.success(`Invoice ${data.invoice.invoice_no} created. ${valid.length} stock-out line${valid.length>1?"s":""} recorded.`);notifyActivity();router.push(`/invoices/${data.invoice.id}`);}catch(err){setError(err.message);toast.error(err.message);}finally{setSaving(false);}}
  return <AppShell title="New Invoice"><form onSubmit={handleSubmit} className="space-y-5 max-w-6xl">
    <Card className="p-5"><div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><div><Label>Customer / Buyer</Label><Input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Type customer name or leave blank for Walk-in"/></div><div><Label>Invoice Date</Label><Input type="date" value={invoiceDate} onChange={e=>setInvoiceDate(e.target.value)}/></div><div><Label>Payment Method</Label><Select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank Transfer</option><option value="CARD">Card</option><option value="CREDIT">Credit</option></Select></div></div></Card>
    <Card><CardHeader><div><CardTitle>Products</CardTitle><p className="text-xs text-text-faint mt-1">Same pricing logic as Stock Out. Quantity automatically applies normal or bulk price.</p></div><Button type="button" variant="secondary" size="sm" onClick={addRow}><Plus className="w-4 h-4"/> Add Product</Button></CardHeader><div className="px-5 pb-5 space-y-4">{detailedItems.map((it,idx)=><div key={idx} className="rounded-xl border border-border-soft bg-bg-elevated/30 p-4"><div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"><div className="md:col-span-4"><Label>Main Product</Label><Select value={it.main_product_name} onChange={e=>updateItem(idx,{main_product_name:e.target.value,product_id:""})}><option value="">Select main product</option>{[...new Set(products.map(p=>p.name))].map(name=><option key={name} value={name}>{name}</option>)}</Select></div><div className="md:col-span-4"><Label>Sub Product</Label><Select disabled={!it.main_product_name} value={it.product_id} onChange={e=>updateItem(idx,{product_id:e.target.value})}><option value="">Select sub product</option>{products.filter(p=>p.name===it.main_product_name).map(p=><option key={p.id} value={p.id}>{p.sub_product||"Default"} · {p.stock_qty} {p.unit} available</option>)}</Select></div><div className="md:col-span-2"><Label>Quantity</Label><Input type="number" min="1" max={it.product?.stock_qty} value={it.quantity} onChange={e=>updateItem(idx,{quantity:e.target.value})}/></div><div className="md:col-span-2 flex justify-end"><button type="button" onClick={()=>removeRow(idx)} className="p-2.5 rounded-lg text-danger hover:bg-danger-soft" title="Remove product"><Trash2 className="w-4 h-4"/></button></div></div>
      {it.product&&<div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"><div><p className="text-xs text-text-faint">Normal Price</p><p className="font-mono-num">{formatMoney(it.product.selling_price)}</p></div><div><p className="text-xs text-text-faint">Final Rate</p><p className="font-mono-num text-primary">{formatMoney(it.rate)}</p>{it.tier&&<Badge tone="gold" className="mt-1">Bulk price applied</Badge>}</div><div><p className="text-xs text-text-faint">Qty</p><p className="font-mono-num">{it.qty} {it.product.unit}</p></div><div className="sm:text-right"><p className="text-xs text-text-faint">Line Total</p><p className="font-mono-num text-lg font-semibold">{formatMoney(it.amount)}</p></div></div>}
    </div>)}</div></Card>
    <Card className="overflow-hidden"><div className="bg-primary text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4"><div><div className="flex items-center gap-2"><ShoppingCart className="w-5 h-5"/><p className="text-sm font-medium">Final Invoice Total</p></div><p className="text-xs opacity-80 mt-1">{totalQty} total quantity · {detailedItems.filter(i=>i.product).length} product lines</p></div><p className="font-mono-num text-3xl sm:text-4xl font-bold">{formatMoney(subtotal)}</p></div><div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4"><div><Label>Amount Paid (RM)</Label><Input type="number" step="0.01" min="0" value={paid} onChange={e=>setPaid(e.target.value)} placeholder={`Default ${subtotal.toFixed(2)}`}/></div><div><p className="text-xs text-text-faint">Paid</p><p className="font-mono-num text-lg">{formatMoney(paidNum)}</p></div><div><p className="text-xs text-text-faint">Balance</p><p className={`font-mono-num text-lg ${balance>0?"text-danger":"text-success"}`}>{formatMoney(balance)}</p></div></div></Card>
    {error&&<p className="text-sm text-danger bg-danger-soft border border-danger/30 rounded-md px-3 py-2">{error}</p>}<div className="flex flex-wrap gap-3"><Button type="submit" disabled={saving}>{saving?<Loader2 className="w-4 h-4 animate-spin"/>:<FileText className="w-4 h-4"/>}Create Invoice & Stock Out</Button><Button type="button" variant="secondary" onClick={()=>router.push("/invoices")}>Cancel</Button></div>
  </form></AppShell>;
}
