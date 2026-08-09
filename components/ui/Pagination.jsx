"use client";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import Button from "@/components/ui/Button";

function pageItems(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const items = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) items.push("left-ellipsis");
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < pages - 1) items.push("right-ellipsis");
  items.push(pages);
  return items;
}

export default function Pagination({ page = 1, pages = 1, onPageChange, total, label = "records" }) {
  if (pages <= 1 && !total) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-border-soft">
      <p className="text-xs text-text-faint">{total != null ? `${total} ${label} · ` : ""}Page {page} of {Math.max(1, pages)}</p>
      <div className="flex items-center gap-1 flex-wrap">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Previous</span>
        </Button>
        {pageItems(page, Math.max(1, pages)).map((item) => typeof item === "number" ? (
          <button key={item} type="button" onClick={() => onPageChange(item)} className={`min-w-9 h-9 px-2 rounded-md text-sm border transition ${item === page ? "bg-primary text-white border-primary" : "bg-bg-elevated-2 text-text-muted border-border hover:text-text hover:border-gold/50"}`}>
            {item}
          </button>
        ) : (
          <span key={item} className="w-8 h-9 inline-flex items-center justify-center text-text-faint"><MoreHorizontal className="w-4 h-4" /></span>
        ))}
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <span className="hidden sm:inline">Next</span> <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
