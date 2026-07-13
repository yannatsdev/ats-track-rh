import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMe } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — ATS TRACK RH" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const me = useMe();
  const [firstName, setFirstName] = useState(me.profile?.first_name ?? "");
  const [lastName, setLastName] = useState(me.profile?.last_name ?? "");
  const [fonction, setFonction] = useState(me.profile?.fonction ?? "");
  const [service, setService] = useState(me.profile?.service ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("profiles")
      .update({ first_name: firstName, last_name: lastName, fonction, service })
      .eq("id", me.userId);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profil mis à jour");
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Paramètres du compte" subtitle="Informations personnelles & professionnelles." />
      <Card className="p-6 rounded-2xl border-0 shadow-[var(--shadow-card)] space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Prénom</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Nom</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Fonction</Label><Input value={fonction} onChange={(e) => setFonction(e.target.value)} placeholder="Ex : Chargé de recrutement" /></div>
        <div className="space-y-1.5"><Label>Service / Département</Label><Input value={service} onChange={(e) => setService(e.target.value)} placeholder="Ex : Ressources Humaines" /></div>
        <div className="pt-2"><Button onClick={save} disabled={saving}>Enregistrer</Button></div>
      </Card>
    </div>
  );
}