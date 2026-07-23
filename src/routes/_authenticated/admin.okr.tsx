import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  listOkrs, createOkr, validateOkr, aiScoreOkrQuality, aiAnalyzeOkr, deleteOkr,
} from "@/lib/okrs.functions";
import { monthStart, formatMonth, shiftMonth } from "@/lib/month";
import { useMe } from "@/components/app-shell";
import { ChevronLeft, ChevronRight, Plus, Sparkles, Check, X, Trash2, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/okr")({
  head: () => ({
    meta: [
      { title: "OKR — Espace Admin RH" },
      { name: "description", content: "Validation et pilotage des OKR mensuels avec l'IA." },
    ],
  }),
  component: AdminOkrPage,
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

type KR = { id: string; title: string; metric_unit: string | null; target_value: number | null; current_value: number | null; progress_pct: number };
type OKR = {
  id: string; owner_id: string | null; scope: string; service: string | null; month_start: string;
  title: string; description: string | null; status: string; progress_pct: number; ai_score: number | null;
  key_results: KR[];
};

function AdminOkrPage() {
  const me = useMe();
  const isDirection = me.roles.includes("direction") || me.roles.includes("admin");
  const [month, setMonth] = useState(monthStart());
  const [tab, setTab] = useState("pending");
  const qc = useQueryClient();
  const listFn = useServerFn(listOkrs);
  const { data } = useQuery({
    queryKey: ["admin-okrs", month],
    queryFn: () => listFn({ data: { monthStart: month } }),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-okrs"] });

  const all = (data?.okrs ?? []) as OKR[];
  const pending = all.filter((o) =>
    (o.status === "submitted") || (isDirection && o.status === "hr_validated"),
  );
  const validated = all.filter((o) => o.status === "hr_validated" || o.status === "direction_validated");
  const org = all.filter((o) => o.scope !== "individual");

  return (
    <div>
      <PageHeader
        title="Pilotage OKR"
        subtitle={isDirection ? "Objectifs mensuels — Direction" : "Objectifs mensuels — RH"}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setMonth((m) => shiftMonth(m, -1))}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="text-sm font-medium capitalize min-w-[140px] text-center">{formatMonth(month)}</div>
            <Button variant="outline" size="icon" onClick={() => setMonth((m) => shiftMonth(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <NewSharedOkrDialog month={month} onDone={invalidate} isDirection={isDirection} />
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">À valider ({pending.length})</TabsTrigger>
          <TabsTrigger value="validated">Validés ({validated.length})</TabsTrigger>
          <TabsTrigger value="org">Service / Organisation ({org.length})</TabsTrigger>
          <TabsTrigger value="all">Tous ({all.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4 space-y-3">
          {pending.length === 0 && <EmptyState label="Aucun OKR à valider." />}
          {pending.map((o) => <AdminOkrCard key={o.id} okr={o} onDone={invalidate} isDirection={isDirection} />)}
        </TabsContent>
        <TabsContent value="validated" className="mt-4 space-y-3">
          {validated.length === 0 && <EmptyState label="Aucun OKR validé." />}
          {validated.map((o) => <AdminOkrCard key={o.id} okr={o} onDone={invalidate} isDirection={isDirection} />)}
        </TabsContent>
        <TabsContent value="org" className="mt-4 space-y-3">
          {org.length === 0 && <EmptyState label="Aucun OKR de service ou d'organisation." />}
          {org.map((o) => <AdminOkrCard key={o.id} okr={o} onDone={invalidate} isDirection={isDirection} />)}
        </TabsContent>
        <TabsContent value="all" className="mt-4 space-y-3">
          {all.length === 0 && <EmptyState label="Aucun OKR ce mois." />}
          {all.map((o) => <AdminOkrCard key={o.id} okr={o} onDone={invalidate} isDirection={isDirection} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Card className="p-8 text-center rounded-2xl border-dashed">
      <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
      <div className="text-sm text-muted-foreground">{label}</div>
    </Card>
  );
}

function NewSharedOkrDialog({ month, onDone, isDirection }: { month: string; onDone: () => void; isDirection: boolean }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [scope, setScope] = useState<"service" | "organization">(isDirection ? "organization" : "service");
  const [service, setService] = useState("");
  const create = useServerFn(createOkr);

  async function submit() {
    if (!title.trim()) { toast.error("Titre requis"); return; }
    if (scope === "service" && !service.trim()) { toast.error("Service requis"); return; }
    try {
      await create({ data: { title, description: desc, scope, service: scope === "service" ? service : null, monthStart: month } });
      toast.success("OKR créé");
      setTitle(""); setDesc(""); setService(""); setOpen(false); onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-semibold"><Plus className="h-4 w-4 mr-2" />OKR service/organisation</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nouvel OKR partagé</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Portée</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as "service" | "organization")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="service">Service</SelectItem>
                {isDirection && <SelectItem value="organization">Organisation</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          {scope === "service" && (
            <div><Label>Service</Label><Input value={service} onChange={(e) => setService(e.target.value)} placeholder="Ex. RH, Recrutement…" /></div>
          )}
          <div><Label>Objectif</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} /></div>
        </div>
        <DialogFooter><Button onClick={submit}>Créer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminOkrCard({ okr, onDone, isDirection }: { okr: OKR; onDone: () => void; isDirection: boolean }) {
  const validate = useServerFn(validateOkr);
  const scoreFn = useServerFn(aiScoreOkrQuality);
  const analyzeFn = useServerFn(aiAnalyzeOkr);
  const del = useServerFn(deleteOkr);
  const [comment, setComment] = useState("");
  const [quality, setQuality] = useState<null | { qualite: number; commentaire: string; suggestions: string[]; clair: boolean; mesurable: boolean; ambitieux: boolean; aligne: boolean }>(null);
  const [busy, setBusy] = useState(false);

  const role: "hr" | "direction" = isDirection ? "direction" : "hr";
  const canValidate =
    (role === "hr" && okr.status === "submitted") ||
    (role === "direction" && (okr.status === "submitted" || okr.status === "hr_validated"));

  async function decide(statut: "approved" | "rejected") {
    try {
      await validate({ data: { okr_id: okr.id, role, statut, commentaire: comment } });
      toast.success(statut === "approved" ? "OKR validé" : "OKR rejeté");
      setComment(""); onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  }
  async function runQuality() {
    setBusy(true);
    try { setQuality(await scoreFn({ data: { okr_id: okr.id } })); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    finally { setBusy(false); }
  }
  async function runAnalysis() {
    setBusy(true);
    try { await analyzeFn({ data: { okr_id: okr.id } }); onDone(); toast.success("Analyse mise à jour"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!confirm("Supprimer cet OKR ?")) return;
    try { await del({ data: { id: okr.id } }); onDone(); toast.success("Supprimé"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  }

  return (
    <Card className="p-5 rounded-2xl border-0 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge className={STATUS_COLOR[okr.status]}>{STATUS_LABEL[okr.status]}</Badge>
            <Badge variant="outline">{okr.scope === "individual" ? "Individuel" : okr.scope === "service" ? `Service · ${okr.service ?? "—"}` : "Organisation"}</Badge>
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

      <div className="space-y-1.5 mb-3">
        {okr.key_results.map((kr) => (
          <div key={kr.id} className="flex items-center gap-3 text-sm">
            <div className="flex-1 truncate">• {kr.title}</div>
            <div className="text-xs text-muted-foreground shrink-0">
              {kr.current_value ?? "—"}{kr.target_value ? ` / ${kr.target_value}` : ""} {kr.metric_unit}
            </div>
            <div className="w-24"><Progress value={kr.progress_pct} className="h-1.5" /></div>
            <div className="w-10 text-right text-xs font-semibold">{kr.progress_pct}%</div>
          </div>
        ))}
      </div>

      {quality && (
        <div className="mb-3 p-3 rounded-xl bg-gradient-to-br from-amber-50 to-white border">
          <div className="flex items-center gap-2 mb-1"><Sparkles className="h-4 w-4 text-amber-600" /><div className="font-semibold text-sm">Qualité OKR · {quality.qualite}/100</div></div>
          <div className="flex flex-wrap gap-1.5 mb-1 text-[11px]">
            <Badge variant={quality.clair ? "default" : "outline"}>Clair</Badge>
            <Badge variant={quality.mesurable ? "default" : "outline"}>Mesurable</Badge>
            <Badge variant={quality.ambitieux ? "default" : "outline"}>Ambitieux</Badge>
            <Badge variant={quality.aligne ? "default" : "outline"}>Aligné</Badge>
          </div>
          {quality.commentaire && <p className="text-sm">{quality.commentaire}</p>}
          {quality.suggestions.length > 0 && (
            <ul className="text-sm mt-1">{quality.suggestions.map((s, i) => <li key={i}>• {s}</li>)}</ul>
          )}
        </div>
      )}

      {canValidate && (
        <div className="mt-3 space-y-2">
          <Textarea placeholder="Commentaire (optionnel)" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => decide("approved")}><Check className="h-3 w-3 mr-1" />Valider {role === "hr" ? "RH" : "Direction"}</Button>
            <Button size="sm" variant="outline" className="text-red-600" onClick={() => decide("rejected")}><X className="h-3 w-3 mr-1" />Rejeter</Button>
            <Button size="sm" variant="outline" onClick={runQuality} disabled={busy}><Sparkles className="h-3 w-3 mr-1" />Scorer qualité (IA)</Button>
            <Button size="sm" variant="outline" onClick={runAnalysis} disabled={busy}><Sparkles className="h-3 w-3 mr-1" />Analyser (IA)</Button>
          </div>
        </div>
      )}
      {!canValidate && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={runQuality} disabled={busy}><Sparkles className="h-3 w-3 mr-1" />Scorer qualité (IA)</Button>
          <Button size="sm" variant="outline" onClick={runAnalysis} disabled={busy}><Sparkles className="h-3 w-3 mr-1" />Analyser (IA)</Button>
          {isDirection && <Button size="sm" variant="ghost" className="text-red-600" onClick={remove}><Trash2 className="h-3 w-3 mr-1" />Supprimer</Button>}
        </div>
      )}
    </Card>
  );
}