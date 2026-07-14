import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppSidebar } from "./app-sidebar";
import { RightProfilePanel } from "./right-profile-panel";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { getMyContext } from "@/lib/roles.functions";
import { Loader2, Search, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

type Ctx = Awaited<ReturnType<typeof getMyContext>>;
const MyCtx = createContext<Ctx | null>(null);
export const useMe = () => {
  const v = useContext(MyCtx);
  if (!v) throw new Error("useMe outside provider");
  return v;
};

export function AppShell({ children }: { children: ReactNode }) {
  const getCtx = useServerFn(getMyContext);
  const { data, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => getCtx({}) });
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isAdminArea = path.startsWith("/admin");
  const isDirection = !!data?.roles.includes("admin") || !!data?.roles.includes("direction");
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const dateLabel = now.toLocaleDateString("fr-FR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
  const utcLabel = now.toLocaleTimeString("en-GB", {
    timeZone: "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const clockPill = (dark: boolean) => (
    <div
      className={
        "hidden sm:flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium " +
        (dark
          ? "bg-white/10 border border-white/15 text-white"
          : "bg-secondary/70 border border-border text-foreground")
      }
    >
      <span className={"h-1.5 w-1.5 rounded-full animate-pulse " + (dark ? "bg-[oklch(0.85_0.14_78)]" : "bg-primary")} />
      <span className="capitalize tracking-tight">{dateLabel}</span>
      <span className={"h-3 w-px " + (dark ? "bg-white/25" : "bg-border")} />
      <span className="font-mono tabular-nums tracking-tight">{utcLabel}</span>
      <span className={"text-[10px] uppercase tracking-wider " + (dark ? "text-white/60" : "text-muted-foreground")}>UTC</span>
    </div>
  );

  if (isLoading || !data) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <MyCtx.Provider value={data}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <SidebarInset className="flex-1 min-w-0">
            <header
              className={
                "h-16 border-b backdrop-blur sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 " +
                (isAdminArea
                  ? (isDirection
                      ? "bg-gradient-to-r from-[oklch(0.18_0.05_260)] via-[oklch(0.22_0.06_258)] to-[oklch(0.32_0.10_78)] text-white border-b-[oklch(0.78_0.14_78)]/40"
                      : "bg-gradient-to-r from-[oklch(0.28_0.05_260)] via-[oklch(0.34_0.06_258)] to-[oklch(0.48_0.12_78)] text-white border-b-[oklch(0.78_0.14_78)]/40")
                  : "bg-card/60")
              }
            >
              <SidebarTrigger className={isAdminArea ? "text-white hover:bg-white/10" : "md:hidden"} />
              {isAdminArea ? (
                <>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.78_0.14_78)]/25 border border-[oklch(0.78_0.14_78)]/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[oklch(0.92_0.08_78)]">
                      <ShieldCheck className="h-3.5 w-3.5" /> {isDirection ? "Espace Direction" : "Espace Admin RH"}
                    </span>
                    <span className="hidden md:inline text-sm font-medium text-white/85 truncate">
                      {isDirection ? "Pilotage stratégique — Direction Générale" : "Suivi & validation RH"}
                    </span>
                  </div>
                  <div className="relative hidden md:block flex-1 max-w-md ml-4">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
                    <Input
                      placeholder="Rechercher un employé, une fiche…"
                      className="pl-9 h-10 bg-white/10 border-white/15 rounded-xl text-white placeholder:text-white/50 focus-visible:ring-white/40"
                    />
                  </div>
                  <div className="ml-auto">{clockPill(true)}</div>
                </>
              ) : (
                <>
                  <div className="ml-auto">{clockPill(false)}</div>
                </>
              )}
            </header>
            <div className="flex gap-6 p-4 md:p-6 min-w-0">
              <main className="flex-1 min-w-0">{children}</main>
              {!isAdminArea && (
                <aside className="hidden xl:block w-[320px] shrink-0">
                  <RightProfilePanel />
                </aside>
              )}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </MyCtx.Provider>
  );
}