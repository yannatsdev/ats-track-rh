import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Label } from "@/components/ui/label";
import { adminGetSheet, submitValidation, getCoachAdvice } from "@/lib/sheets.functions";
import { formatWeekRange, DAY_LABELS } from "@/lib/week";
import { useMe } from "@/components/app-shell";
import { ArrowLeft, Check, X, Sparkles, Loader2, Lightbulb } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/employes/$id")({
  head: () => ({ meta: [{ title: "Fiche employé — ATS TRACK RH" }] }),
  component: EmpSheet,
});

function EmpSheet() {
  const me = useMe();
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetSheet);
  const validateFn = useServerFn(submitValidation);
  const { data } = useQuery({
    queryKey: ["admin-sheet", id],
    queryFn: () => getFn({ data: { id } }),
    enabled: me.isStaff,
  });
  const [commentHR, setCommentHR] = useState("");
  const [commentDir, setCommentDir] = useState("");

  if (!me.isStaff) return <Navigate to="/dashboard" />;
  if (!data) return null;

  async function act(role: "hr" | "direction", statut: "approved" | "rejected", commentaire: string) {
    await validateFn({ data: { sheet_id: id, role, statut, commentaire } });
    toast.success(statut === "approved" ? "Fiche validée" : "Fiche rejetée");
    await qc.invalidateQueries({ queryKey: ["admin-sheet", id] });
  }

  const { sheet, entries, profile, validations, dayNotes } = data;
  const canHR = me.roles.includes("hr") || me.roles.includes("admin");
  const canDir = me.roles.includes("direction") || me.roles.includes("admin");
  const showCoach = me.roles.includes("direction") || me.roles.includes("admin");

  return (
    <div>
      <div className="mb-2">
        <Button variant="ghost" size="sm" asChild><Link to="/admin/employes"><ArrowLeft className="h-4 w-4 mr-1" />Retour</Link></Button>
      </div>
      <PageHeader
        title={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`}
        subtitle={`${profile?.fonction ?? "—"} · ${profile?.service ?? "—"} · Semaine du ${formatWeekRange(sheet.week_start)}`}
      />
      {showCoach && <AdminCoachCard sheetId={sheet.id} hasEntries={entries.length > 0} />}
      <div className="space-y-4">
        {DAY_LABELS.map((d, i) => {
          const day = i + 1;
          const de = entries.filter((e) => e.day === day);
          const note = (dayNotes ?? []).find((n) => n.day === day);
          if (de.length === 0 && !note) return null;
          return (
            <Card key={d} className="p-5 rounded-2xl border-0 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">{d}</div>
                {note && (
                  <div className="text-xs text-muted-foreground">
                    Avancement du jour : <span className="font-semibold text-primary">{note.avancement_pct}%</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {de.map((e) => (
                  <div key={e.id} className="grid grid-cols-[80px_1fr_1fr_auto] gap-3 items-center py-2 border-t first:border-0">
                    <div className="text-xs text-muted-foreground">{e.heure || "—"}</div>
                    <div className="text-sm font-medium">{e.tache}</div>
                    <div className="text-sm text-muted-foreground">{e.resultat || "—"}</div>
                    <StatusBadge statut={e.statut as "done" | "in_progress" | "postponed"} />
                  </div>
                ))}
              </div>
              {note && (note.motif_report || note.difficultes || note.observations) && (
                <div className="grid gap-3 md:grid-cols-3 mt-4 pt-4 border-t text-sm">
                  {note.motif_report && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Motif du report</div>
                      <div>{note.motif_report}</div>
                    </div>
                  )}
                  {note.difficultes && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Difficultés</div>
                      <div>{note.difficultes}</div>
                    </div>
                  )}
                  {note.observations && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Observations</div>
                      <div>{note.observations}</div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
        {entries.length === 0 && (
          <Card className="p-10 rounded-2xl border-dashed text-center text-muted-foreground">Aucune tâche saisie.</Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-6">
        <ValidationCard title="Avis Service RH" disabled={!canHR}
          value={commentHR} onChange={setCommentHR}
          existing={validations.find((v) => v.role === "hr")}
          onApprove={() => act("hr", "approved", commentHR)}
          onReject={() => act("hr", "rejected", commentHR)} />
        <ValidationCard title="Avis Direction Générale" disabled={!canDir}
          value={commentDir} onChange={setCommentDir}
          existing={validations.find((v) => v.role === "direction")}
          onApprove={() => act("direction", "approved", commentDir)}
          onReject={() => act("direction", "rejected", commentDir)} />
      </div>
    </div>
  );
}

function ValidationCard({
  title, disabled, value, onChange, existing, onApprove, onReject,
}: {
  title: string; disabled: boolean; value: string; onChange: (v: string) => void;
  existing?: { statut: string; commentaire: string | null; validated_at: string | null };
  onApprove: () => void; onReject: () => void;
}) {
  const isValidated = existing?.statut === "approved";
  return (
    <Card className="p-5 rounded-2xl border-0 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {existing && (
          <span className={`text-xs px-2.5 py-1 rounded-full ${isValidated ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {isValidated ? "Validé" : "Rejeté"}
          </span>
        )}
      </div>
      {existing ? (
        <div className="text-sm text-muted-foreground">
          {existing.commentaire || <em>Sans commentaire.</em>}
          <div className="text-xs mt-2 opacity-70">{existing.validated_at ? new Date(existing.validated_at).toLocaleString("fr-FR") : ""}</div>
        </div>
      ) : (
        <>
          <Label className="text-xs">Commentaire</Label>
          <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="mt-1" disabled={disabled} />
          <div className="flex gap-2 mt-3">
            <Button onClick={onApprove} disabled={disabled} className="flex-1"><Check className="h-4 w-4 mr-1" />Valider</Button>
            <Button onClick={onReject} disabled={disabled} variant="outline" className="flex-1"><X className="h-4 w-4 mr-1" />Rejeter</Button>
          </div>
        </>
      )}
    </Card>
  );
}

