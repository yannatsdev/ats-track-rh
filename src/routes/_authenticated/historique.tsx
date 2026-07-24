import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { listMySheets, requestSheetEdit } from "@/lib/sheets.functions";
import { formatWeekRange } from "@/lib/week";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const reqFn = useServerFn(requestSheetEdit);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["my-sheets"], queryFn: () => fn({}) });
  const sheets = data ?? [];
  const [openId, setOpenId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitRequest() {
    if (!openId) return;
    if (reason.trim().length < 3) {
      toast.error("Merci d'indiquer un motif (au moins 3 caractères).");
      return;
    }
    setSubmitting(true);
    try {
      await reqFn({ data: { sheet_id: openId, reason: reason.trim() } });
      toast.success("Demande envoyée au RH / à la Direction.");
      setOpenId(null); setReason("");
      await qc.invalidateQueries({ queryKey: ["my-sheets"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

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
          const er = (s as { edit_request_status?: string | null }).edit_request_status ?? null;
          const locked = s.status !== "draft";
          return (
            <Card key={s.id} className="p-5 rounded-2xl border-0 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="font-semibold">Semaine du {formatWeekRange(s.week_start)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Mise à jour {new Date(s.updated_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={st.className}>{st.label}</Badge>
                  {er === "pending" && (
                    <Badge className="bg-amber-50 text-amber-700">Demande en attente</Badge>
                  )}
                  {er === "rejected" && (
                    <Badge className="bg-red-50 text-red-700">Demande refusée</Badge>
                  )}
                  {locked && er !== "pending" && (
                    <Button
                      size="sm"
                      onClick={() => { setOpenId(s.id); setReason(""); }}
                      className="rounded-full"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Demander à modifier
                    </Button>
                  )}
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

      <Dialog open={!!openId} onOpenChange={(o) => { if (!o) { setOpenId(null); setReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demander la modification de la fiche</DialogTitle>
            <DialogDescription>
              Expliquez brièvement pourquoi vous souhaitez rouvrir cette fiche. Le RH ou la Direction
              décidera d'accepter ou de refuser votre demande.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Motif de la demande de modification…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenId(null); setReason(""); }}>
              Annuler
            </Button>
            <Button onClick={submitRequest} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}