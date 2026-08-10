"use client";

import { useRef, useState } from "react";
import {
  FileSpreadsheet,
  UploadCloud,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Database,
  Download,
  Layers3,
} from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";

export default function ProductImportDialog({ open, onClose, onImported }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  if (!open) return null;

  function reset() {
    setFile(null);
    setPreview(null);
    setLoading(false);
    setImporting(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function close() {
    if (loading || importing) return;
    reset();
    onClose?.();
  }

  async function request(mode) {
    if (!file) {
      toast.error("Choose an Excel or CSV file first.");
      return;
    }

    mode === "preview" ? setLoading(true) : setImporting(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("mode", mode);

      const res = await fetch("/api/products/import-file", {
        method: "POST",
        body,
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || `Import failed (${res.status}).`);

      if (mode === "preview") {
        setPreview(data);
      } else {
        toast.success(data.message || "Products imported successfully.");
        if (data.failed) toast.warning(`${data.failed} rows could not be imported.`);
        onImported?.(data);
        close();
      }
    } catch (error) {
      toast.error(error.message || "Unable to process the file.");
    } finally {
      setLoading(false);
      setImporting(false);
    }
  }

  function chooseFile(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(null);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-border-soft px-6 py-5">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">Import grouped products</h2>
              <p className="mt-1 text-sm text-text-muted">
                Upload Excel/CSV, preview Main Product → Sub Product grouping, then import only new rows.
              </p>
            </div>
          </div>
          <button type="button" onClick={close} className="rounded-lg p-2 text-text-muted hover:bg-bg-elevated-2 hover:text-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
          <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/[0.04] p-6 text-center">
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={chooseFile} className="hidden" />
              <UploadCloud className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 font-medium text-text">{file ? file.name : "Choose product file"}</p>
              <p className="mt-1 text-xs text-text-muted">XLSX, XLS or CSV · maximum 8 MB</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
                  <FileSpreadsheet className="h-4 w-4" /> {file ? "Change file" : "Browse file"}
                </Button>
                <Button as="a" href="/product-import-template.xlsx" variant="outline" download>
                  <Download className="h-4 w-4" /> Download template
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border-soft bg-bg-elevated p-4">
              <div className="flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-primary" />
                <p className="font-medium text-text">Grouped Excel format</p>
              </div>
              <div className="mt-3 rounded-lg border border-border-soft bg-bg-default p-3 text-xs leading-6 text-text-muted">
                <p><b className="text-text">Main Product</b> is written once.</p>
                <p>Following rows can leave Main Product blank.</p>
                <p>Each row contains one <b className="text-text">Sub Product</b>.</p>
                <p className="mt-2 text-text-faint">Category is optional and is not shown in the Products table.</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border-soft">
            <div className="border-b border-border-soft bg-bg-elevated px-4 py-3">
              <p className="font-medium text-text">Excel example</p>
              <p className="text-xs text-text-muted">Blank Main Product cells continue under the previous Main Product.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-xs">
                <thead className="bg-bg-elevated-2 text-left uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-3 py-2.5">Main Product</th>
                    <th className="px-3 py-2.5">Sub Product</th>
                    <th className="px-3 py-2.5 text-right">Cost</th>
                    <th className="px-3 py-2.5 text-right">Selling</th>
                    <th className="px-3 py-2.5 text-right">Bulk Qty</th>
                    <th className="px-3 py-2.5 text-right">Bulk Price</th>
                  </tr>
                </thead>
                <tbody>
                  <ExampleRow main="Sparkling Water" sub="Lime 330ml 24-pack" cost="12.00" selling="18.00" bulkQty="10" bulkPrice="16.50" />
                  <ExampleRow main="" sub="Orange 330ml 24-pack" cost="12.50" selling="18.50" bulkQty="12" bulkPrice="17.00" />
                  <ExampleRow main="" sub="Plain 500ml 12-pack" cost="10.00" selling="15.00" bulkQty="" bulkPrice="" />
                </tbody>
              </table>
            </div>
          </div>

          {!preview ? (
            <div className="flex justify-end">
              <Button type="button" disabled={!file || loading} onClick={() => request("preview")}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                Preview import
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Rows found" value={preview.total} icon={Database} />
                <Stat label="Main products" value={preview.mainGroups} icon={Layers3} />
                <Stat label="New sub products" value={preview.new} icon={CheckCircle2} good />
                <Stat label="Already exists" value={preview.existing} icon={AlertTriangle} />
              </div>

              {preview.duplicatesInFile > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700">
                  {preview.duplicatesInFile} duplicate row{preview.duplicatesInFile === 1 ? "" : "s"} found inside this file. They will be skipped.
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-border-soft">
                <div className="border-b border-border-soft bg-bg-elevated px-4 py-3">
                  <p className="font-medium text-text">Grouped preview</p>
                  <p className="text-xs text-text-muted">Existing Main Product + Sub Product pairs are skipped. Stock quantity is never changed by this import.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-bg-elevated-2 text-left text-xs uppercase tracking-wide text-text-muted">
                      <tr>
                        <th className="px-4 py-3">Main Product</th>
                        <th className="px-4 py-3">Sub Product</th>
                        <th className="px-4 py-3 text-right">Pack</th>
                        <th className="px-4 py-3 text-right">Bulk Qty</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview?.map((row, index) => (
                        <tr key={`${row.row}-${index}`} className="border-t border-border-soft">
                          <td className="px-4 py-3 font-medium text-text">{row.main}</td>
                          <td className="px-4 py-3 text-text-muted">{row.sub}</td>
                          <td className="px-4 py-3 text-right font-mono-num">{row.pack_size}</td>
                          <td className="px-4 py-3 text-right font-mono-num">{row.bulk_qty || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${row.exists ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
                              {row.exists ? "Skip duplicate" : "New"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
                <p className="text-sm font-medium text-text">Safe import + easy rollback</p>
                <p className="mt-1 text-xs text-text-muted">
                  Imported rows start with stock 0 and are tagged as one import batch. If the upload was a mistake, use “Delete latest import” on the Products page.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" disabled={importing} onClick={() => setPreview(null)}>
                  Back
                </Button>
                <Button type="button" disabled={importing || preview.new <= 0} onClick={() => request("import")}>
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  Import {preview.new} new sub product{preview.new === 1 ? "" : "s"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ExampleRow({ main, sub, cost, selling, bulkQty, bulkPrice }) {
  return (
    <tr className="border-t border-border-soft first:border-t-0">
      <td className="px-3 py-2.5 font-medium text-text">{main || <span className="text-text-faint">↳ same main product</span>}</td>
      <td className="px-3 py-2.5 text-text-muted">{sub}</td>
      <td className="px-3 py-2.5 text-right font-mono-num">{cost}</td>
      <td className="px-3 py-2.5 text-right font-mono-num">{selling}</td>
      <td className="px-3 py-2.5 text-right font-mono-num">{bulkQty || "—"}</td>
      <td className="px-3 py-2.5 text-right font-mono-num">{bulkPrice || "—"}</td>
    </tr>
  );
}

function Stat({ label, value, icon: Icon, good }) {
  return (
    <div className="rounded-xl border border-border-soft bg-bg-elevated p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">{label}</p>
        <Icon className={`h-4 w-4 ${good ? "text-emerald-500" : "text-primary"}`} />
      </div>
      <p className="mt-2 text-2xl font-semibold font-mono-num text-text">{value ?? 0}</p>
    </div>
  );
}
