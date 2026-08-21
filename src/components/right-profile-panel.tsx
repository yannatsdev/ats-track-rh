import { useMe } from "./app-shell";
import { primaryRole, ROLE_LABEL } from "@/lib/roles";
import { Star, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { getOrCreateCurrentSheet } from "@/lib/sheets.functions";
import { isoWeekStart } from "@/lib/week";

export function RightProfilePanel() {
  const me = useMe();
  const role = primaryRole(me.roles);
  const name = [me.profile?.first_name, me.profile?.last_name].filter(Boolean).join(" ") || "Utilisateur";
  const initials = ((me.profile?.first_name?.[0] ?? "") + (me.profile?.last_name?.[0] ?? "")).toUpperCase() || "AT";
  const fn = useServerFn(getOrCreateCurrentSheet);
  const weekStart = isoWeekStart();
  const { data } = useQuery({
    queryKey: ["current-sheet", weekStart],
    queryFn: () => fn({ data: { weekStart } }),
  });
  const status = data?.sheet?.status ?? "draft";
  const validations = (data?.validations ?? []) as Array<{ role: string; statut: string }>;
  const hr = validations.find((v) => v.role === "hr");
  const dir = validations.find((v) => v.role === "direction");

  const sheetLabel =
    status === "draft" ? "Brouillon" :
    status === "submitted" ? "Soumise" :
    status === "hr_validated" ? "Validée RH" :
    status === "direction_validated" ? "Validée Direction" :
    status === "rejected" ? "Rejetée" : status;
  const sheetTone: "warn" | "ok" | "muted" =
    status === "direction_validated" || status === "hr_validated" ? "ok" :
    status === "rejected" ? "warn" : "warn";

  const valDisplay = (v?: { statut: string }) => {
    if (!v) return { label: "En attente", tone: "muted" as const };
    if (v.statut === "approved") return { label: "Validée", tone: "ok" as const };
    if (v.statut === "rejected") return { label: "Rejetée", tone: "warn" as const };
    return { label: v.statut, tone: "muted" as const };
  };
  const hrDisp = valDisplay(hr);
  const dirDisp = valDisplay(dir);

  return (
    <div className="rounded-3xl p-5 text-white sticky top-24" style={{ background: "var(--sidebar)" }}>
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 ring-2 ring-primary/40">
          <AvatarImage src={me.profile?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-sidebar-accent text-white font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="font-semibold truncate">{name}</div>
          <div className="text-xs text-white/60 truncate">{me.profile?.fonction ?? ROLE_LABEL[role]}</div>
        </div>
        <Star className="h-4 w-4 ml-auto text-primary fill-current" />
      </div>
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-wider text-white/50">Semaine en cours</div>
          <Button asChild size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-white/5 h-7 px-2 text-xs">
            <Link to="/fiche">Voir tout <ChevronRight className="h-3 w-3" /></Link>
          </Button>
        </div>
        <div className="space-y-2">
          <StatusRow label="Fiche en cours" value={sheetLabel} tone={sheetTone} />
          <StatusRow label="Validation RH" value={hrDisp.label} tone={hrDisp.tone} />
          <StatusRow label="Validation Direction" value={dirDisp.label} tone={dirDisp.tone} />
        </div>
      </div>
      {/* Rappel de soumission déplacé dans le Coach ATS pour plus de clarté */}
    </div>
  );
}

function StatusRow({ label, value, tone }: { label: string; value: string; tone: "warn" | "ok" | "muted" }) {
  const dot = tone === "warn" ? "bg-primary" : tone === "ok" ? "bg-emerald-400" : "bg-white/30";
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
      <div className="text-xs text-white/70">{label}</div>
      <div className="flex items-center gap-2 text-xs text-white">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {value}
      </div>
    </div>
  );
}