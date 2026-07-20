import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Eye } from "lucide-react";
import { adminListUserSheets } from "@/lib/sheets.functions";
import { formatWeekRange } from "@/lib/week";
import { useMe } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/admin/historique/$userId")({
  head: () => ({ meta: [{ title: "Historique employé — ATS TRACK RH" }] }),
  component: AdminHistoPage,
});

const STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-slate-100 text-slate-700" },
  submitted: { label: "Soumise", className: "bg-blue-50 text-blue-700" },
  hr_validated: { label: "Validée RH", className: "bg-amber-50 text-amber-700" },
  direction_validated: { label: "Validée Direction", className: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Rejetée", className: "bg-red-50 text-red-700" },
};

function AdminHistoPage() {
  const me = useMe();
  const { userId } = Route.useParams();
  const fn = useServerFn(adminListUserSheets);
  const { data } = useQuery({
    queryKey: ["admin-user-sheets", userId],
    queryFn: () => fn({ data: { userId } }),
    enabled: me.isStaff,
  });
  if (!me.isStaff) return <Navigate to="/dashboard" />;
  const sheets = data?.sheets ?? [];
  const p = data?.profile;
  return (
    <div>
      <div className="mb-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/employes"><ArrowLeft className="h-4 w-4 mr-1" />Retour</Link>
        </Button>
      </div>
      <PageHeader
        title={`Historique — ${p?.first_name ?? ""} ${p?.last_name ?? ""}`}
        subtitle={`${sheets.length} fiche(s) enregistrée(s)`}
      />
      <div className="space-y-3">
        {sheets.length === 0 && (
          <Card className="p-10 rounded-2xl border-dashed text-center text-muted-foreground">
            Aucune fiche pour cet employé.
          </Card>
        )}
        {sheets.map((s) => {
          const st = STATUS[s.status] ?? STATUS.draft;
          return (
            <Card key={s.id} className="p-5 rounded-2xl border-0 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="font-semibold">Semaine du {formatWeekRange(s.week_start)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Mise à jour {new Date(s.updated_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={st.className}>{st.label}</Badge>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/admin/employes/$id" params={{ id: s.id }}>
                      <Eye className="h-4 w-4 mr-1" />Voir
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Avancement</span>
                  <span className="font-semibold">{s.avancement_global}%</span>
                </div>
                <Progress value={s.avancement_global} className="h-2" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}