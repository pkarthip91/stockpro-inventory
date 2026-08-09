import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatMoney(n) {
  const num = Number(n || 0);
  return "RM " + num.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(d) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}
