import { cn } from "@/lib/utils";

export type Statut = "done" | "in_progress" | "postponed";

const CONFIG: Record<Statut, { label: string; className: string; dot: string }> = {
  done: { label: "Terminée", className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  in_progress: { label: "En cours", className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-primary" },
  postponed: { label: "Reportée", className: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
};

export function StatusBadge({ statut }: { statut: Statut }) {
  const c = CONFIG[statut];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border", c.className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}