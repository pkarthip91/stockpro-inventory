"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Printer } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Card, Skeleton } from "@/components/ui";
import Button from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

const BRAND = {
  name: "NECTAR HEAVEN",
  accent: "#7f68f3",
  accentDark: "#6751df",
  address1: "21 JALAN FAUNA 12",
  address2: "63000 CYBERJAYA",
  address3: "SELANGOR MALAYSIA",
  phone: "+6010-000 8400",
  email: "admin@nectarheaven.com",
};

function money(value) {
  return Number(value || 0).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function numberToWords(num) {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function c(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? `-${a[n % 10]}` : "");
    if (n < 1000) return `${a[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${c(n % 100)}` : ""}`;
    if (n < 1000000) return `${c(Math.floor(n / 1000))} Thousand${n % 1000 ? ` ${c(n % 1000)}` : ""}`;
    return String(n);
  }

  return Math.floor(num) === 0 ? "Zero" : c(Math.floor(num));
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch(`/api/invoices/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setInvoice(d.invoice);
        setItems(d.items || []);
      });
  }, [id]);

  if (!invoice) {
    return (
      <AppShell title="Invoice">
        <Card className="p-8 max-w-4xl mx-auto">
          <Skeleton className="h-16 w-full mb-4" />
          <Skeleton className="h-96 w-full" />
        </Card>
      </AppShell>
    );
  }

  const totalQty = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  const totalRate = items.reduce((sum, it) => sum + Number(it.rate || 0), 0);

  return (
    <AppShell title={`Invoice ${invoice.invoice_no}`}>
      <div className="max-w-5xl mx-auto flex justify-between mb-4 print:hidden">
        <Button variant="secondary" size="sm" onClick={() => router.push("/invoices")}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> Print Invoice
        </Button>
      </div>

      <section className="invoice-paper max-w-5xl mx-auto bg-white text-black shadow-sm print:shadow-none">
        <div className="invoice-top grid grid-cols-2 gap-6 px-6 sm:px-8 pt-7 pb-5 items-start print:px-[16mm] print:pt-[12mm] print:pb-[7mm]">
          <div className="text-[11px] leading-[1.4]">
            <p className="font-bold text-[15px]" style={{ color: BRAND.accent }}>
              {BRAND.name}
            </p>
            <p>{BRAND.address1}</p>
            <p>{BRAND.address2}</p>
            <p>{BRAND.address3}</p>
            <p>{BRAND.phone}</p>
            <p>{BRAND.email}</p>
          </div>

          <div className="relative h-24 w-full max-w-[330px] ml-auto print:h-[25mm] print:max-w-[75mm]">
            <Image
              src="/logo-transparent.png"
              alt="Nectar Heaven"
              fill
              className="object-contain object-right"
              priority
            />
          </div>
        </div>

        <div
          className="invoice-title-band text-white text-center text-[20px] tracking-[0.16em] py-2 font-semibold"
          style={{ backgroundColor: BRAND.accent }}
        >
          INVOICE
        </div>

        <div className="grid grid-cols-2 gap-6 px-6 sm:px-8 py-5 text-[11px] min-h-[115px] print:px-[16mm] print:py-[8mm] print:min-h-0">
          <div>
            <p className="font-bold">Bill To</p>
            <p className="font-bold uppercase">{invoice.customer_name || "WALK-IN CUSTOMER"}</p>
            {invoice.customer_address && (
              <p className="font-bold uppercase">{invoice.customer_address}</p>
            )}
            <p className="mt-4">{invoice.customer_phone || ""}</p>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-x-4 content-start justify-end text-right">
            <p className="font-bold">INVOICE No.:</p>
            <p>{invoice.invoice_no}</p>
            <p className="font-bold">Date:</p>
            <p>{formatDate(invoice.invoice_date)}</p>
          </div>
        </div>

        <div className="px-6 sm:px-8 print:px-[16mm]">
          <table className="invoice-table w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-white" style={{ backgroundColor: BRAND.accent }}>
                <th className="border border-[#d2d2d2] px-2 py-2 text-center w-10">No.</th>
                <th className="border border-[#d2d2d2] px-2 py-2 text-left">Product</th>
                <th className="border border-[#d2d2d2] px-2 py-2 text-right w-36">Quantity</th>
                <th className="border border-[#d2d2d2] px-2 py-2 text-right w-36">Rate</th>
                <th className="border border-[#d2d2d2] px-2 py-2 text-right w-36">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, index) => (
                <tr key={it.id || index}>
                  <td className="border border-[#d2d2d2] px-2 py-2 text-center align-top">
                    {index + 1}
                  </td>
                  <td className="border border-[#d2d2d2] px-2 py-2 align-top">
                    <p className="font-bold uppercase leading-tight">
                      {it.product_main_name || it.product_name}
                    </p>
                    {it.product_sub_name && <p className="uppercase">{it.product_sub_name}</p>}
                    <p className="uppercase text-[10px]">{it.category_name || ""}</p>
                  </td>
                  <td className="border border-[#d2d2d2] px-2 py-2 text-right align-top">
                    <p className="font-bold">{it.quantity}</p>
                    <p className="uppercase">{it.unit || "UNIT"}</p>
                  </td>
                  <td className="border border-[#d2d2d2] px-2 py-2 text-right align-top">
                    {money(it.rate)}
                  </td>
                  <td className="border border-[#d2d2d2] px-2 py-2 text-right align-top">
                    {money(it.amount)}
                  </td>
                </tr>
              ))}

              <tr className="font-medium">
                <td className="border border-[#d2d2d2] px-2 py-2" colSpan="2">
                  Subtotal
                </td>
                <td className="border border-[#d2d2d2] px-2 py-2 text-right">{totalQty}</td>
                <td className="border border-[#d2d2d2] px-2 py-2 text-right">RM {money(totalRate)}</td>
                <td className="border border-[#d2d2d2] px-2 py-2 text-right">RM {money(invoice.subtotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-8 px-6 sm:px-8 pt-4 pb-10 text-[11px] print:px-[16mm] print:pt-[7mm] print:pb-[12mm]">
          <div>
            <p className="font-bold">Payment Detail</p>
            <div className="grid grid-cols-[110px_1fr] mt-1">
              <span>Payable To</span>
              <span className="font-bold">{invoice.payment_method || "CASH ONLY"}</span>
            </div>

            <p
              className="mt-7 font-bold text-[16px] border-b-[4px] inline-block pb-1 pr-3"
              style={{ color: BRAND.accentDark, borderColor: BRAND.accent }}
            >
              Thank you! Happy Business!
            </p>
          </div>

          <div>
            <div className="ml-auto max-w-[320px] text-[14px]">
              <div className="flex justify-between font-bold" style={{ color: BRAND.accentDark }}>
                <span>Total</span>
                <span>RM {money(invoice.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid</span>
                <span>RM {money(invoice.paid)}</span>
              </div>
              <div
                className="mt-1 pt-1 flex justify-between font-bold border-t-2"
                style={{ color: BRAND.accentDark, borderColor: BRAND.accent }}
              >
                <span>Balance</span>
                <span>RM {money(invoice.balance)}</span>
              </div>
            </div>

            <div className="text-right mt-5">
              <p>Amount in words</p>
              <p className="font-bold">{numberToWords(invoice.total)}</p>
              <p className="font-bold">Ringgit Only</p>
            </div>

            <div className="text-right mt-8 pr-4 invoice-signature">
              <div className="h-10" />
              <p className="font-bold uppercase">ARJUN DASS</p>
              <p>Signature</p>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
