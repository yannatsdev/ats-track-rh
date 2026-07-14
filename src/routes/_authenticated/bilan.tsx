import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getOrCreateCurrentSheet, updateSheet } from "@/lib/sheets.functions";
import { isoWeekStart } from "@/lib/week";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/bilan")({
  head: () => ({ meta: [{ title: "Bilan de la semaine — ATS TRACK RH" }] }),
  component: BilanPage,
});

const FIELDS = [
  { key: "bilan_realisations" as const, label: "Principales réalisations", placeholder: "Livrables clefs, succès, deals…" },
  { key: "bilan_dossiers" as const, label: "Dossiers en cours", placeholder: "Sujets ouverts, statut, échéance…" },
  { key: "bilan_difficultes" as const, label: "Difficultés rencontrées", placeholder: "Points de blocage, dépendances…" },
  { key: "bilan_actions" as const, label: "Actions prévues (semaine prochaine)", placeholder: "Priorités, objectifs…" },
];

function BilanPage() {
  const weekStart = isoWeekStart();
  const getFn = useServerFn(getOrCreateCurrentSheet);
  const updFn = useServerFn(updateSheet);
  const { data } = useQuery({ queryKey: ["current-sheet", weekStart], queryFn: () => getFn({ data: { weekStart } }) });
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  if (!data) return <div className="grid place-items-center h-64"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  const sheet = data.sheet;

  async function save() {
    setSaving(true);
    try {
      await updFn({ data: { id: sheet.id, ...values } });
      toast.success("Bilan enregistré");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader title="Bilan de la semaine"
        subtitle="Synthèse hebdomadaire à destination de votre manager et de la RH."
        actions={<Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" />Enregistrer</Button>} />
      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map((f) => (
          <Card key={f.key} className="p-5 rounded-2xl border-0 shadow-[var(--shadow-card)]">
            <Label className="text-sm font-semibold">{f.label}</Label>
            <Textarea rows={6} defaultValue={(sheet[f.key] as string | null) ?? ""}
              placeholder={f.placeholder} className="mt-3"
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
          </Card>
        ))}
      </div>
    </div>
  );
}