function AdminCoachCard({ sheetId, hasEntries }: { sheetId: string; hasEntries: boolean }) {
  const coachFn = useServerFn(getCoachAdvice);
  const [advice, setAdvice] = useState<{
    resume: string; score: number; priorites: string[]; risques: string[]; encouragement: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true); setError(null);
    try {
      const r = await coachFn({ data: { sheet_id: sheetId } });
      setAdvice(r);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <Card className="p-5 rounded-2xl border-0 shadow-[var(--shadow-card)] mb-4 bg-gradient-to-br from-[oklch(0.98_0.02_74)] to-card">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full grid place-items-center bg-[oklch(0.72_0.14_74)]/15 text-[oklch(0.55_0.14_74)] shrink-0">
          <Lightbulb className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="font-semibold">Analyse Coach IA</h3>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[oklch(0.72_0.14_74)]/20 text-[oklch(0.45_0.14_74)]">
              Vue Direction
            </span>
            {advice && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                Score {advice.score}/100
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={run}
              disabled={loading || !hasEntries}
              className="ml-auto h-7 rounded-full text-xs"
            >
              {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
              {advice ? "Analyser à nouveau" : "Analyser la semaine"}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive mb-2">{error}</p>}
          {advice ? (
            <div className="space-y-3 text-sm">
              {advice.resume && <p className="text-foreground font-medium">{advice.resume}</p>}
              {advice.priorites.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Priorités recommandées</div>
                  <ul className="space-y-1 list-disc pl-5 text-foreground/85">
                    {advice.priorites.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
              {advice.risques.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Points d'attention</div>
                  <ul className="space-y-1 list-disc pl-5 text-foreground/85">
                    {advice.risques.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
              {advice.encouragement && (
                <p className="text-xs italic text-muted-foreground border-l-2 border-[oklch(0.72_0.14_74)] pl-3">
                  {advice.encouragement}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Lancez l'analyse pour obtenir un score, les priorités et les risques identifiés par l'IA sur la semaine de cet employé.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}