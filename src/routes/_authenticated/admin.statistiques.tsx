import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useMe } from "@/components/app-shell";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/statistiques")({
  head: () => ({ meta: [{ title: "Statistiques — ATS TRACK RH" }] }),
  component: StatsPage,
});

function StatsPage() {
  const me = useMe();
  if (!me.isStaff) return <Navigate to="/dashboard" />;
  const weeks = Array.from({ length: 8 }).map((_, i) => ({
    week: `S${i + 1}`,
    reports: Math.round(5 + ((i * 7) % 15)),
    completion: Math.round(60 + ((i * 11) % 35)),
  }));
  const services = ["RH", "Formation", "Recrutement", "Direction", "Support"].map((s, i) => ({
    service: s, completion: Math.round(55 + ((i * 13) % 40)),
  }));

  return (
    <div>
      <PageHeader title="Statistiques avancées" subtitle="Comparatifs et tendances sur 8 semaines" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6 rounded-2xl border-0 shadow-[var(--shadow-card)]">
          <h3 className="font-semibold mb-4">Taux de complétion par service</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={services}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="service" tickLine={false} axisLine={false} style={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Bar dataKey="completion" fill="oklch(0.44 0.13 254)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6 rounded-2xl border-0 shadow-[var(--shadow-card)]">
          <h3 className="font-semibold mb-4">Évolution des tâches reportées</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={weeks}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} style={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Line type="monotone" dataKey="reports" stroke="oklch(0.6 0.22 27)" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}