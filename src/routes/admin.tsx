import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import atsLogoAsset from "@/assets/ats-logo.png.asset.json";
import authHero from "@/assets/auth-hero.jpg.asset.json";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Connexion Admin — ATS TRACK RH" }] }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkSession() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) {
        setCheckingSession(false);
        return;
      }

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      if (!active) return;
      if ((roles ?? []).some((r) => r.role === "admin")) {
        navigate({ to: "/admin/dashboard", replace: true });
      } else {
        navigate({ to: "/dashboard", replace: true });
      }
    }
    checkSession();
    return () => {
      active = false;
    };
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      if (roleError) throw roleError;

      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      if (!isAdmin) {
        await supabase.auth.signOut();
        toast.error("Cet accès est réservé aux administrateurs.");
        return;
      }

      toast.success("Bienvenue dans l'espace admin.");
      navigate({ to: "/admin/dashboard", replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full grid lg:grid-cols-[0.92fr_1.08fr] bg-background">
      <div className="relative hidden lg:block overflow-hidden">
        <img src={authHero.url} alt="Professionnelle Africa Talent Solution" className="absolute inset-0 h-full w-full object-cover" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.18 0.03 262 / 0.9) 0%, oklch(0.25 0.05 260 / 0.68) 48%, oklch(0.78 0.14 78 / 0.42) 100%)",
          }}
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="h-20 w-20 rounded-3xl bg-white grid place-items-center shadow-2xl ring-2 ring-white/40 p-2.5">
              <img src={atsLogoAsset.url} alt="ATS" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="font-bold text-xl tracking-tight">ATS TRACK RH</div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/70">Administration</div>
            </div>
          </div>

          <div className="max-w-xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5" /> Accès administrateur sécurisé
            </div>
            <h1 className="text-5xl xl:text-6xl font-bold leading-[1.05] tracking-tight">
              Pilotage RH <span className="italic" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>confidentiel</span>.
            </h1>
            <p className="text-base text-white/85 leading-relaxed max-w-md">
              Validation des fiches, suivi consolidé des employés et statistiques avancées dans un espace séparé de l'espace client.
            </p>
          </div>

          <div className="text-xs text-white/70">© {new Date().getFullYear()} Africa Talent Solution</div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-start gap-4 lg:hidden">
            <div className="h-16 w-16 rounded-2xl bg-card grid place-items-center shadow-[var(--shadow-card)] p-2">
              <img src={atsLogoAsset.url} alt="ATS" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Administration</div>
              <h1 className="text-2xl font-bold tracking-tight">ATS TRACK RH</h1>
            </div>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground mb-4">
              <ShieldCheck className="h-3.5 w-3.5" /> Espace admin
            </div>
            <h2 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
              Connexion administrateur
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Connectez-vous avec votre compte administrateur ATS TRACK RH.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email" className="text-xs font-semibold text-foreground/80">Email administrateur</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="admin@email.com"
                  className="h-12 pl-11 rounded-xl border-border/60 focus-visible:ring-2 focus-visible:ring-primary/40"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-password" className="text-xs font-semibold text-foreground/80">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-12 pl-11 pr-11 rounded-xl border-border/60 focus-visible:ring-2 focus-visible:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-md"
                  aria-label={showPassword ? "Masquer" : "Afficher"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="group w-full h-12 rounded-xl font-semibold text-base shadow-[0_10px_30px_-10px_oklch(0.78_0.14_78/0.5)] hover:shadow-[0_14px_36px_-10px_oklch(0.78_0.14_78/0.6)] transition-all"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Accéder à l'espace admin
              {!loading && <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />}
            </Button>
          </form>

          <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
            <Link to="/auth" className="hover:text-foreground transition-colors">Connexion employé</Link>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Accès réservé</span>
          </div>
        </div>
      </div>
    </div>
  );
}