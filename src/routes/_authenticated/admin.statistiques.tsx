import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useMe } from "@/components/app-shell";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/statistiques")({
  head: () => ({ meta: [{ title: "Statistiques — ATS TRACK RH" }] }),
  component: StatsPage,
});

function StatsPage() {
  const me = useMe();
  const isDirection = me.roles.includes("admin") || me.roles.includes("direction");
  if (!isDirection) return <Navigate to="/admin/dashboard" />;

  return (
    <div>
      <PageHeader
        title="Statistiques avancées"
        subtitle="Comparatifs et tendances — réservé à la Direction Générale"
      />
      <Card className="p-12 rounded-2xl border-0 shadow-[var(--shadow-card)] text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-secondary grid place-items-center mb-4">
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Aucune donnée disponible</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Les statistiques s'afficheront dès que les employés commenceront à soumettre leurs fiches
          hebdomadaires. La plateforme démarre en production réelle.
        </p>
      </Card>
    </div>
  );
}