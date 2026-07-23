import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  listMyOkrs, createOkr, updateOkr, deleteOkr, upsertKeyResult, deleteKeyResult,
  aiGenerateKeyResults, aiAnalyzeOkr,
} from "@/lib/okrs.functions";
import { monthStart, formatMonth, shiftMonth } from "@/lib/month";
import { Sparkles, Plus, Trash2, ChevronLeft, ChevronRight, Send, RotateCcw, Wand2, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/okr")({
  head: () => ({
    meta: [
      { title: "OKR — ATS TRACK RH" },
      { name: "description", content: "Définissez et suivez vos objectifs mensuels avec l'aide de l'IA." },
    ],
  }),
  component: OkrPage,
});

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon", submitted: "Soumis",
  hr_validated: "Validé RH", direction_validated: "Validé Direction", rejected: "Rejeté",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-muted text-foreground", submitted: "bg-amber-500/15 text-amber-700",
  hr_validated: "bg-blue-500/15 text-blue-700", direction_validated: "bg-emerald-500/15 text-emerald-700",
  rejected: "bg-red-500/15 text-red-700",
};

function OkrPage() {
  const [month, setMonth] = useState(monthStart());
  const qc = useQueryClient();
  const list = useServerFn(listMyOkrs);
  const { data } = useQuery({ queryKey: ["my-okrs", month], queryFn: () => list({ data: { monthStart: month } }) });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["my-okrs"] });

  return (
    <div>
      <PageHeader
        title="Mes OKR"
        subtitle="Objectifs mensuels et résultats-clés — pilotés par l'IA."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setMonth((m) => shiftMonth(m, -1))}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="text-sm font-medium capitalize min-w-[140px] text-center">{formatMonth(month)}</div>
            <Button variant="outline" size="icon" onClick={() => setMonth((m) => shiftMonth(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <NewOkrDialog month={month} onDone={invalidate} />
          </div>
        }
      />

      {(data?.shared.length ?? 0) > 0 && (
        <Card className="p-4 mb-6 rounded-2xl border-0 shadow-[var(--shadow-card)] bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-amber-600" />
            <h3 className="font-semibold text-sm">OKR de l'organisation et des services</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {data!.shared.map((o) => (
              <div key={o.id} className="rounded-xl border bg-white p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{o.scope === "organization" ? "Organisation" : `Service · ${o.service ?? "—"}`}</div>
                  <Badge variant="secondary" className="text-[10px]">{o.progress_pct}%</Badge>
                </div>
                <div className="text-sm font-medium">{o.title}</div>
                {o.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{o.description}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {(data?.mine ?? []).length === 0 && (
          <Card className="p-8 text-center rounded-2xl border-dashed">
            <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <div className="font-medium">Aucun OKR pour ce mois</div>
            <div className="text-sm text-muted-foreground">Créez votre premier objectif pour {formatMonth(month)}.</div>
          </Card>
        )}
        {(data?.mine ?? []).map((o) => (
          <OkrCard key={o.id} okr={o} onDone={invalidate} />
        ))}
      </div>
    </div>
  );
}

function NewOkrDialog({ month, onDone }: { month: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const create = useServerFn(createOkr);
  const genKr = useServerFn(aiGenerateKeyResults);
  const upsertKr = useServerFn(upsertKeyResult);
  const [busy, setBusy] = useState(false);

  async function submit(withAI: boolean) {
    if (!title.trim()) { toast.error("Titre requis"); return; }
    setBusy(true);
    try {
      const okr = await create({ data: { title, description: desc, scope: "individual", monthStart: month } });
      if (withAI) {
        const { key_results } = await genKr({ data: { title, description: desc } });
        for (let i = 0; i < key_results.length; i++) {
          const k = key_results[i];
          await upsertKr({ data: { okr_id: okr.id, title: k.title, target_value: k.target_value, metric_unit: k.metric_unit, progress_pct: 0, position: i } });
        }
        toast.success(`${key_results.length} Key Results générés par l'IA`);
      } else {
        toast.success("OKR créé");
      }
      setTitle(""); setDesc(""); setOpen(false); onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-semibold"><Plus className="h-4 w-4 mr-2" />Nouvel OKR</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nouvel objectif mensuel</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Objectif</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Améliorer la satisfaction candidat" />
          </div>
          <div>
            <Label>Description (optionnel)</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Contexte, enjeu, cible…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => submit(false)}>Créer sans IA</Button>
          <Button disabled={busy} onClick={() => submit(true)}>
            <Wand2 className="h-4 w-4 mr-2" />{busy ? "Génération…" : "Créer + IA générer KR"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type KR = {
  id: string; okr_id: string; title: string; metric_unit: string | null;
  target_value: number | null; current_value: number | null; progress_pct: number; position: number;
};
type OKR = {
  id: string; title: string; description: string | null; status: string; progress_pct: number;
  ai_score: number | null; ai_feedback: unknown;
  key_results: KR[];
};

function OkrCard({ okr, onDone }: { okr: OKR; onDone: () => void }) {
  const upd = useServerFn(updateOkr);
  const del = useServerFn(deleteOkr);
  const upsertKr = useServerFn(upsertKeyResult);
  const delKr = useServerFn(deleteKeyResult);
  const analyze = useServerFn(aiAnalyzeOkr);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [analysis, setAnalysis] = useState<null | { score: number; verdict: string; recommandations: string[]; risques: string[]; encouragement: string }>(
    okr.ai_feedback && typeof okr.ai_feedback === "object" ? (okr.ai_feedback as { score: number; verdict: string; recommandations: string[]; risques: string[]; encouragement: string }) : null,
  );
  const locked = okr.status === "submitted" || okr.status === "hr_validated" || okr.status === "direction_validated";

  async function submitOkr() {
    await upd({ data: { id: okr.id, status: "submitted" } });
    toast.success("OKR soumis au RH");
    onDone();
  }
  async function reopen() {
    await upd({ data: { id: okr.id, status: "draft" } });
    toast.success("OKR repassé en brouillon");
    onDone();
  }
  async function removeOkr() {
    if (!confirm("Supprimer cet OKR ?")) return;
    try { await del({ data: { id: okr.id } }); onDone(); toast.success("Supprimé"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  }
  async function addKr() {
    await upsertKr({ data: { okr_id: okr.id, title: "Nouveau résultat-clé", metric_unit: "", target_value: null, progress_pct: 0, position: okr.key_results.length } });
    onDone();
  }
  async function runAnalysis() {
    setAnalysisBusy(true);
    try { const r = await analyze({ data: { okr_id: okr.id } }); setAnalysis(r); toast.success("Analyse mise à jour"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    finally { setAnalysisBusy(false); }
  }

  return (
    <Card className="p-5 rounded-2xl border-0 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={STATUS_COLOR[okr.status]}>{STATUS_LABEL[okr.status]}</Badge>
            {okr.ai_score !== null && <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" />{okr.ai_score}/100</Badge>}
          </div>
          <h3 className="font-semibold text-lg">{okr.title}</h3>
          {okr.description && <p className="text-sm text-muted-foreground mt-1">{okr.description}</p>}
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold">{okr.progress_pct}%</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Avancement</div>
        </div>
      </div>
      <Progress value={okr.progress_pct} className="mb-4" />

      <div className="space-y-2">
        {okr.key_results.length === 0 && (
          <div className="text-sm text-muted-foreground italic">Aucun résultat-clé — ajoutez-en un.</div>
        )}
        {okr.key_results.map((kr) => (
          <KrRow key={kr.id} kr={kr} locked={locked} onSave={async (patch) => {
            await upsertKr({ data: { id: kr.id, okr_id: kr.okr_id, title: patch.title, metric_unit: patch.metric_unit, target_value: patch.target_value, current_value: patch.current_value, progress_pct: patch.progress_pct, position: kr.position } });
            onDone();
          }} onDelete={async () => { await delKr({ data: { id: kr.id, okr_id: kr.okr_id } }); onDone(); }} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {!locked && <Button size="sm" variant="outline" onClick={addKr}><Plus className="h-3 w-3 mr-1" />Ajouter un KR</Button>}
        <Button size="sm" variant="outline" onClick={runAnalysis} disabled={analysisBusy}>
          <Sparkles className="h-3 w-3 mr-1" />{analysisBusy ? "Analyse…" : "Coach OKR (IA)"}
        </Button>
        {okr.status === "draft" || okr.status === "rejected" ? (
          <Button size="sm" onClick={submitOkr} disabled={okr.key_results.length === 0}>
            <Send className="h-3 w-3 mr-1" />Soumettre au RH
          </Button>
        ) : okr.status === "submitted" ? (
          <Button size="sm" variant="outline" onClick={reopen}><RotateCcw className="h-3 w-3 mr-1" />Reprendre</Button>
        ) : null}
        {!locked && <Button size="sm" variant="ghost" className="text-red-600" onClick={removeOkr}><Trash2 className="h-3 w-3 mr-1" />Supprimer</Button>}
      </div>

      {analysis && (
        <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-amber-50 to-white border">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <div className="font-semibold text-sm">Coach OKR · {analysis.score}/100</div>
          </div>
          {analysis.verdict && <p className="text-sm mb-2">{analysis.verdict}</p>}
          {analysis.recommandations.length > 0 && (
            <div className="mb-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Priorités</div>
              <ul className="text-sm space-y-0.5">{analysis.recommandations.map((r, i) => <li key={i}>• {r}</li>)}</ul>
            </div>
          )}
          {analysis.risques.length > 0 && (
            <div className="mb-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Vigilance</div>
              <ul className="text-sm space-y-0.5 text-red-700">{analysis.risques.map((r, i) => <li key={i}>• {r}</li>)}</ul>
            </div>
          )}
          {analysis.encouragement && <p className="text-sm italic text-emerald-700">{analysis.encouragement}</p>}
        </div>
      )}
    </Card>
  );
}

function KrRow({ kr, locked, onSave, onDelete }: {
  kr: KR; locked: boolean;
  onSave: (patch: { title: string; metric_unit: string; target_value: number | null; current_value: number | null; progress_pct: number }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [title, setTitle] = useState(kr.title);
  const [unit, setUnit] = useState(kr.metric_unit ?? "");
  const [target, setTarget] = useState<string>(kr.target_value?.toString() ?? "");
  const [current, setCurrent] = useState<string>(kr.current_value?.toString() ?? "");
  const [pct, setPct] = useState(kr.progress_pct);
  const [dirty, setDirty] = useState(false);

  async function save() {
    await onSave({
      title, metric_unit: unit,
      target_value: target === "" ? null : Number(target),
      current_value: current === "" ? null : Number(current),
      progress_pct: pct,
    });
    setDirty(false);
    toast.success("Enregistré");
  }

  return (
    <div className="rounded-xl border p-3 bg-background/50">
      <div className="grid gap-2 md:grid-cols-[1fr_100px_100px_100px] items-end">
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Key result</Label>
          <Input value={title} disabled={locked} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Unité</Label>
          <Input value={unit} disabled={locked} onChange={(e) => { setUnit(e.target.value); setDirty(true); }} placeholder="%, dossiers…" />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Cible</Label>
          <Input type="number" value={target} disabled={locked} onChange={(e) => { setTarget(e.target.value); setDirty(true); }} />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Actuel</Label>
          <Input type="number" value={current} disabled={locked} onChange={(e) => { setCurrent(e.target.value); setDirty(true); }} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Avancement</Label>
            <span className="text-sm font-semibold">{pct}%</span>
          </div>
          <Slider value={[pct]} min={0} max={100} step={5} disabled={locked} onValueChange={(v) => { setPct(v[0]); setDirty(true); }} />
        </div>
        {!locked && (
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-600"><Trash2 className="h-3 w-3" /></Button>
            <Button size="sm" onClick={save} disabled={!dirty}>Enregistrer</Button>
          </div>
        )}
      </div>
    </div>
  );
}