import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppSidebar } from "./app-sidebar";
import { RightProfilePanel } from "./right-profile-panel";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { getMyContext } from "@/lib/roles.functions";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createContext, useContext, type ReactNode } from "react";

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
            <header className="h-16 border-b bg-card/60 backdrop-blur sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6">
              <SidebarTrigger className="md:hidden" />
              <div className="relative hidden md:block flex-1 max-w-md">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Rechercher un employé, une fiche…" className="pl-9 h-10 bg-secondary/60 border-0 rounded-xl" />
              </div>
              <div className="ml-auto text-xs text-muted-foreground hidden sm:block">
                {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
              </div>
            </header>
            <div className="flex gap-6 p-4 md:p-6 min-w-0">
              <main className="flex-1 min-w-0">{children}</main>
              <aside className="hidden xl:block w-[320px] shrink-0">
                <RightProfilePanel />
              </aside>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </MyCtx.Provider>
  );
}