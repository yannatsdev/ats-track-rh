import { useMe } from "./app-shell";
import { primaryRole, ROLE_LABEL } from "@/lib/roles";
import { Star, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function RightProfilePanel() {
  const me = useMe();
  const role = primaryRole(me.roles);
  const name = [me.profile?.first_name, me.profile?.last_name].filter(Boolean).join(" ") || "Utilisateur";
  const initials = ((me.profile?.first_name?.[0] ?? "") + (me.profile?.last_name?.[0] ?? "")).toUpperCase() || "AT";

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
          <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-white/5 h-7 px-2 text-xs">
            Voir tout <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        <div className="space-y-2">
          <StatusRow label="Fiche en cours" value="Brouillon" tone="warn" />
          <StatusRow label="Validation RH" value="En attente" tone="muted" />
          <StatusRow label="Validation Direction" value="—" tone="muted" />
        </div>
      </div>
      <div className="mt-6 rounded-2xl bg-white/5 p-4 border border-white/5">
        <div className="text-xs text-white/60">Rappel</div>
        <div className="text-sm mt-1">Soumettez votre fiche avant vendredi 17h.</div>
      </div>
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