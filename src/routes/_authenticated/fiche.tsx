import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, type Statut } from "@/components/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, Check, Send, Loader2, Sparkles, Save, Unlock, Lightbulb, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import {
  getOrCreateCurrentSheet, upsertDailyEntry, deleteDailyEntry, updateSheet, upsertDayNote,
  getCoachAdvice,
} from "@/lib/sheets.functions";
import { isoWeekStart, formatWeekRange, DAY_LABELS } from "@/lib/week";

export const Route = createFileRoute("/_authenticated/fiche")({
  head: () => ({ meta: [{ title: "Fiche de la semaine — ATS TRACK RH" }] }),
  component: FichePage,
});

type Entry = {
  id?: string; sheet_id: string; day: number; heure: string; tache: string;
  resultat: string; statut: Statut; motif_report: string; avancement_pct: number; position: number;
};
type DayNote = {
  id?: string; sheet_id: string; day: number;
  motif_report: string; avancement_pct: number; difficultes: string; observations: string;
};

function FichePage() {
  const qc = useQueryClient();
  const weekStart = isoWeekStart();
  const getSheet = useServerFn(getOrCreateCurrentSheet);
  const upsert = useServerFn(upsertDailyEntry);
  const remove = useServerFn(deleteDailyEntry);
  const update = useServerFn(updateSheet);
  const upsertNote = useServerFn(upsertDayNote);

  const { data, isLoading } = useQuery({
    queryKey: ["current-sheet", weekStart],
    queryFn: () => getSheet({ data: { weekStart } }),
  });

  const [activeDay, setActiveDay] = useState("1");
  const [saving, setSaving] = useState(false);

  const entries = ((data?.entries ?? []) as unknown as Entry[]);
  const dayNotes = ((data?.dayNotes ?? []) as unknown as DayNote[]);
  const sheet = data?.sheet;

  const completion = useMemo(() => {
    if (!entries.length) return 0;
    return Math.round(entries.reduce((a, b) => a + (b.avancement_pct ?? 0), 0) / entries.length);
  }, [entries]);

  const dayComplete = (d: number) => entries.some((e) => e.day === d && e.tache.trim().length > 0);

  async function addRow(day: number) {
    if (!sheet) return;
    setSaving(true);
    try {
      await upsert({ data: {
        sheet_id: sheet.id, day, heure: "", tache: "Nouvelle tâche", resultat: "",
        statut: "in_progress", motif_report: "", avancement_pct: 0,
        position: entries.filter((e) => e.day === day).length,
      }});
      await qc.invalidateQueries({ queryKey: ["current-sheet", weekStart] });
    } finally { setSaving(false); }
  }

  async function saveEntry(entry: Entry) {
    setSaving(true);
    try {
      await upsert({ data: entry });
      await qc.invalidateQueries({ queryKey: ["current-sheet", weekStart] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  async function deleteRow(id?: string) {
    if (!id) return;
    await remove({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["current-sheet", weekStart] });
  }

  async function submitSheet() {
    if (!sheet) return;
    await update({ data: { id: sheet.id, avancement_global: completion, status: "submitted" } });
    toast.success("Fiche soumise pour validation");
    await qc.invalidateQueries({ queryKey: ["current-sheet", weekStart] });
  }

  if (isLoading || !sheet) {
    return <div className="grid place-items-center h-64"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  const submitted = sheet.status !== "draft";
  const locked = sheet.status === "hr_validated" || sheet.status === "direction_validated";
  const today = new Date();
  const dow = today.getDay(); // 0 dim, 5 vendredi
  const isFriday = dow === 5;

  async function reopenSheet() {
    if (!sheet) return;
    await update({ data: { id: sheet.id, status: "draft" } });
    toast.success("Fiche rouverte — vous pouvez la modifier");
    await qc.invalidateQueries({ queryKey: ["current-sheet", weekStart] });
  }

  return (
    <div>
      <PageHeader
        title="Fiche de la semaine"
        subtitle={`Semaine du ${formatWeekRange(weekStart)} · ${entries.length} tâches`}
        actions={
          <div className="flex flex-col items-end gap-1">
            {submitted && !locked ? (
              <Button onClick={reopenSheet} variant="outline" className="font-semibold">
                <Unlock className="h-4 w-4 mr-2" />Reprendre la modification
              </Button>
            ) : (
              <Button onClick={submitSheet} disabled={submitted || saving || entries.length === 0} className="font-semibold">
                <Send className="h-4 w-4 mr-2" />{submitted ? "Soumise" : "Soumettre la fiche"}
              </Button>
            )}
            {!submitted && (
              <span className={`text-[11px] flex items-center gap-1 ${isFriday ? "text-emerald-600" : "text-muted-foreground"}`}>
                <CalendarClock className="h-3 w-3" />
                À cliquer le <strong className="mx-1">vendredi</strong> en fin de journée
              </span>
            )}
            {locked && (
              <span className="text-[11px] text-muted-foreground">Fiche validée — modifications verrouillées</span>
            )}
          </div>
        }
      />

      <CoachCard
        sheetId={sheet.id}
        entries={entries}
        dayNotes={dayNotes}
        submitted={submitted}
        isFriday={isFriday}
        dow={dow}
      />

      <Card className="p-5 rounded-2xl border-0 shadow-[var(--shadow-card)] mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Progression globale de la semaine</div>
          <div className="text-sm font-bold text-primary">{completion}%</div>
        </div>
        <Progress value={completion} className="h-2" />
      </Card>

      <Tabs value={activeDay} onValueChange={setActiveDay}>
        <TabsList className="grid grid-cols-5 h-auto p-1 bg-secondary rounded-2xl">
          {DAY_LABELS.map((d, i) => {
            const done = dayComplete(i + 1);
            return (
              <TabsTrigger key={d} value={String(i + 1)}
                className="flex flex-col gap-1 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl">
                <span className="text-xs md:text-sm font-medium">{d}</span>
                {done && <Check className="h-3 w-3 text-emerald-500" />}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {DAY_LABELS.map((d, i) => {
          const day = i + 1;
          const dayEntries = entries.filter((e) => e.day === day);
          return (
            <TabsContent key={d} value={String(day)} className="mt-6 space-y-4">
              {dayEntries.length === 0 && (
                <Card className="p-10 rounded-2xl border-dashed border-2 text-center text-muted-foreground">
                  Aucune tâche pour {d}. Ajoutez la première.
                </Card>
              )}
              {dayEntries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} disabled={submitted}
                  onSave={saveEntry} onDelete={() => deleteRow(entry.id)} />
              ))}
              {!submitted && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => addRow(day)} disabled={saving}
                    className="flex-1 h-11 rounded-xl border-dashed">
                    <Plus className="h-4 w-4 mr-2" /> Ajouter une tâche pour {d}
                  </Button>
                  <Button
                    onClick={async () => {
                      await qc.invalidateQueries({ queryKey: ["current-sheet", weekStart] });
                      toast.success(`${d} enregistré ✓`);
                    }}
                    disabled={saving}
                    className="h-11 rounded-xl sm:w-56"
                  >
                    <Save className="h-4 w-4 mr-2" /> Enregistrer {d}
                  </Button>
                </div>
              )}
              <DayNoteCard
                key={`notes-${day}`}
                day={day}
                sheetId={sheet.id}
                initial={dayNotes.find((n) => n.day === day)}
                disabled={submitted}
                onSave={async (payload) => {
                  await upsertNote({ data: payload });
                  await qc.invalidateQueries({ queryKey: ["current-sheet", weekStart] });
                }}
              />
            </TabsContent>
          );
        })}
      </Tabs>

      <BilanSection sheetId={sheet.id} initial={sheet} disabled={submitted} />
    </div>
  );
}

const BILAN_FIELDS = [
  { key: "bilan_realisations" as const, label: "Principales réalisations", placeholder: "Livrables clefs, succès, deals…" },
  { key: "bilan_dossiers" as const,     label: "Dossiers en cours",         placeholder: "Sujets ouverts, statut, échéance…" },
  { key: "bilan_difficultes" as const,  label: "Difficultés rencontrées",   placeholder: "Points de blocage, dépendances…" },
  { key: "bilan_actions" as const,      label: "Actions prévues (semaine prochaine)", placeholder: "Priorités, objectifs…" },
];

function BilanSection({
  sheetId, initial, disabled,
}: {
  sheetId: string;
  initial: Record<string, unknown>;
  disabled: boolean;
}) {
  const qc = useQueryClient();
  const weekStart = isoWeekStart();
  const update = useServerFn(updateSheet);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await update({ data: { id: sheetId, ...values } });
      toast.success("Bilan enregistré");
      await qc.invalidateQueries({ queryKey: ["current-sheet", weekStart] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <Card className="mt-8 p-6 rounded-2xl border-0 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[oklch(0.72_0.14_74)]" />
            Bilan de la semaine
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Synthèse hebdomadaire à destination de votre manager et au RH.
          </p>
        </div>
        <Button onClick={save} disabled={saving || disabled} size="sm">
          <Save className="h-4 w-4 mr-2" />Enregistrer
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {BILAN_FIELDS.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label className="text-sm font-semibold">{f.label}</Label>
            <Textarea
              rows={5}
              defaultValue={(initial[f.key] as string | null) ?? ""}
              placeholder={f.placeholder}
              disabled={disabled}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

function DayNoteCard({
  day, sheetId, initial, disabled, onSave,
}: {
  day: number; sheetId: string;
  initial?: DayNote; disabled: boolean;
  onSave: (p: { sheet_id: string; day: number; motif_report: string; avancement_pct: number; difficultes: string; observations: string }) => Promise<void>;
}) {
  const [motif, setMotif] = useState(initial?.motif_report ?? "");
  const [avc, setAvc] = useState<number>(initial?.avancement_pct ?? 0);
  const [diff, setDiff] = useState(initial?.difficultes ?? "");
  const [obs, setObs] = useState(initial?.observations ?? "");
  const commit = () => onSave({ sheet_id: sheetId, day, motif_report: motif, avancement_pct: avc, difficultes: diff, observations: obs });
  return (
    <Card className="p-5 rounded-2xl border-0 shadow-[var(--shadow-card)] space-y-4">
      <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Notes du jour</div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs">Motif du report de la tâche</Label>
          <Input value={motif} onChange={(e) => setMotif(e.target.value)} onBlur={commit} disabled={disabled}
            placeholder="Précisez le motif si une tâche est reportée…" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Niveau d'avancement du jour</Label>
            <span className="text-xs font-semibold text-primary">{avc}%</span>
          </div>
          <Slider value={[avc]} onValueChange={([v]) => setAvc(v)} onValueCommit={commit}
            max={100} step={5} disabled={disabled} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs">Difficultés rencontrées</Label>
          <Textarea rows={3} value={diff} onChange={(e) => setDiff(e.target.value)} onBlur={commit} disabled={disabled} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Observations</Label>
          <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} onBlur={commit} disabled={disabled} />
        </div>
      </div>
    </Card>
  );
}

function EntryRow({ entry, disabled, onSave, onDelete }: {
  entry: Entry; disabled: boolean; onSave: (e: Entry) => void; onDelete: () => void;
}) {
  const [local, setLocal] = useState(entry);
  function patch(p: Partial<Entry>) { setLocal({ ...local, ...p }); }
  function commit(p: Partial<Entry>) { const next = { ...local, ...p }; setLocal(next); onSave(next); }
  return (
    <Card className="p-4 rounded-2xl border shadow-sm">
      <div className="grid gap-3 md:grid-cols-[100px_1fr_1fr_150px_40px] items-start">
        <div>
          <Label className="text-xs">Heure</Label>
          <Input value={local.heure} onChange={(e) => patch({ heure: e.target.value })}
            onBlur={(e) => commit({ heure: e.target.value })} disabled={disabled} placeholder="09:00" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Tâche réalisée</Label>
          <Input value={local.tache} onChange={(e) => patch({ tache: e.target.value })}
            onBlur={(e) => commit({ tache: e.target.value })} disabled={disabled} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Résultat obtenu</Label>
          <Input value={local.resultat} onChange={(e) => patch({ resultat: e.target.value })}
            onBlur={(e) => commit({ resultat: e.target.value })} disabled={disabled} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Statut</Label>
          <Select value={local.statut} onValueChange={(v) => commit({ statut: v as Statut })} disabled={disabled}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="done"><StatusBadge statut="done" /></SelectItem>
              <SelectItem value="in_progress"><StatusBadge statut="in_progress" /></SelectItem>
              <SelectItem value="postponed"><StatusBadge statut="postponed" /></SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="pt-6">
          <Button variant="ghost" size="icon" onClick={onDelete} disabled={disabled}
            className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      {local.statut === "postponed" && (
        <div className="mt-3">
          <Label className="text-xs">Motif du report</Label>
          <Input value={local.motif_report} onChange={(e) => patch({ motif_report: e.target.value })}
            onBlur={(e) => commit({ motif_report: e.target.value })} disabled={disabled}
            placeholder="Ex : ressource indisponible…" className="mt-1" />
        </div>
      )}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground">Niveau d'avancement</span>
          <span className="font-semibold text-primary">{local.avancement_pct}%</span>
        </div>
        <Slider value={[local.avancement_pct]} onValueChange={([v]) => patch({ avancement_pct: v })}
          onValueCommit={([v]) => commit({ avancement_pct: v })} max={100} step={5} disabled={disabled} />
      </div>
    </Card>
  );
}

function CoachCard({
  sheetId, entries, dayNotes, submitted, isFriday, dow,
}: {
  sheetId: string; entries: Entry[]; dayNotes: DayNote[]; submitted: boolean; isFriday: boolean; dow: number;
}) {
  const coachFn = useServerFn(getCoachAdvice);
  const [advice, setAdvice] = useState<{
    resume: string; score: number; priorites: string[]; risques: string[]; encouragement: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runCoach() {
    setLoading(true); setError(null);
    try {
      const r = await coachFn({ data: { sheet_id: sheetId } });
      setAdvice(r);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  const tips: string[] = [];
  const todayIdx = dow >= 1 && dow <= 5 ? dow : 1;
  const daysWithTasks = new Set(entries.map((e) => e.day));
  const missingDays = [1, 2, 3, 4, 5].filter((d) => d <= todayIdx && !daysWithTasks.has(d));
  const lowProgress = entries.filter((e) => e.avancement_pct < 50 && e.statut !== "done");
  const postponed = entries.filter((e) => e.statut === "postponed");
  const notesMissing = [1, 2, 3, 4, 5]
    .filter((d) => d <= todayIdx && daysWithTasks.has(d))
    .filter((d) => !dayNotes.find((n) => n.day === d && (n.observations || n.difficultes)));

  if (submitted) {
    tips.push("✅ Fiche soumise. Vous pouvez toujours la rouvrir tant qu'elle n'est pas validée par la RH.");
  } else {
    if (isFriday) tips.push("📅 Nous sommes vendredi : pensez à soumettre votre fiche en fin de journée.");
    else tips.push(`📌 Le bouton « Soumettre » se clique uniquement le vendredi. Aujourd'hui, remplissez seulement les tâches du jour.`);
    if (missingDays.length) {
      const labels = missingDays.map((d) => DAY_LABELS[d - 1]).join(", ");
      tips.push(`⏰ Journées à compléter : ${labels}. Ajoutez au moins une tâche par jour travaillé.`);
    }
    if (postponed.length) {
      tips.push(`↩️ ${postponed.length} tâche(s) reportée(s) : indiquez un motif clair et replanifiez-les.`);
    }
    if (lowProgress.length >= 3) {
      tips.push("🎯 Plusieurs tâches sous 50%. Découpez-les en sous-étapes concrètes de 30–60 min pour avancer.");
    }
    if (notesMissing.length) {
      tips.push(`📝 Notes du jour manquantes pour : ${notesMissing.map((d) => DAY_LABELS[d - 1]).join(", ")}. Ajoutez difficultés et observations.`);
    }
    if (entries.length === 0) {
      tips.push("🚀 Commencez par lister 3 priorités du jour, puis affinez-les au fil de la journée.");
    }
  }

  return (
    <Card className="p-5 rounded-2xl border-0 shadow-[var(--shadow-card)] mb-6 bg-gradient-to-br from-[oklch(0.98_0.02_74)] to-card">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full grid place-items-center bg-[oklch(0.72_0.14_74)]/15 text-[oklch(0.55_0.14_74)] shrink-0">
          <Lightbulb className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="font-semibold">Coach ATS</h3>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[oklch(0.72_0.14_74)]/20 text-[oklch(0.45_0.14_74)]">Recommandations</span>
            {advice && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                Score {advice.score}/100
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={runCoach}
              disabled={loading || entries.length === 0}
              className="ml-auto h-7 rounded-full text-xs"
            >
              {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
              {advice ? "Analyser à nouveau" : "Analyser ma semaine"}
            </Button>
          </div>
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
            <>
          {error && <p className="text-xs text-destructive mb-2">{error}</p>}
          <ul className="space-y-1.5 text-sm text-foreground/85">
            {tips.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
          <p className="text-[11px] text-muted-foreground mt-2">
            Cliquez sur <strong>Analyser ma semaine</strong> pour une analyse IA personnalisée de votre avancement.
          </p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}