import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function KpiRingCard({
  label, value, percent, delta, color = "var(--primary)", suffix = "",
}: {
  label: string; value: string | number; percent: number; delta?: number; color?: string; suffix?: string;
}) {
  const size = 72;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (Math.max(0, Math.min(100, percent)) / 100);

  return (
    <Card className="p-5 rounded-2xl border-0 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground truncate">{label}</div>
          <div className="text-3xl font-bold tracking-tight mt-2">
            {value}
            {suffix && <span className="text-sm text-muted-foreground ml-1">{suffix}</span>}
          </div>
          {delta !== undefined && (
            <div className={`inline-flex items-center gap-1 text-xs mt-2 font-medium ${delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta)}% vs sem. préc.
            </div>
          )}
        </div>
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`} style={{ transition: "stroke-dasharray 400ms ease" }} />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-xs font-bold">{percent}%</div>
        </div>
      </div>
    </Card>
  );
}