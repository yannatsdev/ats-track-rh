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
import { Plus, Trash2, Check, Send, Loader2, Sparkles, Save, Unlock, Lightbulb, CalendarClock, Circle, AlertCircle, ArrowRight, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  getOrCreateCurrentSheet, upsertDailyEntry, deleteDailyEntry, updateSheet, upsertDayNote,
  getCoachAdvice, requestSheetEdit, generateAIBilan, reportTaskToNextDay,
} from "@/lib/sheets.functions";
import { isoWeekStart, formatWeekRange, DAY_LABELS } from "@/lib/week";

export const Route = createFileRoute("/_authenticated/fiche")({
  head: () => ({ meta: [{ title: "Fiche de la semaine — ATS TRACK RH" }] }),
  component: FichePage,
});

type Entry = {
  id?: string; sheet_id: string; day: number; heure: string; tache: string;
  resultat: string; statut: Statut; motif_report: string; motif_pause: string; position: number;
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
  const report = useServerFn(reportTaskToNextDay);


  const { data, isLoading } = useQuery({
    queryKey: ["current-sheet", weekStart],
    queryFn: () => getSheet({ data: { weekStart } }),
  });

  const [activeDay, setActiveDay] = useState(() => {
    const d = new Date().getDay();
    // JS getDay returns 0 for Sunday, 5 for Friday.
    // Our tabs are "1" to "5".
    return d >= 1 && d <= 5 ? String(d) : "1";
  });
  const [saving, setSaving] = useState(false);

  const entries = ((data?.entries ?? []) as unknown as Entry[]);
  const dayNotes = ((data?.dayNotes ?? []) as unknown as DayNote[]);
  const sheet = data?.sheet;

  const daysWithData = useMemo(() => {
    const days = new Set<number>();
    for (let i = 1; i <= 5; i++) {
      const hasRealTask = entries.some((e) => e.day === i && e.tache.trim().length > 0);
      const hasNote = dayNotes.some((n) => n.day === i && (n.observations?.trim() || n.difficultes?.trim()));
      if (hasRealTask || hasNote) days.add(i);
    }
    return days;
  }, [entries, dayNotes]);

  const completion = Math.round((daysWithData.size / 5) * 100);

  const dayStatus = (d: number) => {
    const dayEntries = entries.filter((e) => e.day === d && e.tache.trim().length > 0);
    if (dayEntries.length === 0) return "empty";
    const allDone = dayEntries.every((e) => e.statut === "done");
    const anyPaused = dayEntries.some((e) => e.statut === "paused");
    const anyBlocked = dayEntries.some((e) => e.statut === "blocked");
    return allDone ? "complete" : anyBlocked ? "blocked" : anyPaused ? "paused" : "in_progress";
  };

  async function addRow(day: number) {
    if (!sheet) return;
    setSaving(true);
    try {
      await upsert({ data: {
        sheet_id: sheet.id, day, heure: "", tache: "", resultat: "",
        statut: "in_progress", motif_report: "",
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
    const done = entries.filter((e) => e.statut === "done").length;
    const meaningfulTasks = entries.filter(e => e.tache.trim().length > 0 && e.statut !== "paused");
    const total = Math.max(meaningfulTasks.length, 1);
    const calculatedAvc = Math.round((done / total) * 100);
    await update({ data: { id: sheet.id, avancement_global: calculatedAvc, status: "submitted" } });
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
  const editStatus = (sheet as { edit_request_status?: string | null }).edit_request_status ?? null;

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
            ) : locked ? (
              <EditRequestButton sheetId={sheet.id} editStatus={editStatus} weekStart={weekStart} />
            ) : (
              <SubmitWithConfirmation
                sheet={sheet}
                entries={entries}
                daysCount={daysWithData.size}
                notesCount={dayNotes.filter(n => n.observations?.trim() || n.difficultes?.trim()).length}
                disabled={submitted || saving}
                onConfirm={submitSheet}
              />
            )}
            {!submitted && (
              <span className={`text-[11px] flex items-center gap-1 ${isFriday ? "text-emerald-600" : "text-muted-foreground"}`}>
                <CalendarClock className="h-3 w-3" />
                À cliquer le <strong className="mx-1">vendredi</strong> en fin de journée
              </span>
            )}
            {locked && (
              <span className="text-[11px] text-muted-foreground">
                {editStatus === "pending"
                  ? "Demande de modification en attente de validation…"
                  : editStatus === "rejected"
                  ? "Dernière demande refusée — vous pouvez en soumettre une nouvelle."
                  : "Fiche validée — vous pouvez demander une modification."}
              </span>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap gap-4 mb-6">
        <Card className="flex-1 min-w-[240px] p-5 rounded-2xl border-0 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Progression de la semaine (jours actifs)</div>
            <div className="text-sm font-bold text-primary">{completion}%</div>
          </div>
          <Progress value={completion} className="h-2" />
        </Card>
        <Card className="px-5 py-3 rounded-2xl border-0 shadow-[var(--shadow-card)] flex items-center gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{daysWithData.size}/5</div>
            <div className="text-[10px] uppercase text-muted-foreground">Jours</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              {dayNotes.filter(n => n.observations?.trim() || n.difficultes?.trim()).length}
            </div>
            <div className="text-[10px] uppercase text-muted-foreground">Notes</div>
          </div>
        </Card>
      </div>

      <Tabs value={activeDay} onValueChange={setActiveDay}>
        <TabsList className="grid grid-cols-5 h-auto p-1 bg-secondary rounded-2xl">
          {DAY_LABELS.map((d, i) => {
            const status = dayStatus(i + 1);
            const dayEntries = entries.filter(e => e.day === i + 1 && e.tache.trim().length > 0);
            return (
              <TabsTrigger key={d} value={String(i + 1)}
                className="flex flex-col gap-1 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl">
                <span className="text-xs md:text-sm font-medium">{d}</span>
                <div className="flex flex-col items-center">
                  {status === "complete" ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : status === "blocked" ? (
                    <Circle className="h-2 w-2 fill-red-500 text-red-500" />
                  ) : status === "paused" ? (
                    <Circle className="h-2 w-2 fill-slate-400 text-slate-400" />
                  ) : status === "in_progress" ? (
                    <Circle className="h-2 w-2 fill-orange-400 text-orange-400" />
                  ) : (
                    <Circle className="h-2 w-2 text-muted-foreground/30" />
                  )}
                  <span className="text-[9px] text-muted-foreground mt-0.5">
                    {dayEntries.length > 0 ? `${dayEntries.length} tâche${dayEntries.length > 1 ? "s" : ""}` : "vide"}
                  </span>
                </div>
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
                <Card className="p-10 rounded-2xl border-dashed border-2 text-center text-muted-foreground flex flex-col items-center gap-4">
                  <p>Aucune tâche pour {d}. Ajoutez la première.</p>
                  {!submitted && (
                    <Button variant="outline" size="sm" onClick={() => addRow(day)}>
                      <Plus className="h-4 w-4 mr-2" /> Ajouter la 1ère tâche
                    </Button>
                  )}
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

      <CoachCard
        sheetId={sheet.id}
        entries={entries}
        dayNotes={dayNotes}
        submitted={submitted}
        isFriday={isFriday}
        dow={dow}
      />

      <BilanSection sheetId={sheet.id} initial={sheet} disabled={submitted} />
    </div>
  );
}

function SubmitWithConfirmation({
  sheet, entries, daysCount, notesCount, disabled, onConfirm,
}: {
  sheet: any; entries: any[]; daysCount: number; notesCount: number; disabled: boolean; onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const incomplete = daysCount < 5 || notesCount < daysCount;
  
  const canSubmit = entries.length > 0 && daysCount >= 5 && notesCount >= daysCount;
  const isActuallyDisabled = disabled || !canSubmit;

  let tooltipMsg = "";
  if (entries.length === 0) tooltipMsg = "Ajoutez au moins une tâche pour soumettre.";
  else if (daysCount < 5) tooltipMsg = `${5 - daysCount} jour(s) incomplet(s) — ajoutez au moins une tâche par jour.`;
  else if (notesCount < daysCount) tooltipMsg = "Notes du jour manquantes pour certains jours.";

  const content = (
    <Button onClick={onConfirm} disabled={isActuallyDisabled} className="font-semibold">
      <Send className="h-4 w-4 mr-2" />Soumettre la fiche
    </Button>
  );

  if (isActuallyDisabled && !disabled && tooltipMsg) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-block">{content}</div>
          </TooltipTrigger>
          <TooltipContent>{tooltipMsg}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!incomplete) {
    return content;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled} className="font-semibold bg-primary/90 hover:bg-primary">
          <Send className="h-4 w-4 mr-2" />Soumettre la fiche
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Fiche incomplète
          </DialogTitle>
          <DialogDescription>
            Votre fiche n'est pas totalement renseignée :
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2 text-sm">
          <p>• <strong>{daysCount}/5 jours</strong> travaillés renseignés.</p>
          <p>• <strong>{notesCount}/{daysCount || 1} notes</strong> du jour complétées.</p>
          <p className="mt-4 font-medium text-destructive">Soumettre quand même au RH ?</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Continuer à remplir</Button>
          <Button onClick={() => { setOpen(false); onConfirm(); }}>Confirmer la soumission</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [generating, setGenerating] = useState(false);
  const generateFn = useServerFn(generateAIBilan);

  async function save() {
    setSaving(true);
    try {
      await update({ data: { id: sheetId, ...values } });
      toast.success("Bilan enregistré");
      await qc.invalidateQueries({ queryKey: ["current-sheet", weekStart] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await generateFn({ data: { sheet_id: sheetId } });
      const newValues = {
        bilan_realisations: result.realisations,
        bilan_dossiers: result.dossiers,
        bilan_difficultes: result.difficultes,
        bilan_actions: result.actions,
      };
      setValues(prev => ({ ...prev, ...newValues }));
      // We need to also update the UI, but Textarea uses defaultValue or controlled value. 
      // Since it's currently using defaultValue, we'll force a re-render or switch to controlled.
      toast.success("Bilan généré avec l'IA. N'oubliez pas d'enregistrer.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
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
        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={generating || disabled} size="sm" variant="outline" className="text-xs">
            {generating ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Sparkles className="h-3 w-3 mr-2" />}
            Générer avec l'IA
          </Button>
          <Button onClick={save} disabled={saving || disabled} size="sm">
            <Save className="h-4 w-4 mr-2" />Enregistrer
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {BILAN_FIELDS.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label className="text-sm font-semibold">{f.label}</Label>
            <Textarea
              rows={5}
              value={values[f.key] !== undefined ? values[f.key] : ((initial[f.key] as string | null) ?? "")}
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
  const entriesData = (useQueryClient().getQueryData(["current-sheet", isoWeekStart()]) as any)?.entries || [];
  const dayEntries = (entriesData as any[]).filter(e => e.day === day && e.tache.trim().length > 0);
  const nonPausedEntries = dayEntries.filter(e => e.statut !== "paused");
  const calculatedAvc = nonPausedEntries.length 
    ? Math.round((nonPausedEntries.filter(e => e.statut === "done").length / nonPausedEntries.length) * 100)
    : 0;

  const [diff, setDiff] = useState(initial?.difficultes ?? "");
  const [obs, setObs] = useState(initial?.observations ?? "");
  
  const commit = () => onSave({ 
    sheet_id: sheetId, 
    day, 
    motif_report: motif, 
    avancement_pct: calculatedAvc, 
    difficultes: diff, 
    observations: obs 
  });

  return (
    <Card className="p-5 rounded-2xl border-0 shadow-[var(--shadow-card)] space-y-4">
      <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Notes du jour</div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Progression du jour (calculée)</Label>
            <div className="flex items-center gap-3">
              <Progress value={calculatedAvc} className="h-2 flex-1" />
              <span className="text-xs font-bold text-primary w-8">{calculatedAvc}%</span>
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              {dayEntries.length > 0
                ? `Basée sur les tâches terminées (${dayEntries.filter(e => e.statut === "done").length}/${nonPausedEntries.length || 1}) ${dayEntries.some(e => e.statut === "paused") ? "(Tâches suspendues exclues)" : ""}`
                : "Aucune tâche pour l'instant"}
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Motif du report de la tâche</Label>
            <Input value={motif} onChange={(e) => setMotif(e.target.value)} onBlur={commit} disabled={disabled}
              placeholder="Précisez le motif si une tâche est reportée…" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Difficultés rencontrées</Label>
            <Textarea rows={3} value={diff} onChange={(e) => setDiff(e.target.value)} onBlur={commit} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Observations</Label>
            <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} onBlur={commit} disabled={disabled} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function EntryRow({ entry, disabled, onSave, onDelete, onReport }: {
  entry: Entry; disabled: boolean; onSave: (e: Entry) => void; onDelete: () => void;
  onReport?: (id: string) => Promise<void>;
}) {

  const [local, setLocal] = useState({ ...entry });
  function patch(p: Partial<Entry>) { setLocal({ ...local, ...p }); }
  function commit(p: Partial<Entry>) { const next = { ...local, ...p }; setLocal(next); onSave(next as Entry); }
  return (
    <Card className="p-4 rounded-2xl border shadow-sm relative overflow-hidden">
      <div className="grid gap-3 md:grid-cols-[100px_1fr_1fr_180px_80px] items-start">

        <div>
          <Label className="text-xs">Heure</Label>
          <Input value={local.heure} onChange={(e) => patch({ heure: e.target.value })}
            onBlur={(e) => commit({ heure: e.target.value })} disabled={disabled} placeholder="09:00" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Tâche réalisée</Label>
          <Input value={local.tache} onChange={(e) => patch({ tache: e.target.value })}
            onBlur={(e) => commit({ tache: e.target.value })} disabled={disabled} className="mt-1" placeholder="Ajouter une tâche..." />
        </div>
        <div>
          <Label className="text-xs">Résultat obtenu</Label>
          <Input value={local.resultat} onChange={(e) => patch({ resultat: e.target.value })}
            onBlur={(e) => commit({ resultat: e.target.value })} disabled={disabled} className="mt-1" placeholder="Résultat attendu / obtenu" />
        </div>
        <div>
          <Label className="text-xs">Statut</Label>
          <Select value={local.statut} onValueChange={(v) => commit({ statut: v as Statut })} disabled={disabled}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="done"><StatusBadge statut="done" /></SelectItem>
              <SelectItem value="in_progress"><StatusBadge statut="in_progress" /></SelectItem>
              <SelectItem value="paused"><StatusBadge statut="paused" /></SelectItem>
              <SelectItem value="blocked"><StatusBadge statut="blocked" /></SelectItem>
              <SelectItem value="postponed"><StatusBadge statut="postponed" /></SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="pt-6 flex items-center gap-1">
          {onReport && entry.id && (entry.statut === "in_progress" || entry.statut === "blocked" || entry.statut === "paused") && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => onReport(entry.id!)} disabled={disabled}
                    className="text-muted-foreground hover:text-primary">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reporter à demain</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button variant="ghost" size="icon" onClick={onDelete} disabled={disabled}
            className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
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
      {local.statut === "blocked" && (
        <div className="mt-3">
          <Label className="text-xs">Motif du blocage</Label>
          <Input value={local.motif_pause} onChange={(e) => patch({ motif_pause: e.target.value })}
            onBlur={(e) => commit({ motif_pause: e.target.value })} disabled={disabled}
            placeholder="Ex : ressource manquante, en attente de validation externe…" className="mt-1" />
        </div>
      )}
      {local.statut === "paused" && (
        <div className="mt-3">
          <Label className="text-xs">Motif de la suspension</Label>
          <Input value={local.motif_pause} onChange={(e) => patch({ motif_pause: e.target.value })}
            onBlur={(e) => commit({ motif_pause: e.target.value })} disabled={disabled}
            placeholder="Ex : en attente de retour client, priorité changée…" className="mt-1" />
        </div>
      )}
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
  const postponed = entries.filter((e) => e.statut === "postponed");
  const notesMissing = [1, 2, 3, 4, 5]
    .filter((d) => d <= todayIdx && daysWithTasks.has(d))
    .filter((d) => !dayNotes.find((n) => n.day === d && (n.observations || n.difficultes)));

  if (submitted) {
    tips.push("✅ Fiche soumise. Vous pouvez toujours la rouvrir tant qu'elle n'est pas validée par le RH.");
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

function EditRequestButton({
  sheetId, editStatus, weekStart,
}: { sheetId: string; editStatus: string | null; weekStart: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(requestSheetEdit);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = editStatus === "pending";

  async function submit() {
    if (reason.trim().length < 3) {
      toast.error("Merci d'indiquer un motif.");
      return;
    }
    setBusy(true);
    try {
      await fn({ data: { sheet_id: sheetId, reason: reason.trim() } });
      toast.success("Demande envoyée au RH / Direction.");
      setOpen(false);
      setReason("");
      await qc.invalidateQueries({ queryKey: ["current-sheet", weekStart] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-semibold" disabled={pending}>
          <Unlock className="h-4 w-4 mr-2" />
          {pending ? "Demande en attente" : "Demander une modification"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demander la modification de la fiche</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Expliquez pourquoi cette fiche validée doit être rouverte. Le RH ou la Direction
          recevra votre demande et pourra l'accepter ou la refuser.
        </p>
        <Textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motif de la demande (ex : oubli d'une tâche importante, correction d'un résultat…)"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Annuler</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Envoyer la demande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}