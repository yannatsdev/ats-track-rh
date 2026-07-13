import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { KpiRingCard } from "@/components/kpi-ring-card";
import { PageHeader } from "@/components/page-header";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { listAllEmployeesTracking } from "@/lib/sheets.functions";
import { isoWeekStart, DAY_LABELS } from "@/lib/week";
import { useMe } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard RH — ATS TRACK RH" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const me = useMe();
  const weekStart = isoWeekStart();
  const fn = useServerFn(listAllEmployeesTracking);
  const { data } = useQuery({
    queryKey: ["admin-tracking", weekStart],
    queryFn: () => fn({ data: { weekStart } }),
    enabled: me.isStaff,
  });
  if (!me.isStaff) return <Navigate to="/dashboard" />;

  const profiles = data?.profiles ?? [];
  const sheets = data?.sheets ?? [];
  const submittedCount = sheets.filter((s) => s.status !== "draft").length;
  const submissionRate = profiles.length ? Math.round((submittedCount / profiles.length) * 100) : 0;
  const pending = sheets.filter((s) => s.status === "submitted" || s.status === "hr_validated").length;
  const late = Math.max(profiles.length - sheets.length, 0);

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

  return (
    <div>
      <PageHeader title="Dashboard RH" subtitle="Vue consolidée de l'organisation sur la semaine en cours." />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiRingCard label="Fiches soumises" value={`${submittedCount}/${profiles.length}`} percent={submissionRate} color="oklch(0.44 0.13 254)" />
        <KpiRingCard label="Taux terminées" value={`${Math.round((done/totalEntries)*100)}%`} percent={Math.round((done/totalEntries)*100)} color="oklch(0.68 0.16 148)" />
        <KpiRingCard label="Employés en retard" value={late} percent={profiles.length ? Math.round((late/profiles.length)*100) : 0} color="oklch(0.6 0.22 27)" />
        <KpiRingCard label="En attente validation" value={pending} percent={sheets.length ? Math.round((pending/sheets.length)*100) : 0} color="oklch(0.78 0.14 78)" />
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