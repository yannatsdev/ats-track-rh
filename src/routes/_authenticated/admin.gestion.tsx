import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { listActiveEmployees } from "@/lib/sheets.functions";
import { useMe } from "@/components/app-shell";
import { ROLE_LABEL } from "@/lib/roles";
import type { AppRole } from "@/lib/roles.functions";

export const Route = createFileRoute("/_authenticated/admin/gestion")({
  head: () => ({ meta: [{ title: "Gestion des employés — ATS TRACK RH" }] }),
  component: GestionPage,
});

function GestionPage() {
  const me = useMe();
  const fn = useServerFn(listActiveEmployees);
  const isDirection = me.roles.includes("admin") || me.roles.includes("direction");
  const { data } = useQuery({ queryKey: ["active-employees"], queryFn: () => fn({}), enabled: isDirection });
  if (!isDirection) return <Navigate to="/admin/dashboard" />;

  const profiles = data?.profiles ?? [];
  const roles = data?.roles ?? [];

  return (
    <div>
      <PageHeader title="Gestion des employés" subtitle={`${profiles.length} collaborateurs référencés`} />
      <Card className="rounded-2xl border-0 shadow-[var(--shadow-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Employé</th>
                <th className="text-left px-4 py-3">Fonction</th>
                <th className="text-left px-4 py-3">Service</th>
                <th className="text-left px-4 py-3">Rôles</th>
                <th className="text-left px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const initials = ((p.first_name?.[0] ?? "") + (p.last_name?.[0] ?? "")).toUpperCase() || "?";
                const myRoles = roles.filter((r) => r.user_id === p.id).map((r) => r.role as AppRole);
                return (
                  <tr key={p.id} className="border-t hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-secondary">{initials}</AvatarFallback></Avatar>
                        <div className="font-medium">{p.first_name} {p.last_name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.fonction ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.service ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {myRoles.map((r) => <Badge key={r} variant="secondary" className="text-[10px]">{ROLE_LABEL[r]}</Badge>)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.active ? <Badge className="bg-emerald-50 text-emerald-700">Actif</Badge> : <Badge className="bg-slate-100 text-slate-700">Inactif</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs text-muted-foreground mt-3">Modification des rôles disponible via l'administrateur.</p>
    </div>
  );
}