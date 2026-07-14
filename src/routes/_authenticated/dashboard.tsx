import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KpiRingCard } from "@/components/kpi-ring-card";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { getOrCreateCurrentSheet } from "@/lib/sheets.functions";
import { isoWeekStart, DAY_LABELS } from "@/lib/week";
import { useMe } from "@/components/app-shell";
import { FilePlus2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — ATS TRACK RH" }] }),
  component: Dashboard,
});

function Dashboard() {
  const me = useMe();
  const fn = useServerFn(getOrCreateCurrentSheet);
  const weekStart = isoWeekStart();
  const { data } = useQuery({ queryKey: ["current-sheet", weekStart], queryFn: () => fn({ data: { weekStart } }) });

  const entries = data?.entries ?? [];
  const done = entries.filter((e) => e.statut === "done").length;
  const ongoing = entries.filter((e) => e.statut === "in_progress").length;
  const postponed = entries.filter((e) => e.statut === "postponed").length;
  const total = Math.max(entries.length, 1);

  const dayData = DAY_LABELS.map((d, i) => {
    const dayEntries = entries.filter((e) => e.day === i + 1);
    const avg = dayEntries.length
      ? Math.round(dayEntries.reduce((a, b) => a + (b.avancement_pct ?? 0), 0) / dayEntries.length) : 0;
    return { day: d.slice(0, 3), avancement: avg, done: dayEntries.filter((e) => e.statut === "done").length };
  });

  const donut = [
    { name: "Terminée", value: done, color: "oklch(0.68 0.16 148)" },
    { name: "En cours", value: ongoing, color: "oklch(0.78 0.14 78)" },
    { name: "Reportée", value: postponed, color: "oklch(0.6 0.22 27)" },
  ];

  return (
    <div>
      <PageHeader
        title={`Bienvenue ${me.profile?.first_name ?? ""} ${me.profile?.last_name ?? ""} 👋`}
        subtitle="Voici l'aperçu de votre semaine en cours."
        actions={
          <Button asChild className="font-semibold">
            <Link to="/fiche"><FilePlus2 className="h-4 w-4 mr-2" />Ouvrir ma fiche</Link>
          </Button>
        }
      />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <KpiRingCard label="Tâches terminées" value={done} percent={Math.round((done/total)*100)} delta={0} color="oklch(0.68 0.16 148)" />
        <KpiRingCard label="Tâches en cours" value={ongoing} percent={Math.round((ongoing/total)*100)} delta={0} color="oklch(0.78 0.14 78)" />
        <KpiRingCard label="Tâches reportées" value={postponed} percent={Math.round((postponed/total)*100)} delta={0} color="oklch(0.6 0.22 27)" />
      </div>
      <Card className="mt-6 p-6 rounded-2xl border-0 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold">Avancement hebdomadaire</h3>
            <p className="text-xs text-muted-foreground mt-0.5">% moyen d'avancement par jour</p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dayData}>
              <defs>
                <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.14 78)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.78 0.14 78)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} style={{ fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} style={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
              <Area type="monotone" dataKey="avancement" stroke="oklch(0.72 0.14 74)" strokeWidth={2.5} fill="url(#gold)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 mt-6">
        <Card className="p-6 rounded-2xl border-0 shadow-[var(--shadow-card)]">
          <h3 className="font-semibold mb-4">Répartition des statuts</h3>
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
          <div className="flex flex-wrap gap-3 justify-center text-xs">
            {donut.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                {d.name} · {d.value}
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6 rounded-2xl border-0 shadow-[var(--shadow-card)]">
          <h3 className="font-semibold mb-4">Tâches terminées par jour</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} style={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Bar dataKey="done" fill="oklch(0.78 0.14 78)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}