import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import atsLogo from "@/assets/ats-logo.png";

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
    <div className="min-h-screen grid lg:grid-cols-2" style={{ background: "var(--sidebar)" }}>
      <div className="hidden lg:flex flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <img src={atsLogo} alt="ATS TRACK RH" width={48} height={48} className="drop-shadow" />
          <div>
            <div className="font-bold text-lg tracking-tight">ATS TRACK RH</div>
            <div className="text-xs opacity-70">Africa Talent Solution — Agréé FDFD</div>
          </div>
        </div>
        <div className="space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 text-primary">
            <Star className="h-4 w-4 fill-current" /> Suivi hebdomadaire premium
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Pilotez la performance de vos équipes, semaine après semaine.
          </h1>
          <p className="text-sm text-white/70">
            Fiches hebdomadaires digitalisées, validation RH & Direction, statistiques consolidées.
          </p>
        </div>
        <div className="text-xs text-white/50">© {new Date().getFullYear()} Africa Talent Solution</div>
      </div>

      <div className="flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md p-8 shadow-[var(--shadow-elevated)] rounded-3xl border-0">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <img src={atsLogo} alt="" width={40} height={40} />
            <div className="font-bold tracking-tight">ATS TRACK RH</div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {mode === "signin" ? "Connexion" : "Créer un compte"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" ? "Accédez à votre espace ATS TRACK RH" : "Rejoignez l'équipe"}
          </p>
          <form onSubmit={submit} className="space-y-4 mt-6">
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="fn">Prénom</Label><Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
                <div className="space-y-1.5"><Label htmlFor="ln">Nom</Label><Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
              </div>
            )}
            <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
            <div className="space-y-1.5"><Label htmlFor="pw">Mot de passe</Label><Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} /></div>
            <Button type="submit" className="w-full h-11 font-semibold text-base" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "signin" ? "Se connecter" : "Créer mon compte"}
            </Button>
          </form>
          <div className="text-center text-sm mt-6 text-muted-foreground">
            {mode === "signin" ? (
              <>Pas encore de compte ? <button className="text-[color:var(--accent-blue)] font-medium hover:underline" onClick={() => setMode("signup")}>Créer un compte</button></>
            ) : (
              <>Déjà inscrit ? <button className="text-[color:var(--accent-blue)] font-medium hover:underline" onClick={() => setMode("signin")}>Se connecter</button></>
            )}
          </div>
          <div className="text-center mt-4"><Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Retour</Link></div>
        </Card>
      </div>
    </div>
  );
}