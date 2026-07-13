import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import atsLogoAsset from "@/assets/ats-logo.png.asset.json";
import authHero from "@/assets/auth-hero.jpg.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Connexion — ATS TRACK RH" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenue !");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { first_name: firstName, last_name: lastName },
          },
        });
        if (error) throw error;
        toast.success("Compte créé.");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] w-full grid lg:grid-cols-[1.05fr_1fr] bg-background">
      {/* MOBILE hero band */}
      <div className="relative lg:hidden h-[280px] sm:h-[340px] overflow-hidden">
        <img
          src={authHero.url}
          alt="Professionnelle Africa Talent Solution"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, oklch(0.24 0.03 262 / 0.82) 0%, oklch(0.30 0.05 260 / 0.55) 50%, oklch(0.78 0.14 78 / 0.35) 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <div className="relative z-10 flex h-full flex-col justify-between p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-white grid place-items-center shadow-xl ring-2 ring-white/40 p-1.5">
              <img src={atsLogoAsset.url} alt="ATS" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="font-bold text-base tracking-tight">ATS TRACK RH</div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/70">Africa Talent Solution</div>
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-2.5 py-1 text-[11px] font-medium mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Plateforme RH nouvelle génération
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight max-w-[20ch]">
              Le suivi RH <span className="italic" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>réinventé</span>.
            </h1>
          </div>
        </div>
      </div>

      {/* LEFT hero (desktop) */}
      <div className="relative hidden lg:block overflow-hidden">
        <img
          src={authHero.url}
          alt="Professionnelle Africa Talent Solution"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Brand-toned gradient overlay (navy → gold) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.24 0.03 262 / 0.82) 0%, oklch(0.30 0.05 260 / 0.55) 45%, oklch(0.78 0.14 78 / 0.35) 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.20_0.03_262/0.75)] via-transparent to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-white grid place-items-center shadow-2xl ring-2 ring-white/40 p-2">
              <img src={atsLogoAsset.url} alt="ATS" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight">ATS TRACK RH</div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-white/70">Africa Talent Solution</div>
            </div>
          </div>

          <div className="max-w-lg space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Plateforme RH nouvelle génération
            </div>
            <h1 className="text-5xl xl:text-6xl font-bold leading-[1.05] tracking-tight">
              Bienvenue sur <span className="italic font-serif" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>ATS Track RH</span>,
              <br />le suivi RH réinventé.
            </h1>
            <p className="text-base text-white/85 leading-relaxed max-w-md">
              Fiches hebdomadaires digitalisées, validation RH & Direction, statistiques consolidées — une expérience premium pour vos équipes.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-white/70">
            <div>© {new Date().getFullYear()} Africa Talent Solution</div>
            <div className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Espace sécurisé</div>
          </div>
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
              {mode === "signin" ? "Bon retour parmi nous" : "Créer votre compte"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {mode === "signin" ? "Connectez-vous à votre espace sécurisé." : "Rejoignez la plateforme ATS TRACK RH."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fn" className="text-xs font-semibold text-foreground/80">Prénom</Label>
                  <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="h-12 rounded-xl border-border/60" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ln" className="text-xs font-semibold text-foreground/80">Nom</Label>
                  <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="h-12 rounded-xl border-border/60" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-foreground/80">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="votre@email.com"
                  className="h-12 pl-11 rounded-xl border-border/60 focus-visible:ring-2 focus-visible:ring-primary/40"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="pw" className="text-xs font-semibold text-foreground/80">Mot de passe</Label>
                {mode === "signin" && (
                  <button type="button" className="text-xs text-[color:var(--accent-blue)] hover:underline font-medium">
                    Oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pw"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
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
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {mode === "signin" ? "Se connecter" : "Créer mon compte"}
              {!loading && <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />}
            </Button>
          </form>

          <div className="text-center text-sm mt-8 text-muted-foreground">
            {mode === "signin" ? (
              <>Pas encore de compte ?{" "}
                <button className="text-[color:var(--accent-blue)] font-semibold hover:underline" onClick={() => setMode("signup")}>
                  S'inscrire
                </button>
              </>
            ) : (
              <>Déjà inscrit ?{" "}
                <button className="text-[color:var(--accent-blue)] font-semibold hover:underline" onClick={() => setMode("signin")}>
                  Se connecter
                </button>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Retour au site</Link>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Connexion sécurisée</span>
          </div>
        </div>
      </div>
    </div>
  );
}