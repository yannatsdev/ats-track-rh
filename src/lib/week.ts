export function isoWeekStart(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  if (day !== 1) date.setUTCDate(date.getUTCDate() - (day - 1));
  return date.toISOString().slice(0, 10);
}

export function formatWeekRange(weekStart: string) {
  const start = new Date(weekStart + "T00:00:00Z");
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 4);
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" });
  return `${fmt(start)} → ${fmt(end)}`;
}

export const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"] as const;