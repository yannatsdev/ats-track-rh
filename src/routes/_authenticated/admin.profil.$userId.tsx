import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Mail, Briefcase, Building2, History, FileText } from "lucide-react";
import { adminListUserSheets } from "@/lib/sheets.functions";
import { useMe } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/admin/profil/$userId")({
  head: () => ({ meta: [{ title: "Profil employé — ATS TRACK RH" }] }),
  component: ProfilPage,
});

function ProfilPage() {
  const me = useMe();
  const { userId } = Route.useParams();
  const fn = useServerFn(adminListUserSheets);
  const { data } = useQuery({
    queryKey: ["admin-profil", userId],
    queryFn: () => fn({ data: { userId } }),
    enabled: me.isStaff,
  });
  if (!me.isStaff) return <Navigate to="/dashboard" />;

  const p = data?.profile;
  const sheets = data?.sheets ?? [];
  const fullName = `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || "Employé";
  const initials = ((p?.first_name?.[0] ?? "") + (p?.last_name?.[0] ?? "")).toUpperCase() || "?";

  const total = sheets.length;
  const validated = sheets.filter((s) => s.status === "direction_validated" || s.status === "hr_validated").length;
  const submitted = sheets.filter((s) => s.status === "submitted").length;
  const drafts = sheets.filter((s) => s.status === "draft").length;

  return (
    <div>
      <div className="mb-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/employes"><ArrowLeft className="h-4 w-4 mr-1" />Retour au suivi</Link>
        </Button>
      </div>
      <PageHeader title="Profil employé" subtitle="Informations et activité" />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6 rounded-2xl border-0 shadow-[var(--shadow-card)] md:col-span-1">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 ring-2 ring-primary/30">
              <AvatarImage src={(p as { avatar_url?: string | null } | null)?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xl bg-secondary">{initials}</AvatarFallback>
            </Avatar>
            <div className="mt-4 font-semibold text-lg">{fullName}</div>
            <div className="text-sm text-muted-foreground">{p?.fonction ?? "—"}</div>
            {p?.service && <Badge variant="secondary" className="mt-2">{p.service}</Badge>}
          </div>
          <div className="mt-6 space-y-3 text-sm">
            {(p as { email?: string | null } | null)?.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" /><span className="truncate">{(p as { email?: string }).email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Briefcase className="h-4 w-4" /><span>{p?.fonction ?? "Non renseignée"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" /><span>{p?.service ?? "Non renseigné"}</span>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/historique/$userId" params={{ userId }}>
                <History className="h-4 w-4 mr-2" />Historique des fiches
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-[var(--shadow-card)] md:col-span-2">
          <h3 className="font-semibold mb-4">Activité</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Fiches" value={total} />
            <Stat label="Validées" value={validated} tone="ok" />
            <Stat label="Soumises" value={submitted} tone="info" />
            <Stat label="Brouillons" value={drafts} tone="muted" />
          </div>
          <div className="mt-6">
            <div className="text-sm font-medium mb-2">Dernières fiches</div>
            {sheets.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center border rounded-xl border-dashed">
                Aucune fiche enregistrée.
              </div>
            ) : (
              <div className="space-y-2">
                {sheets.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>Semaine du {new Date(s.week_start).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/admin/employes/$id" params={{ id: s.id }}>Voir</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "ok" | "info" | "muted" }) {
  const cls =
    tone === "ok" ? "text-emerald-600" :
    tone === "info" ? "text-blue-600" :
    tone === "muted" ? "text-muted-foreground" : "text-foreground";
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${cls}`}>{value}</div>
    </div>
  );
}