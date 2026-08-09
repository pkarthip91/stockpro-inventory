import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn("card-shadow", className)}
      style={{
        background: "var(--ny-card)",
        border: "1px solid var(--ny-border)",
        borderRadius: "var(--ny-radius)",
        color: "var(--ny-body)",
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn("px-5 pt-5 pb-3 flex items-center justify-between gap-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn("font-display text-[15px] tracking-wide text-text-muted uppercase", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn("px-5 pb-5", className)} {...props}>
      {children}
    </div>
  );
}

export function Badge({ className, tone = "default", children, ...props }) {
  const tones = {
    default: "bg-bg-elevated-2 text-text-muted border-border",
    gold: "bg-gold/10 text-gold-soft border-gold-dim/60",
    success: "bg-success-soft text-success border-success/40",
    danger: "bg-danger-soft text-danger border-danger/40",
    info: "bg-info-soft text-info border-info/40",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className, style }) {
  return <div className={cn("skeleton", className)} style={style} />;
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <Card className="p-5">
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-7 w-32 mb-2" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full mt-3" />
      ))}
    </Card>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} lines={1} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-5">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-48 w-full" />
        </Card>
        <CardSkeleton lines={5} />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-border-soft">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/5" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "w-full rounded-md bg-bg-elevated-2 border border-border px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none focus:border-gold focus:ring-2 focus:ring-gold/15 transition disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-bg-elevated",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "w-full rounded-md bg-bg-elevated-2 border border-border px-3 py-2 text-sm text-text outline-none focus:border-gold focus:ring-2 focus:ring-gold/15 transition disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-bg-elevated",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, children, ...props }) {
  return (
    <label className={cn("block text-xs font-medium text-text-muted mb-1.5 tracking-wide", className)} {...props}>
      {children}
    </label>
  );
}
