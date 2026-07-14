import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { listAllEmployeesTracking } from "@/lib/sheets.functions";
import { isoWeekStart } from "@/lib/week";
import { Search, Bell, Eye, MoreHorizontal, FileText, User } from "lucide-react";
import { toast } from "sonner";
import { useMe } from "@/components/app-shell";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/admin/employes")({
  head: () => ({ meta: [{ title: "Suivi des employés — ATS TRACK RH" }] }),
  component: EmployesPage,
});

function EmployesPage() {
  const me = useMe();
  const weekStart = isoWeekStart();
  const fn = useServerFn(listAllEmployeesTracking);
  const { data } = useQuery({
    queryKey: ["admin-tracking", weekStart],
    queryFn: () => fn({ data: { weekStart } }),
    enabled: me.isStaff,
  });
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const profiles = data?.profiles ?? [];
    const sheets = data?.sheets ?? [];
    return profiles.map((p) => {
      const sheet = sheets.find((s) => s.user_id === p.id);
      const entries = (sheet?.daily_entries ?? []) as { statut: string; avancement_pct: number }[];
      const done = entries.filter((e) => e.statut === "done").length;
      const ongoing = entries.filter((e) => e.statut === "in_progress").length;
      const postponed = entries.filter((e) => e.statut === "postponed").length;
      const avg = entries.length ? Math.round(entries.reduce((a, b) => a + b.avancement_pct, 0) / entries.length) : 0;
      return { profile: p, sheet, done, ongoing, postponed, avg };
    }).filter((r) => {
      const name = `${r.profile.first_name ?? ""} ${r.profile.last_name ?? ""}`.toLowerCase();
      return name.includes(q.toLowerCase()) || (r.profile.service ?? "").toLowerCase().includes(q.toLowerCase());
    });
  }, [data, q]);

  if (!me.isStaff) return <Navigate to="/dashboard" />;

  return (
    <div>
      <PageHeader title="Suivi des employés" subtitle={`${rows.length} collaborateurs · Semaine en cours`}
        actions={
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-9 w-64" />
          </div>
        } />
      <Card className="rounded-2xl border-0 shadow-[var(--shadow-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Employé</th>
                <th className="text-left px-4 py-3">Service</th>
                <th className="text-left px-4 py-3">Statut fiche</th>
                <th className="text-left px-4 py-3 w-48">Avancement</th>
                <th className="text-left px-4 py-3">Répartition</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const initials = ((r.profile.first_name?.[0] ?? "") + (r.profile.last_name?.[0] ?? "")).toUpperCase() || "?";
                const isLate = !r.sheet;
                return (
                  <tr key={r.profile.id} className="border-t hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="text-xs bg-secondary">{initials}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{r.profile.first_name} {r.profile.last_name}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.profile.fonction ?? "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.profile.service ?? "—"}</td>
                    <td className="px-4 py-3">
                      {isLate ? (
                        <Badge className="bg-red-50 text-red-700 border border-red-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5" />En retard
                        </Badge>
                      ) : r.sheet?.status === "draft" ? <Badge className="bg-slate-100 text-slate-700">Brouillon</Badge>
                       : r.sheet?.status === "submitted" ? <Badge className="bg-blue-50 text-blue-700">Soumise</Badge>
                       : r.sheet?.status === "hr_validated" ? <Badge className="bg-amber-50 text-amber-700">Validée RH</Badge>
                       : <Badge className="bg-emerald-50 text-emerald-700">Validée</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={r.avg} className="h-1.5 flex-1" />
                        <span className="text-xs font-semibold w-8 text-right">{r.avg}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="text-emerald-600 font-medium">{r.done}</span> · <span className="text-amber-600 font-medium">{r.ongoing}</span> · <span className="text-red-500 font-medium">{r.postponed}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel className="text-xs">
                            {r.profile.first_name} {r.profile.last_name}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {r.sheet ? (
                            <DropdownMenuItem asChild>
                              <Link to="/admin/employes/$id" params={{ id: r.sheet.id }}>
                                <Eye className="h-4 w-4 mr-2" />Voir la fiche
                              </Link>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled>
                              <FileText className="h-4 w-4 mr-2" />Aucune fiche cette semaine
                            </DropdownMenuItem>
                          )}
                          {isLate && (
                            <DropdownMenuItem
                              onClick={() => toast.success(`Relance envoyée à ${r.profile.first_name}`)}
                            >
                              <Bell className="h-4 w-4 mr-2" />Envoyer une relance
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => toast.info(`Profil de ${r.profile.first_name} ${r.profile.last_name}`)}
                          >
                            <User className="h-4 w-4 mr-2" />Voir le profil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">Aucun employé trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}