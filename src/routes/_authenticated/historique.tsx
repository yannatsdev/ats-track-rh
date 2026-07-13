import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { listMySheets } from "@/lib/sheets.functions";
import { formatWeekRange } from "@/lib/week";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/historique")({
  head: () => ({ meta: [{ title: "Historique — ATS TRACK RH" }] }),
  component: HistoPage,
});

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-slate-100 text-slate-700" },
  submitted: { label: "Soumise", className: "bg-blue-50 text-blue-700" },
  hr_validated: { label: "Validée RH", className: "bg-amber-50 text-amber-700" },
  direction_validated: { label: "Validée Direction", className: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Rejetée", className: "bg-red-50 text-red-700" },
};

function HistoPage() {
  const fn = useServerFn(listMySheets);
  const { data } = useQuery({ queryKey: ["my-sheets"], queryFn: () => fn({}) });
  const sheets = data ?? [];
  return (
    <div>
      <PageHeader title="Mon historique" subtitle="Toutes vos fiches passées, du plus récent au plus ancien." />
      <div className="space-y-3">
        {sheets.length === 0 && (
          <Card className="p-10 rounded-2xl border-dashed text-center text-muted-foreground">
            Aucune fiche pour le moment.
          </Card>
        )}
        {sheets.map((s) => {
          const st = STATUS_LABEL[s.status] ?? STATUS_LABEL.draft;
          return (
            <Card key={s.id} className="p-5 rounded-2xl border-0 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="font-semibold">Semaine du {formatWeekRange(s.week_start)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Mise à jour {new Date(s.updated_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <Badge className={st.className}>{st.label}</Badge>
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