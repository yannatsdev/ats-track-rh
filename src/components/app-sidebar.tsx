import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, FileText, History, BarChart3, Users, ShieldCheck,
  Settings, LogOut, UserCog, Sparkles,
} from "lucide-react";
import atsLogoAsset from "@/assets/ats-logo.png.asset.json";
import { useMe } from "./app-shell";
import { supabase } from "@/integrations/supabase/client";
import { primaryRole, ROLE_LABEL } from "@/lib/roles";
import { Button } from "@/components/ui/button";

const employeeItems = [
  { title: "Tableau de bord", to: "/dashboard" as const, icon: LayoutDashboard },
  { title: "Fiche de la semaine", to: "/fiche" as const, icon: FileText },
  { title: "Bilan de la semaine", to: "/fiche/bilan" as const, icon: Sparkles },
  { title: "Mon historique", to: "/historique" as const, icon: History },
];

const staffItems = [
  { title: "Dashboard RH", to: "/admin" as const, icon: LayoutDashboard },
  { title: "Suivi des employés", to: "/admin/employes" as const, icon: Users },
  { title: "Validation", to: "/admin/validation" as const, icon: ShieldCheck },
  { title: "Gestion", to: "/admin/gestion" as const, icon: UserCog },
  { title: "Statistiques", to: "/admin/statistiques" as const, icon: BarChart3 },
];

export function AppSidebar() {
  const me = useMe();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (p: string) => (p === "/dashboard" || p === "/admin" ? path === p : path.startsWith(p));
  const role = primaryRole(me.roles);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border/50">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="h-11 w-11 shrink-0 rounded-xl grid place-items-center overflow-hidden bg-white shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4)] ring-1 ring-white/10">
            <img src={atsLogoAsset.url} alt="ATS Logo" width={40} height={40} className="object-contain" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="font-bold tracking-tight text-white text-sm truncate">ATS TRACK RH</div>
            <div className="text-[10px] uppercase tracking-wider text-white/50">Africa Talent Solution</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup>
          <SidebarGroupLabel>Espace Employé</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {employeeItems.map((it) => (
                <SidebarMenuItem key={it.to}>
                  <SidebarMenuButton asChild isActive={isActive(it.to)} tooltip={it.title}>
                    <Link to={it.to} className="flex items-center gap-2">
                      <it.icon className="h-4 w-4" />
                      <span>{it.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {me.isStaff && (
          <SidebarGroup>
            <SidebarGroupLabel>Espace Admin RH</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {staffItems.map((it) => (
                  <SidebarMenuItem key={it.to}>
                    <SidebarMenuButton asChild isActive={isActive(it.to)} tooltip={it.title}>
                      <Link to={it.to} className="flex items-center gap-2">
                        <it.icon className="h-4 w-4" />
                        <span>{it.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/parametres")} tooltip="Paramètres">
                  <Link to="/parametres" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Paramètres</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50">
        <div className="p-2 group-data-[collapsible=icon]:hidden">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Rôle</div>
          <div className="text-xs text-white/80 font-medium mb-3">{ROLE_LABEL[role]}</div>
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-white/70 hover:text-white hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4 mr-2" /> Déconnexion
          </Button>
          <div className="text-[10px] text-white/40 mt-3 text-center leading-relaxed">
            Africa Talent Solution<br />Agréé FDFD
          </div>
        </div>
        <div className="hidden group-data-[collapsible=icon]:flex justify-center p-2">
          <button onClick={signOut} className="text-white/70 hover:text-white"><LogOut className="h-4 w-4" /></button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}