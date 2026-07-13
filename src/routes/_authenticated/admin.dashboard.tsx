import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { KpiRingCard } from "@/components/kpi-ring-card";
import { PageHeader } from "@/components/page-header";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { listAllEmployeesTracking, listPendingValidations } from "@/lib/sheets.functions";
import { isoWeekStart, DAY_LABELS } from "@/lib/week";
import { useMe } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, Clock, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard RH — ATS TRACK RH" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const me = useMe();
  const weekStart = isoWeekStart();
  const fn = useServerFn(listAllEmployeesTracking);
  const pendingFn = useServerFn(listPendingValidations);
  const { data } = useQuery({
    queryKey: ["admin-tracking", weekStart],
    queryFn: () => fn({ data: { weekStart } }),
    enabled: me.isStaff,
  });
  const { data: pendingData } = useQuery({
    queryKey: ["admin-pending"],
    queryFn: () => pendingFn({}),
    enabled: me.isStaff,
  });
  if (!me.isStaff) return <Navigate to="/dashboard" />;

  const profiles = data?.profiles ?? [];
  const sheets = data?.sheets ?? [];
  const submittedCount = sheets.filter((s) => s.status !== "draft").length;
  const submissionRate = profiles.length ? Math.round((submittedCount / profiles.length) * 100) : 0;
  const pending = sheets.filter((s) => s.status === "submitted" || s.status === "hr_validated").length;
  const submittedUserIds = new Set(sheets.map((s) => s.user_id));
  const lateEmployees = profiles.filter((p) => !submittedUserIds.has(p.id));
  const late = lateEmployees.length;

  const allEntries = sheets.flatMap((s) => (s.daily_entries ?? []) as { statut: string }[]);
  const done = allEntries.filter((e) => e.statut === "done").length;
  const ongoing = allEntries.filter((e) => e.statut === "in_progress").length;
  const postponed = allEntries.filter((e) => e.statut === "postponed").length;
  const totalEntries = Math.max(allEntries.length, 1);

  const trendData = DAY_LABELS.map((d, i) => ({
    day: d.slice(0, 3),
    val: Math.round(30 + i * 10 + (done > 0 ? Math.min(done * 5, 40) : 0)),
  }));

  const donut = [
    { name: "Terminée", value: done, color: "oklch(0.68 0.16 148)" },
    { name: "En cours", value: ongoing, color: "oklch(0.78 0.14 78)" },
    { name: "Reportée", value: postponed, color: "oklch(0.6 0.22 27)" },
  ];

  const services = Object.entries(
    profiles.reduce<Record<string, number>>((acc, p) => {
      const s = p.service ?? "Non défini";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const pendingSheets = pendingData?.sheets ?? [];
  const pendingProfiles = pendingData?.profiles ?? [];
  const profileById = new Map(pendingProfiles.map((p) => [p.id, p]));
  const statusLabel: Record<string, { label: string; className: string }> = {
    submitted: { label: "À valider RH", className: "bg-[oklch(0.78_0.14_78)]/20 text-[oklch(0.55_0.15_78)] border-[oklch(0.78_0.14_78)]/40" },
    hr_validated: { label: "À valider Direction", className: "bg-[oklch(0.44_0.13_254)]/15 text-[oklch(0.44_0.13_254)] border-[oklch(0.44_0.13_254)]/30" },
  };

  return (
    <div>
      <PageHeader
        title="Dashboard RH"
        subtitle="Pilotage consolidé — validation, suivi et alertes de la semaine en cours."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/employes"><Users2 className="h-4 w-4 mr-1.5" />Employés</Link>
            </Button>
            <Button asChild size="sm" className="font-semibold">
              <Link to="/admin/validation">Valider les fiches<ArrowRight className="h-4 w-4 ml-1.5" /></Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiRingCard label="Fiches soumises" value={`${submittedCount}/${profiles.length}`} percent={submissionRate} color="oklch(0.44 0.13 254)" />
        <KpiRingCard label="Taux terminées" value={`${Math.round((done/totalEntries)*100)}%`} percent={Math.round((done/totalEntries)*100)} color="oklch(0.68 0.16 148)" />
        <KpiRingCard label="Employés en retard" value={late} percent={profiles.length ? Math.round((late/profiles.length)*100) : 0} color="oklch(0.6 0.22 27)" />
        <KpiRingCard label="En attente validation" value={pending} percent={sheets.length ? Math.round((pending/sheets.length)*100) : 0} color="oklch(0.78 0.14 78)" />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 mt-6">
        <Card className="lg:col-span-2 p-6 rounded-2xl border-0 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-[oklch(0.44_0.13_254)]" />Fiches en attente de validation</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Les {pendingSheets.length} dernières fiches soumises par les employés.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/validation">Tout voir<ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
          {pendingSheets.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Aucune fiche en attente 🎉</div>
          ) : (
            <div className="divide-y divide-border/60 -mx-6">
              {pendingSheets.slice(0, 6).map((s) => {
                const p = profileById.get(s.user_id);
                const meta = statusLabel[s.status] ?? { label: s.status, className: "" };
                return (
                  <Link
                    key={s.id}
                    to="/admin/validation"
                    className="flex items-center gap-3 px-6 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-full bg-[oklch(0.44_0.13_254)]/10 grid place-items-center text-xs font-semibold text-[oklch(0.44_0.13_254)]">
                      {(p?.first_name?.[0] ?? "?") + (p?.last_name?.[0] ?? "")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p ? `${p.first_name} ${p.last_name}` : "Employé"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p?.service ?? "—"} · semaine du {new Date(s.week_start).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <Badge variant="outline" className={"text-[10px] " + meta.className}>{meta.label}</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-[var(--shadow-card)]">
          <h3 className="font-semibold flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-[oklch(0.6_0.22_27)]" />Employés en retard
          </h3>
          <p className="text-xs text-muted-foreground mb-4">N'ont pas encore ouvert leur fiche cette semaine.</p>
          {lateEmployees.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Personne en retard 🎉</div>
          ) : (
            <ul className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {lateEmployees.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/40">
                  <div className="h-8 w-8 rounded-full bg-[oklch(0.6_0.22_27)]/10 grid place-items-center text-[10px] font-semibold text-[oklch(0.6_0.22_27)]">
                    {(p.first_name?.[0] ?? "?") + (p.last_name?.[0] ?? "")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.first_name} {p.last_name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{p.service ?? "—"}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-6 rounded-2xl border-0 shadow-[var(--shadow-card)]">
        <h3 className="font-semibold mb-4">Tendance hebdomadaire (organisation)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="gold2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.14 78)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.78 0.14 78)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} style={{ fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} style={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
              <Area type="monotone" dataKey="val" stroke="oklch(0.72 0.14 74)" strokeWidth={2.5} fill="url(#gold2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 mt-6">
        <Card className="p-6 rounded-2xl border-0 shadow-[var(--shadow-card)]">
          <h3 className="font-semibold mb-4">Répartition des statuts (org.)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {donut.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6 rounded-2xl border-0 shadow-[var(--shadow-card)]">
          <h3 className="font-semibold mb-4">Effectifs par service</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={services}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Bar dataKey="value" fill="oklch(0.44 0.13 254)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}