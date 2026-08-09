"use client";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-gold text-white hover:bg-gold-soft border border-gold shadow-[0_1px_2px_rgba(79,95,224,0.3)]",
  secondary:
    "bg-bg-elevated-2 text-text border border-border hover:border-gold hover:text-gold",
  ghost: "bg-transparent text-text-muted hover:text-text hover:bg-bg-elevated-2",
  danger: "bg-danger/90 text-white border border-danger hover:bg-danger",
  outline: "bg-transparent border border-border text-text hover:border-gold",
};

const sizes = {
  sm: "text-xs px-2.5 py-1.5 gap-1.5",
  md: "text-sm px-3.5 py-2 gap-2",
  lg: "text-sm px-5 py-2.5 gap-2",
  icon: "p-2",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  as: As = "button",
  ...props
}) {
  return (
    <As
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors duration-150 whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </As>
  );
}
