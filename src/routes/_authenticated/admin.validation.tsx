import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { listPendingValidations } from "@/lib/sheets.functions";
import { formatWeekRange } from "@/lib/week";
import { Eye } from "lucide-react";
import { useMe } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/admin/validation")({
  head: () => ({ meta: [{ title: "Validation — ATS TRACK RH" }] }),
  component: ValidationPage,
});

type Sheet = { id: string; user_id: string; week_start: string; submitted_at: string | null; status: string };
type Profile = { id: string; first_name: string | null; last_name: string | null; fonction: string | null };

function ValidationPage() {
  const me = useMe();
  const fn = useServerFn(listPendingValidations);
  const { data } = useQuery({ queryKey: ["pending-validations"], queryFn: () => fn({}), enabled: me.isStaff });
  if (!me.isStaff) return <Navigate to="/dashboard" />;

  const sheets = (data?.sheets ?? []) as Sheet[];
  const profiles = (data?.profiles ?? []) as Profile[];
  const getProfile = (uid: string) => profiles.find((p) => p.id === uid);
  const hrPending = sheets.filter((s) => s.status === "submitted");
  const dirPending = sheets.filter((s) => s.status === "hr_validated");

  return (
    <div>
      <PageHeader title="Validation" subtitle={`${sheets.length} fiche(s) en attente`} />
      <div className="grid gap-6 md:grid-cols-2">
        <Section title="À valider — Service RH" sheets={hrPending} getProfile={getProfile} />
        <Section title="À valider — Direction Générale" sheets={dirPending} getProfile={getProfile} />
      </div>
    </div>
  );
}

function Section({ title, sheets, getProfile }: {
  title: string; sheets: Sheet[]; getProfile: (id: string) => Profile | undefined;
}) {
  return (
    <Card className="p-5 rounded-2xl border-0 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="secondary">{sheets.length}</Badge>
      </div>
      <div className="space-y-2">
        {sheets.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Aucune fiche en attente.</div>}
        {sheets.map((s) => {
          const p = getProfile(s.user_id);
          const initials = ((p?.first_name?.[0] ?? "") + (p?.last_name?.[0] ?? "")).toUpperCase() || "?";
          return (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40">
              <Avatar className="h-9 w-9"><AvatarFallback className="text-xs bg-secondary">{initials}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{p?.first_name} {p?.last_name}</div>
                <div className="text-xs text-muted-foreground truncate">Semaine du {formatWeekRange(s.week_start)}</div>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to="/admin/employes/$id" params={{ id: s.id }}><Eye className="h-4 w-4 mr-1" />Voir</Link>
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}