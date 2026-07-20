import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { listActiveEmployees, deleteEmployee } from "@/lib/sheets.functions";
import { useMe } from "@/components/app-shell";
import { ROLE_LABEL } from "@/lib/roles";
import type { AppRole } from "@/lib/roles.functions";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/gestion")({
  head: () => ({ meta: [{ title: "Gestion des employés — ATS TRACK RH" }] }),
  component: GestionPage,
});

function GestionPage() {
  const me = useMe();
  const fn = useServerFn(listActiveEmployees);
  const delFn = useServerFn(deleteEmployee);
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isDirection = me.roles.includes("admin") || me.roles.includes("direction");
  const { data } = useQuery({ queryKey: ["active-employees"], queryFn: () => fn({}), enabled: isDirection });
  if (!isDirection) return <Navigate to="/admin/dashboard" />;

  const profiles = data?.profiles ?? [];
  const roles = data?.roles ?? [];

  async function handleDelete(userId: string, name: string) {
    setDeletingId(userId);
    try {
      await delFn({ data: { userId } });
      toast.success(`${name} a été supprimé.`);
      await qc.invalidateQueries({ queryKey: ["active-employees"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  }

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
                <th className="text-right px-4 py-3">Actions</th>
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
                    <td className="px-4 py-3 text-right">
                      {p.id === me.userId ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              aria-label="Supprimer"
                              disabled={deletingId === p.id}
                            >
                              {deletingId === p.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer {p.first_name} {p.last_name} ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. Le compte, les fiches et toutes les données
                                associées à cet employé seront définitivement supprimés.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleDelete(p.id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim())}
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs text-muted-foreground mt-3">
        Suppression réservée à la Direction. La modification des rôles est disponible via l'administrateur.
      </p>
    </div>
  );
}